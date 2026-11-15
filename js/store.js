// Local storage, import/export, and touchpoint date math.
(function () {
  const PEOPLE_KEY = 'nt.people.v1';
  const SETTINGS_KEY = 'nt.settings.v1';
  const DAY = 86400000;

  const DEFAULT_SETTINGS = {
    name: '', location: '', role: '', interests: '', bio: '',
    exFriendly: '', exProfessional: '', exCasual: '', // default writing examples per tone
    resume: '', // plain text, extracted from an uploaded PDF/TXT or pasted
    apiKey: '', model: 'claude-opus-5-5',
  };

  const LEVELS = {
    1: 'Just met — they may not remember you',
    2: 'Acquaintance — a conversation or two',
    3: 'Contact — you know each other, occasional exchanges',
    4: 'Strong — regular contact, mutual trust',
    5: 'Close ally — mentor, champion, or close friend',
  };

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // ---------- dates (all local, YYYY-MM-DD) ----------
  function todayISO() { return toISO(new Date()); }
  function toISO(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
  function parseISO(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function daysBetween(a, b) { return Math.round((b - a) / DAY); }

  function dueInfo(p) {
    if (!p.lastTouch) return { status: 'overdue', label: 'Due now', days: -100000, dueDate: null };
    const due = new Date(parseISO(p.lastTouch).getTime() + p.frequencyDays * DAY);
    const days = daysBetween(parseISO(todayISO()), due);
    let status, label;
    if (days < 0) { status = 'overdue'; label = `${-days}d overdue`; }
    else if (days === 0) { status = 'today'; label = 'Today'; }
    else if (days <= 7) { status = 'soon'; label = `in ${days}d`; }
    else { status = 'ok'; label = days > 60 ? `in ${Math.round(days / 30)}mo` : `in ${days}d`; }
    return { status, label, days, dueDate: toISO(due) };
  }

  function sinceLabel(p) {
    if (!p.lastTouch) return 'never contacted';
    const d = daysBetween(parseISO(p.lastTouch), parseISO(todayISO()));
    if (d <= 0) return 'today';
    if (d < 60) return `${d} days ago`;
    return `about ${Math.round(d / 30)} months ago`;
  }

  // ---------- normalization (used for saves and imports) ----------
  const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const firstName = str(raw.firstName, 100);
    if (!firstName) return null;
    let tags = raw.tags;
    if (typeof tags === 'string') tags = tags.split(',');
    tags = Array.isArray(tags) ? [...new Set(tags.map(t => str(t, 40).toLowerCase()).filter(Boolean))] : [];
    const level = Math.min(5, Math.max(1, parseInt(raw.level, 10) || 3));
    const freq = Math.min(3650, Math.max(1, parseInt(raw.frequencyDays, 10) || 90));
    const lastTouch = /^\d{4}-\d{2}-\d{2}$/.test(raw.lastTouch || '') ? raw.lastTouch : '';
    // Repeatable entries. Older data stored a single job/company; fold that into jobs[0].
    let jobs = Array.isArray(raw.jobs)
      ? raw.jobs.filter(Boolean).map(j => ({ title: str(j.title, 150), company: str(j.company, 150) }))
          .filter(j => j.title || j.company).slice(0, 3)
      : [];
    if (!jobs.length && (str(raw.job) || str(raw.company))) jobs = [{ title: str(raw.job, 150), company: str(raw.company, 150) }];
    const orgs = Array.isArray(raw.orgs)
      ? raw.orgs.filter(Boolean).map(o => ({ name: str(o.name, 150), role: str(o.role, 100) }))
          .filter(o => o.name).slice(0, 3)
      : [];
    // Touchpoints: { id, date, type, note }. Older entries only had `note`, which held the type ("Touchpoint", an idea title).
    const history = Array.isArray(raw.history)
      ? raw.history
          .filter(h => h && /^\d{4}-\d{2}-\d{2}$/.test(h.date || ''))
          .map(h => ({
            id: str(h.id, 100) || uid(),
            date: h.date,
            type: str(h.type, 100) || str(h.note, 100) || 'Touchpoint',
            note: 'type' in h ? str(h.note, 2000) : '',
          }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-50)
      : [];
    return {
      id: str(raw.id, 100) || uid(),
      firstName,
      lastName: str(raw.lastName, 100),
      jobs,
      orgs,
      location: str(raw.location, 150),
      email: str(raw.email, 200),
      phone: str(raw.phone, 40),
      linkedin: str(raw.linkedin, 300),
      tags,
      level,
      relationship: str(raw.relationship, 80),
      mode: raw.mode === 'maintain' ? 'maintain' : 'build',
      lastTouch,
      frequencyDays: freq,
      interests: str(raw.interests, 500),
      notes: str(raw.notes, 4000),
      history,
      createdAt: str(raw.createdAt, 40) || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ---------- persistence ----------
  function loadPeople() {
    try {
      const arr = JSON.parse(localStorage.getItem(PEOPLE_KEY) || '[]');
      return Array.isArray(arr) ? arr.map(normalize).filter(Boolean) : [];
    } catch { return []; }
  }
  function savePeople(people) {
    localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
  }
  function getSettings() {
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
    catch { return { ...DEFAULT_SETTINGS }; }
  }
  function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, ...s }));
  }

  // ---------- export / import ----------
  function exportJSON(people) {
    const { apiKey, model, ...me } = getSettings(); // never export the API key
    return JSON.stringify({
      app: 'networking-tracker', version: 1,
      exportedAt: new Date().toISOString(),
      me, people,
    }, null, 2);
  }

  // Accepts our export format or a bare array of people.
  function parseImport(text) {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : Array.isArray(data.people) ? data.people : null;
    if (!list) throw new Error('No "people" list found in that file.');
    const people = list.map(normalize).filter(Boolean);
    return { people, skipped: list.length - people.length, me: Array.isArray(data) ? null : data.me || null };
  }

  const jobLabel = (j, sep = ' at ') => [j.title, j.company].filter(Boolean).join(sep);
  const orgLabel = o => (o.role ? `${o.role}, ${o.name}` : `Member, ${o.name}`);

  window.NT = window.NT || {};
  NT.store = {
    LEVELS, uid, jobLabel, orgLabel, todayISO, dueInfo, sinceLabel, normalize,
    loadPeople, savePeople, getSettings, saveSettings, exportJSON, parseImport,
  };
})();
