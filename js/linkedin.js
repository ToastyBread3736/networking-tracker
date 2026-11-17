// Reads a LinkedIn "Save to PDF" profile. LinkedIn lays these out the same way every time:
//   left sidebar  – Contact (email, phone, profile URL), Top Skills, Languages, Certifications, Honors-Awards
//   main column   – name (26pt), headline and location (12pt), then sections (15.75pt): Summary, Experience,
//                   Education… Inside Experience: company 12pt, job title 11.5pt, dates/location/description 10.5pt.
// So the text is grouped into lines with their font size and column, and read by size. No AI call is needed.
(function () {
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const MONTH = `(?:${MONTHS.join('|')})`;
  const DATE = `(?:${MONTH}\\s+)?\\d{4}`;
  const RANGE_RE = new RegExp(`^(${DATE})\\s*-\\s*(Present|${DATE})`, 'i');
  const DURATION_ONLY_RE = /^\(?\d+\s+(?:years?|months?)(?:\s+\d+\s+months?)?\)?$/i;

  const STATES = {
    alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
    delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
    kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI',
    minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
    'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
    'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
    virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
  };

  // "Seymour, Tennessee, United States" -> "Seymour, TN" (the app's usual "City, ST" form).
  function shortLocation(raw) {
    let parts = (raw || '').split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 1 && /^united states( of america)?$/i.test(parts[parts.length - 1])) parts = parts.slice(0, -1);
    const last = parts[parts.length - 1];
    if (last && STATES[last.toLowerCase()]) parts[parts.length - 1] = STATES[last.toLowerCase()];
    return parts.join(', ');
  }

  // "January 2025" / "2025" -> { y, m } (m is 1-12; 12 when only a year is given, so it counts the whole year)
  function parseDate(s, isEnd) {
    if (!s || /present/i.test(s)) return null;
    const m = s.trim().match(new RegExp(`^(?:(${MONTH})\\s+)?(\\d{4})$`, 'i'));
    if (!m) return null;
    return { y: Number(m[2]), m: m[1] ? MONTHS.indexOf(m[1].toLowerCase()) + 1 : (isEnd ? 12 : 1) };
  }
  // Ongoing: ends "Present", or the end month hasn't passed yet (e.g. a degree finishing May 2028).
  function isOngoing(endText, today) {
    if (!endText || /present/i.test(endText)) return true;
    const e = parseDate(endText, true);
    if (!e) return false;
    const [ty, tm] = today.split('-').map(Number);
    return e.y > ty || (e.y === ty && e.m >= tm);
  }

  // pdf.js text items -> lines: { text, size, side ('left' sidebar | 'main'), page }
  function toLines(pages) {
    const lines = [];
    pages.forEach((pg, pi) => {
      const split = pg.width * 0.3; // the sidebar is the left ~30% of the page
      const rows = [];
      for (const it of pg.items) {
        const str = it.str.replace(/\s+/g, ' ');
        if (!str.trim()) continue;
        const side = it.x < split ? 'left' : 'main';
        let row = rows.find(r => r.side === side && Math.abs(r.y - it.y) < 2.5);
        if (!row) { row = { side, y: it.y, items: [] }; rows.push(row); }
        row.items.push(it);
      }
      rows.sort((a, b) => b.y - a.y);
      for (const r of rows) {
        r.items.sort((a, b) => a.x - b.x);
        const text = r.items.map(i => i.str.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        if (!text || /^Page \d+ of \d+$/i.test(text)) continue;
        lines.push({ text, size: Math.max(...r.items.map(i => i.size)), side: r.side, page: pi });
      }
    });
    // Sidebar lines first (in page order), then the main column.
    return { left: lines.filter(l => l.side === 'left'), main: lines.filter(l => l.side === 'main') };
  }

  // Splits a column into sections by heading size: { heading: [lines] }; lines before the first heading go under "".
  function sections(lines, isHeading) {
    const out = { '': [] };
    let cur = '';
    for (const l of lines) {
      if (isHeading(l)) { cur = l.text; out[cur] = out[cur] || []; continue; }
      out[cur].push(l);
    }
    return out;
  }

  function parseContact(lines) {
    const texts = lines.map(l => l.text);
    const all = texts.join('\n');
    const email = (all.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/) || [''])[0];
    const phone = ((all.match(/(\+?\d[\d\s().-]{6,}\d)\s*\((?:Mobile|Home|Work|Other)\)/i) || [])[1] || '').trim();
    // The profile URL can wrap over two lines; join from "linkedin.com/in/" up to the "(LinkedIn)" label.
    let linkedin = '';
    const i = texts.findIndex(t => /linkedin\.com\/in\//i.test(t));
    if (i >= 0) {
      // Take the URL line, plus the next line only if it's the wrapped rest of the URL ending in "(LinkedIn)"
      // (e.g. "john-smith-123 (LinkedIn)") or just the "(LinkedIn)" label.
      let url = texts[i];
      if (!/\(LinkedIn\)/i.test(url) && /^\S*\s*\(LinkedIn\)$/i.test(texts[i + 1] || '')) url += texts[i + 1];
      url = url.replace(/\s+/g, '').replace(/\(LinkedIn\).*$/i, '').replace(/^.*?(?=(?:www\.)?linkedin\.com)/i, '');
      if (url) linkedin = 'https://' + url.replace(/^https?:\/\//i, '');
    }
    return { email, phone, linkedin };
  }

  function parseExperience(lines) {
    const roles = [];
    let company = '', title = '', lastWasCompany = false, lastWasTitle = false, pending = null;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.size >= 11.8) { // company (may wrap onto a second 12pt line)
        company = lastWasCompany ? `${company} ${l.text}` : l.text;
        title = ''; lastWasCompany = true; lastWasTitle = false; pending = null;
        continue;
      }
      if (l.size >= 11.2) { // job title
        title = lastWasTitle ? `${title} ${l.text}` : l.text;
        lastWasTitle = true; lastWasCompany = false; pending = null;
        continue;
      }
      lastWasCompany = false; lastWasTitle = false;
      const m = l.text.match(RANGE_RE);
      if (m && (title || company)) {
        pending = { company, title, start: m[1], end: m[2], current: isOngoing(m[2], NT.store.todayISO()), location: '' };
        roles.push(pending);
        title = '';
        continue;
      }
      // The line right after the dates is the role's location when it looks like one.
      if (pending && !pending.location && l.text.length < 80 && /^[A-Z][^.!?•]*$/.test(l.text) &&
          (/,/.test(l.text) || /\b(Area|Remote|United States)\b/i.test(l.text)) && !DURATION_ONLY_RE.test(l.text)) {
        pending.location = l.text;
      }
      pending = null;
    }
    return roles;
  }

  function parseEducation(lines) {
    const schools = [];
    let cur = null;
    for (const l of lines) {
      if (l.size >= 11.8) {
        if (cur && !cur.detail) cur.school += ' ' + l.text; // school name wrapped
        else { cur = { school: l.text, detail: '' }; schools.push(cur); }
      } else if (cur) {
        cur.detail = (cur.detail + ' ' + l.text).trim();
      }
    }
    return schools.map(s => {
      let detail = s.detail;
      let start = '', end = '';
      const dm = detail.match(/\(([^()]*)\)\s*$/);
      if (dm) {
        const r = dm[1].match(new RegExp(`(${DATE})\\s*-\\s*(Present|${DATE})`, 'i'));
        if (r) { start = r[1]; end = r[2]; }
        detail = detail.slice(0, dm.index);
      }
      detail = detail.replace(/[\s·•∙‧⋅··]+$/u, '').trim(); // the separator dot before the dates
      const comma = detail.indexOf(',');
      const degree = comma >= 0 ? detail.slice(0, comma).trim() : detail;
      const field = comma >= 0 ? detail.slice(comma + 1).trim() : '';
      return { school: s.school, degree, field, start, end, current: end ? isOngoing(end, NT.store.todayISO()) : false };
    });
  }

  // pages: [{ width, items: [{ x, y, size, str }] }] from pdf.js
  function parse(pages) {
    const { left, main } = toLines(pages);
    const nameLine = main.find(l => l.size >= 20);
    if (!nameLine) return null; // not a LinkedIn profile PDF

    const side = sections(left, l => l.size >= 12.5);
    const body = sections(main.slice(main.indexOf(nameLine) + 1), l => l.size >= 14 && l.size < 20);

    // Headline lines, then the location, sit between the name and the first section.
    const top = body[''].filter(l => l.size >= 11.5);
    let locationRaw = '';
    const lastTop = top[top.length - 1];
    if (lastTop && /,|\b(Area|Region|Metroplex)\b/i.test(lastTop.text) && !/[|@]/.test(lastTop.text)) locationRaw = lastTop.text;
    const headline = top.slice(0, locationRaw ? -1 : undefined).map(l => l.text).join(' ').trim();

    const fullName = nameLine.text.replace(/,.*$/, '').trim(); // drop ", PhD" etc.
    const parts = fullName.split(/\s+/);
    const list = key => (side[key] || []).map(l => l.text);
    const summary = (body.Summary || body.About || []).map(l => l.text).join(' ').replace(/\s+/g, ' ').trim();

    return {
      fullName,
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' '),
      headline,
      locationRaw,
      location: shortLocation(locationRaw),
      ...parseContact(side.Contact || []),
      skills: list('Top Skills'),
      languages: list('Languages'),
      certifications: list('Certifications'),
      honors: list('Honors-Awards'),
      summary,
      experience: parseExperience(body.Experience || []),
      education: parseEducation(body.Education || []),
    };
  }

  window.NT = window.NT || {};
  NT.linkedin = { parse, shortLocation };
})();
