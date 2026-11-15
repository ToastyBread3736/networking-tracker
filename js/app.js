// UI: list, add/edit, touchpoint logging, ideas & drafts, settings, import/export.
(function () {
  const S = NT.store;
  const $ = sel => document.querySelector(sel);

  let people = S.loadPeople();
  const view = { query: '', filter: 'all', sort: 'due' };

  // ---------- helpers ----------
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
    return el;
  }
  const fullName = p => [p.firstName, p.lastName].filter(Boolean).join(' ');
  const byId = id => people.find(p => p.id === id);

  function persist() { S.savePeople(people); render(); }

  let toastTimer;
  function toast(msg, action) {
    const t = $('#toast');
    t.replaceChildren(h('span', {}, msg));
    if (action) t.append(h('button', { onclick: () => { action.fn(); t.hidden = true; } }, action.label));
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), action ? 6000 : 2500);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text;
      document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    toast('Copied to clipboard');
  }

  function setBusy(btn, statusEl, busy, msg = '') {
    btn.disabled = busy;
    statusEl.replaceChildren();
    statusEl.classList.remove('error');
    if (busy) statusEl.append(h('span', { class: 'spinner' }), msg);
  }
  function showError(statusEl, err) {
    statusEl.replaceChildren(err.message || String(err));
    statusEl.classList.add('error');
  }

  // ---------- list ----------
  function matches(p, q) {
    if (!q) return true;
    if (q.startsWith('#')) return p.tags.some(t => t.startsWith(q.slice(1)));
    const hay = [fullName(p), ...p.jobs.flatMap(j => [j.title, j.company]), ...p.orgs.flatMap(o => [o.name, o.role]), p.location, p.relationship, p.interests, p.notes, p.email, p.phone, ...p.tags, ...p.history.flatMap(x => [x.type, x.note])]
      .join(' ').toLowerCase();
    return q.split(/\s+/).every(w => hay.includes(w));
  }

  function visible() {
    const q = view.query.trim().toLowerCase();
    let list = people.filter(p => matches(p, q));
    if (view.filter === 'overdue') list = list.filter(p => S.dueInfo(p).days < 0);
    else if (view.filter === 'soon') list = list.filter(p => S.dueInfo(p).days <= 7);
    else if (view.filter === 'build' || view.filter === 'maintain') list = list.filter(p => p.mode === view.filter);
    const cmp = {
      due: (a, b) => S.dueInfo(a).days - S.dueInfo(b).days,
      name: (a, b) => fullName(a).localeCompare(fullName(b)),
      level: (a, b) => b.level - a.level || fullName(a).localeCompare(fullName(b)),
    }[view.sort];
    return list.sort(cmp);
  }

  // First job (or first org if no job), with "+N" when there are more roles.
  function subtitle(p) {
    const first = p.jobs[0] ? S.jobLabel(p.jobs[0], ' · ') : p.orgs[0] ? S.orgLabel(p.orgs[0]) : '';
    const more = p.jobs.length + p.orgs.length - 1;
    return first ? (more > 0 ? `${first}  +${more}` : first) : '—';
  }
  function allRoles(p) {
    return [...p.jobs.map(j => S.jobLabel(j)), ...p.orgs.map(S.orgLabel)].join('\n');
  }

  function row(p) {
    const d = S.dueInfo(p);
    return h('div', { class: 'row' },
      h('span', { class: `due ${d.status}`, title: d.dueDate ? `Next touchpoint: ${d.dueDate}` : 'No touchpoint logged yet' }, d.label),
      h('div', { class: 'who', title: 'Edit', onclick: () => openPerson(p.id) },
        h('span', { class: 'name' }, fullName(p)),
        h('span', { class: 'job', title: allRoles(p) }, subtitle(p))),
      h('span', { class: 'loc col-opt', title: p.location }, p.location || '—'),
      h('span', { class: 'level', title: `Level ${p.level}: ${S.LEVELS[p.level]}` },
        [1, 2, 3, 4, 5].map(i => h('i', { class: i <= p.level ? 'on' : '' }))),
      h('span', { class: 'rel col-opt', title: p.relationship }, p.relationship || '—'),
      h('span', { class: `mode ${p.mode}` }, p.mode === 'build' ? 'Build' : 'Maintain'),
      h('span', { class: 'tags col-opt' },
        p.tags.map(t => h('span', { class: 'tag', 'data-t': t, title: `Filter by #${t}`, onclick: () => setQuery('#' + t) }, t)),
        p.tags.length ? h('span', { class: 'tag more', hidden: true }) : null),
      h('div', { class: 'actions' },
        h('button', { class: 'ghost', title: 'Log a touchpoint', onclick: () => openLog(p.id) }, '✓'),
        h('button', { class: 'ghost', title: 'Ideas & drafts', onclick: () => openIdeas(p.id) }, '✦'),
        h('button', { class: 'ghost', title: 'Edit', onclick: () => openPerson(p.id) }, '✎')),
    );
  }

  function render() {
    const list = visible();
    const box = $('#list');
    document.querySelector('.list-head').hidden = !list.length;
    if (!people.length) {
      box.replaceChildren(h('div', { class: 'empty' },
        h('h2', {}, 'Your network starts here'),
        h('p', {}, 'Add the people you want to stay in touch with. Each one gets a touchpoint schedule and AI-suggested ways to connect.'),
        h('button', { class: 'primary', onclick: () => openPerson() }, '+ Add your first person')));
    } else if (!list.length) {
      box.replaceChildren(h('div', { class: 'empty' }, h('p', {}, 'No one matches that search or filter.')));
    } else {
      box.replaceChildren(...list.map(row));
      fitAllTags();
    }
    const overdue = people.filter(p => S.dueInfo(p).days < 0).length;
    const soon = people.filter(p => { const d = S.dueInfo(p).days; return d >= 0 && d <= 7; }).length;
    $('#stats').replaceChildren(
      h('span', {}, h('b', {}, people.length), ' people'),
      h('span', { class: overdue ? 'red' : '' }, h('b', {}, overdue), ' overdue'),
      h('span', { class: soon ? 'amber' : '' }, h('b', {}, soon), ' this week'));
  }

  // Show as many whole tags as fit in the column, then "+N" (hover it to see the rest).
  function fitTags(cell) {
    const tags = [...cell.querySelectorAll('.tag[data-t]')];
    const more = cell.querySelector('.more');
    if (!more) return;
    tags.forEach(t => (t.hidden = false));
    more.hidden = true;
    cell.classList.remove('squeeze');
    if (!cell.clientWidth) return; // column hidden on narrow screens
    let shown = tags.length;
    while (cell.scrollWidth > cell.clientWidth + 1 && shown > 1) {
      tags[--shown].hidden = true;
      more.hidden = false;
      more.textContent = `+${tags.length - shown}`;
    }
    more.title = tags.slice(shown).map(t => t.dataset.t).join(', ');
    // A single tag that's still too long gets an ellipsis instead of being clipped.
    if (cell.scrollWidth > cell.clientWidth + 1) cell.classList.add('squeeze');
  }
  function fitAllTags() { document.querySelectorAll('#list .tags').forEach(fitTags); }
  let fitFrame;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(fitAllTags);
  });

  function setQuery(q) { view.query = q; $('#search').value = q; render(); }

  // ---------- touchpoints ----------
  const dlgLog = $('#dlg-log');
  const fl = $('#form-log');
  let logCtx = null; // { id, onDone }

  // Opens the "what was it + notes" dialog. Used by ✓ in the list, the profile, and "Sent" in the ideas dialog.
  function openLog(id, { type = '', onDone } = {}) {
    const p = byId(id);
    if (!p) return;
    logCtx = { id, onDone };
    fl.reset();
    $('#log-title').textContent = `Log touchpoint with ${p.firstName}`;
    fl.elements.type.value = type;
    fl.elements.date.value = S.todayISO();
    fl.elements.date.max = S.todayISO();
    dlgLog.showModal();
    (type ? fl.elements.note : fl.elements.type).focus();
  }

  fl.addEventListener('submit', e => {
    e.preventDefault();
    const p = byId(logCtx?.id);
    if (!p) return dlgLog.close();
    const entry = { id: S.uid(), date: fl.elements.date.value, type: fl.elements.type.value.trim(), note: fl.elements.note.value.trim() };
    const toProfile = fl.elements.toProfile.checked && entry.note;
    const prev = { lastTouch: p.lastTouch, history: [...p.history], notes: p.notes };
    p.history = [...p.history, entry].sort((a, b) => a.date.localeCompare(b.date)).slice(-50);
    if (!p.lastTouch || entry.date > p.lastTouch) p.lastTouch = entry.date;
    if (toProfile) p.notes = [p.notes, entry.note].filter(Boolean).join('\n');
    p.updatedAt = new Date().toISOString();
    persist();
    // Keep an open edit dialog in sync without discarding unsaved edits in it.
    if (dlgPerson.open && editingId === p.id) {
      if (!fp.lastTouch.value || entry.date > fp.lastTouch.value) fp.lastTouch.value = entry.date;
      if (toProfile) fp.notes.value = [fp.notes.value.trim(), entry.note].filter(Boolean).join('\n');
    }
    refreshTouchViews(p);
    dlgLog.close();
    const done = logCtx.onDone;
    logCtx = null;
    if (done) done();
    toast(`Logged ${entry.type.toLowerCase()} with ${p.firstName}`, {
      label: 'Undo',
      fn: () => { Object.assign(p, prev); persist(); syncPersonForm(p); refreshTouchViews(p); },
    });
  });

  function deleteTouch(p, entryId) {
    const entry = p.history.find(x => x.id === entryId);
    if (!entry) return;
    const prev = { lastTouch: p.lastTouch, history: [...p.history] };
    p.history = p.history.filter(x => x.id !== entryId);
    // If this was the latest touchpoint, fall back to the latest remaining one.
    if (entry.date === p.lastTouch && p.history.length) p.lastTouch = p.history[p.history.length - 1].date;
    persist();
    syncPersonForm(p);
    refreshTouchViews(p);
    toast('Touchpoint deleted', {
      label: 'Undo',
      fn: () => { Object.assign(p, prev); persist(); syncPersonForm(p); refreshTouchViews(p); },
    });
  }

  function syncPersonForm(p) {
    if (dlgPerson.open && editingId === p.id) fp.lastTouch.value = p.lastTouch || '';
  }
  function refreshTouchViews(p) {
    if (dlgPerson.open && editingId === p.id) renderTimeline(p);
    if (dlgIdeas.open && ideasState.id === p.id) renderHistory(p);
  }

  function renderTimeline(p) {
    $('#person-touches').hidden = false;
    const items = [...p.history].reverse().map(x =>
      h('li', {},
        h('span', { class: 'd' }, x.date),
        h('span', { class: 't' }, x.type),
        h('button', { type: 'button', class: 'ghost x', title: 'Delete this touchpoint', onclick: () => deleteTouch(p, x.id) }, '✕'),
        x.note ? h('span', { class: 'n' }, x.note) : null));
    $('#person-touch-list').replaceChildren(...(items.length ? items
      : [h('li', {}, h('span', { class: 'empty-t' }, 'No touchpoints logged yet.'))]));
  }

  // ---------- add / edit dialog ----------
  const dlgPerson = $('#dlg-person');
  const fp = $('#form-person');
  let editingId = null;
  const PRESETS = ['14', '30', '60', '90', '180', '365'];

  function updateLevelHint() {
    const v = fp.querySelector('input[name=level]:checked')?.value || 3;
    $('#level-hint').textContent = `${v} — ${S.LEVELS[v]}`;
  }
  function updateFreqCustom() {
    const custom = fp.frequencyPreset.value === 'custom';
    fp.frequencyCustom.hidden = !custom;
    fp.frequencyCustom.required = custom;
  }

  // ---------- repeatable rows (work, student orgs) ----------
  // There is always one empty row at the end. Typing in it adds a new one; empty rows in the middle are removed on blur.
  const REPEAT = {
    jobs: { box: '#jobs-rows', max: 3, fields: [['title', 'Job title', 'Professor of CS'], ['company', 'Company / org', 'UT Knoxville']] },
    orgs: { box: '#orgs-rows', max: 3, fields: [['name', 'Organization', 'ACM'], ['role', 'Leadership position', 'President (blank = member)']] },
  };

  function repeatRow(cfg, val = {}) {
    return h('div', { class: 'repeat-row' },
      cfg.fields.map(([k, label, ph]) => h('input', { 'data-k': k, 'aria-label': label, placeholder: ph, value: val[k] || '' })));
  }
  const rowEmpty = r => [...r.querySelectorAll('input')].every(i => !i.value.trim());

  function ensureTrailing(cfg) {
    const box = $(cfg.box);
    const last = box.lastElementChild;
    if ((!last || !rowEmpty(last)) && box.children.length < cfg.max) box.append(repeatRow(cfg));
  }
  function pruneEmpty(cfg) {
    const rows = [...$(cfg.box).children];
    rows.slice(0, -1).forEach(r => { if (rowEmpty(r) && !r.contains(document.activeElement)) r.remove(); });
    ensureTrailing(cfg);
  }
  function fillRepeat(cfg, items) {
    $(cfg.box).replaceChildren(...(items || []).map(v => repeatRow(cfg, v)));
    ensureTrailing(cfg);
  }
  function readRepeat(cfg) {
    return [...$(cfg.box).children]
      .map(r => Object.fromEntries([...r.querySelectorAll('input')].map(i => [i.dataset.k, i.value.trim()])))
      .filter(o => Object.values(o).some(Boolean));
  }
  for (const cfg of Object.values(REPEAT)) {
    const box = $(cfg.box);
    box.addEventListener('input', () => ensureTrailing(cfg));
    box.addEventListener('focusout', () => setTimeout(() => pruneEmpty(cfg)));
  }

  function openPerson(id) {
    editingId = id || null;
    const p = id ? byId(id) : null;
    fp.reset();
    $('#person-title').textContent = p ? `Edit ${fullName(p)}` : 'Add person';
    $('#btn-delete').hidden = !p;
    const v = p || { level: 3, mode: 'build', frequencyDays: 90, lastTouch: S.todayISO(), tags: [] };
    for (const k of ['firstName', 'lastName', 'location', 'email', 'phone', 'linkedin', 'relationship', 'lastTouch', 'interests', 'notes']) {
      fp.elements[k].value = v[k] || '';
    }
    fillRepeat(REPEAT.jobs, v.jobs);
    fillRepeat(REPEAT.orgs, v.orgs);
    fp.tags.value = (v.tags || []).join(', ');
    fp.querySelector(`input[name=level][value="${v.level}"]`).checked = true;
    fp.querySelector(`input[name=mode][value="${v.mode}"]`).checked = true;
    const f = String(v.frequencyDays);
    fp.frequencyPreset.value = PRESETS.includes(f) ? f : 'custom';
    fp.frequencyCustom.value = PRESETS.includes(f) ? '' : f;
    updateFreqCustom();
    updateLevelHint();
    if (p) renderTimeline(p);
    else $('#person-touches').hidden = true;
    dlgPerson.showModal();
    fp.firstName.focus();
  }

  fp.addEventListener('change', e => {
    if (e.target.name === 'level') updateLevelHint();
    if (e.target.name === 'frequencyPreset') updateFreqCustom();
  });

  fp.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(fp);
    const raw = Object.fromEntries(fd.entries());
    raw.frequencyDays = raw.frequencyPreset === 'custom' ? raw.frequencyCustom : raw.frequencyPreset;
    raw.jobs = readRepeat(REPEAT.jobs);
    raw.orgs = readRepeat(REPEAT.orgs);
    const existing = editingId ? byId(editingId) : null;
    if (existing) {
      raw.id = existing.id; raw.createdAt = existing.createdAt; raw.history = existing.history;
    }
    const p = S.normalize(raw);
    if (!p) return;
    if (existing) people[people.indexOf(existing)] = p;
    else people.push(p);
    persist();
    dlgPerson.close();
    toast(existing ? 'Saved' : `Added ${p.firstName}`);
  });

  $('#btn-person-log').addEventListener('click', () => openLog(editingId));

  $('#btn-delete').addEventListener('click', () => {
    const p = byId(editingId);
    if (!p) return;
    const idx = people.indexOf(p);
    people.splice(idx, 1);
    persist();
    dlgPerson.close();
    toast(`Deleted ${fullName(p)}`, { label: 'Undo', fn: () => { people.splice(idx, 0, p); persist(); } });
  });

  // ---------- ideas & drafts dialog ----------
  const dlgIdeas = $('#dlg-ideas');
  // options: real events/places found by web search for the chosen idea (optionsFor = which idea they belong to).
  const ideasState = { id: null, ideas: [], selected: null, seen: [], options: [], note: '', option: null, optionsFor: null };

  function currentMode() { return dlgIdeas.querySelector('input[name=ideasMode]:checked').value; }
  function chosenIdea() {
    const custom = $('#ideas-custom').value.trim();
    if (custom) return custom;
    return ideasState.selected != null ? ideasState.ideas[ideasState.selected] : null;
  }

  function openIdeas(id) {
    const p = byId(id);
    if (!p) return;
    ideasState.id = id; ideasState.ideas = []; ideasState.selected = null;
    ideasState.seen = []; // ideas shown since opening; cleared each time the dialog opens
    $('#btn-gen-ideas').textContent = '✦ Suggest ideas';
    $('#ideas-name').textContent = fullName(p);
    const d = S.dueInfo(p);
    $('#ideas-sub').textContent = [
      p.jobs.map(j => S.jobLabel(j)).join(' & '),
      p.relationship, `Level ${p.level}`,
      `last touch ${S.sinceLabel(p)}`, d.label.toLowerCase(),
    ].filter(Boolean).join(' · ');
    dlgIdeas.querySelector(`input[name=ideasMode][value="${p.mode}"]`).checked = true;
    $('#ideas-focus').value = '';
    $('#ideas-custom').value = '';
    $('#ideas-list').replaceChildren();
    $('#ideas-status').replaceChildren();
    clearOptions();
    $('#options-box').hidden = true;
    $('#draft-status').replaceChildren();
    $('#draft-out').hidden = true;
    $('#draft-subject').value = '';
    $('#draft-body').value = '';
    $('#draft-examples-text').value = '';
    $('#draft-examples').open = false;
    $('#draft-tone').value = defaultTone(p);
    updateExamplesSource();
    renderHistory(p);
    dlgIdeas.showModal();
  }

  // Pick the tone (and therefore the default examples) that fits the relationship. It can still be changed per draft.
  function defaultTone(p) {
    const rel = (p.relationship || '').toLowerCase();
    if (/friend/.test(rel) || (/peer|classmate/.test(rel) && p.level >= 4)) return 'casual';
    if (/professional|senior|mentor|manager|recruiter|professor|dr\b/.test(rel)) return 'professional';
    return 'friendly';
  }

  // ---------- writing examples ----------
  const TONE_LABEL = { friendly: 'Friendly', professional: 'Professional', casual: 'Casual' };
  function currentExamples() {
    return NT.prompts.resolveExamples(S.getSettings(), $('#draft-tone').value, $('#draft-examples-text').value);
  }
  function updateExamplesSource() {
    const { source } = currentExamples();
    const tone = TONE_LABEL[$('#draft-tone').value];
    $('#examples-source').textContent = {
      custom: '· using these (overrides defaults)',
      default: `· using your default ${tone} examples`,
      none: `· no ${tone} defaults yet (add them in ⚙ Settings)`,
    }[source];
  }
  $('#draft-tone').addEventListener('change', updateExamplesSource);
  $('#draft-examples-text').addEventListener('input', updateExamplesSource);

  function renderHistory(p) {
    $('#history-section').hidden = !p.history.length;
    $('#history-list').replaceChildren(...p.history.slice(-5).reverse().map(x =>
      h('li', {}, h('span', {}, x.date), x.type, x.note ? h('span', { class: 'hn' }, x.note) : null)));
  }

  function renderIdeas() {
    $('#ideas-list').replaceChildren(...ideasState.ideas.map((idea, i) =>
      h('button', {
        class: 'idea' + (i === ideasState.selected ? ' selected' : ''),
        onclick: () => { ideasState.selected = i; $('#ideas-custom').value = ''; renderIdeas(); },
      },
        h('span', { class: 't' }, idea.title),
        h('span', { class: 'meta' }, `${idea.channel.replace('_', ' ')} · ${idea.effort} effort`),
        h('span', { class: 'd' }, idea.description),
        h('span', { class: 'w' }, idea.why))));
    updateOptionsBox();
  }

  // ---------- real options (web search) ----------
  // Offered for ideas that involve going somewhere: in-person / other ideas, or one you typed yourself.
  const canSearch = idea => !!idea && (typeof idea === 'string' || idea.channel === 'in_person' || idea.channel === 'other');
  const ideaKey = idea => (typeof idea === 'string' ? 's:' + idea : 'i:' + idea.title);
  const selectedOption = () => (ideasState.option != null ? ideasState.options[ideasState.option] : null);

  function clearOptions() {
    ideasState.options = []; ideasState.note = ''; ideasState.option = null; ideasState.optionsFor = null;
    $('#options-list').replaceChildren();
    $('#options-status').replaceChildren();
  }

  function updateOptionsBox() {
    const idea = chosenIdea();
    const show = canSearch(idea);
    $('#options-box').hidden = !show;
    // Options found for a different idea don't apply anymore.
    if (ideasState.optionsFor && (!show || ideaKey(idea) !== ideasState.optionsFor)) clearOptions();
  }

  function renderOptions() {
    const cards = ideasState.options.map((o, i) => {
      const safeUrl = /^https?:\/\//i.test(o.url || '') ? o.url : null;
      return h('div', {
        class: 'option' + (i === ideasState.option ? ' selected' : ''),
        role: 'button', tabindex: '0',
        title: i === ideasState.option ? 'Click again to stop using this' : 'Use this in the draft',
        onclick: e => {
          if (e.target.closest('a')) return;
          ideasState.option = ideasState.option === i ? null : i;
          renderOptions();
        },
        onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } },
      },
        h('span', { class: 't' }, o.name),
        safeUrl ? h('a', { href: safeUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Check it ↗') : null,
        h('span', { class: 'meta' }, [o.when, o.where, o.price].filter(Boolean).join(' · ') || 'Details not listed'),
        o.why ? h('span', { class: 'w' }, o.why) : null);
    });
    $('#options-list').replaceChildren(...cards, ideasState.note ? h('p', { class: 'options-note' }, ideasState.note) : '');
  }

  $('#btn-find-options').addEventListener('click', async () => {
    const p = byId(ideasState.id);
    const idea = chosenIdea();
    if (!canSearch(idea)) return;
    const btn = $('#btn-find-options'), st = $('#options-status');
    const key = ideaKey(idea);
    setBusy(btn, st, true, 'Searching the web… (10–30 seconds)');
    try {
      const out = await NT.ai.findOptions(p, S.getSettings(), currentMode(), idea, $('#ideas-focus').value.trim());
      setBusy(btn, st, false);
      if (!chosenIdea() || ideaKey(chosenIdea()) !== key) return; // idea changed while searching
      ideasState.options = (out.options || []).filter(o => o && o.name).slice(0, 4);
      ideasState.note = out.note || '';
      ideasState.option = null;
      ideasState.optionsFor = key;
      renderOptions();
      const ran = `${out.searches} search${out.searches === 1 ? '' : 'es'}`;
      const ERR = {
        max_uses_exceeded: 'hit the search limit', too_many_requests: 'search was rate limited',
        unavailable: 'search was unavailable', query_too_long: 'a query was too long',
      };
      const problems = (out.errors || []).map(c => ERR[c] || c).join(', ');
      st.textContent = ideasState.options.length
        ? `Click one to use it in your draft. Check the link before you invite anyone. (${ran})`
        : `Nothing turned up (${ran}${problems ? `; ${problems}` : ''}). Try again, or open the browser console (F12) for details.`;
    } catch (err) {
      setBusy(btn, st, false);
      showError(st, err);
    }
  });

  $('#btn-copy-options-prompt').addEventListener('click', () => {
    const p = byId(ideasState.id);
    const idea = chosenIdea();
    if (!canSearch(idea)) return;
    copy(NT.prompts.optionsCopyPrompt(p, S.getSettings(), currentMode(), idea, $('#ideas-focus').value.trim()));
  });

  // Switching Build/Maintain here also updates the person's saved goal.
  $('#ideas-mode').addEventListener('change', () => {
    const p = byId(ideasState.id);
    if (p) { p.mode = currentMode(); persist(); }
    // New goal, fresh start: forget earlier ideas so they're no longer avoided, and clear the old list.
    ideasState.seen = [];
    ideasState.ideas = [];
    ideasState.selected = null;
    renderIdeas();
    $('#ideas-status').replaceChildren();
    $('#btn-gen-ideas').textContent = '✦ Suggest ideas';
  });
  $('#ideas-custom').addEventListener('input', () => {
    if ($('#ideas-custom').value.trim() && ideasState.selected != null) { ideasState.selected = null; renderIdeas(); }
    else updateOptionsBox();
  });

  $('#btn-gen-ideas').addEventListener('click', async () => {
    const p = byId(ideasState.id);
    const btn = $('#btn-gen-ideas'), st = $('#ideas-status');
    setBusy(btn, st, true, 'Thinking of ideas…');
    try {
      ideasState.ideas = await NT.ai.suggestIdeas(p, S.getSettings(), currentMode(), $('#ideas-focus').value.trim(), ideasState.seen);
      ideasState.seen.push(...ideasState.ideas.map(i => i.title));
      ideasState.seen = ideasState.seen.slice(-40);
      ideasState.selected = null;
      renderIdeas();
      setBusy(btn, st, false);
      btn.textContent = '✦ New ideas';
      st.textContent = 'Pick one, then draft a message.';
    } catch (err) {
      setBusy(btn, st, false);
      showError(st, err);
    }
  });

  $('#btn-copy-ideas-prompt').addEventListener('click', () => {
    const p = byId(ideasState.id);
    copy(NT.prompts.ideasCopyPrompt(p, S.getSettings(), currentMode(), $('#ideas-focus').value.trim(), ideasState.seen));
  });

  function needIdea(st) {
    const idea = chosenIdea();
    if (!idea) { showError(st, new Error('Pick an idea above or type your own first.')); return null; }
    return idea;
  }

  $('#btn-draft').addEventListener('click', async () => {
    const p = byId(ideasState.id);
    const btn = $('#btn-draft'), st = $('#draft-status');
    const idea = needIdea(st);
    if (!idea) return;
    setBusy(btn, st, true, 'Drafting…');
    try {
      const out = await NT.ai.draftMessage(p, S.getSettings(), currentMode(), NT.prompts.ideaWithOption(idea, selectedOption()), $('#draft-tone').value, currentExamples().text);
      $('#draft-subject').value = out.subject || '';
      $('#draft-subject').hidden = !out.subject;
      $('#draft-body').value = out.body || '';
      $('#draft-out').hidden = false;
      setBusy(btn, st, false);
      st.textContent = 'Edit as needed, then copy and send.';
    } catch (err) {
      setBusy(btn, st, false);
      showError(st, err);
    }
  });

  $('#btn-copy-draft-prompt').addEventListener('click', () => {
    const p = byId(ideasState.id);
    const idea = needIdea($('#draft-status'));
    if (!idea) return;
    $('#draft-status').replaceChildren();
    copy(NT.prompts.draftCopyPrompt(p, S.getSettings(), currentMode(), NT.prompts.ideaWithOption(idea, selectedOption()), $('#draft-tone').value, currentExamples().text));
  });

  $('#btn-copy-draft').addEventListener('click', () => {
    const subj = $('#draft-subject').value.trim();
    const body = $('#draft-body').value;
    copy(subj && !$('#draft-subject').hidden ? `Subject: ${subj}\n\n${body}` : body);
  });

  $('#btn-log-sent').addEventListener('click', () => {
    const idea = chosenIdea();
    const type = idea ? (typeof idea === 'string' ? idea : idea.title) : 'Sent message';
    openLog(ideasState.id, { type: type.slice(0, 100), onDone: () => dlgIdeas.close() });
  });

  // ---------- settings ----------
  const dlgSettings = $('#dlg-settings');
  const fs = $('#form-settings');
  $('#btn-settings').addEventListener('click', () => {
    const s = S.getSettings();
    for (const k of ['name', 'location', 'role', 'interests', 'bio', 'resume', 'exFriendly', 'exProfessional', 'exCasual', 'apiKey', 'model']) {
      fs.elements[k].value = s[k] || '';
    }
    updateResumeStatus();
    dlgSettings.showModal();
  });

  // ---------- resume upload ----------
  // pdf.js is loaded from the CDN only when a PDF is picked; the text is extracted here in the browser.
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const RESUME_MAX = 6000; // matches the cap used in prompts (about 1,500 tokens)
  let pdfjsPromise = null;
  const loadScript = src => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the PDF reader. Check your internet connection.'));
    document.head.append(s);
  });
  function loadPdfJs() {
    // A web worker can't start from a file:// page, so the worker script is loaded on the page too and
    // pdf.js runs it on the main thread. That's fine for a resume-sized PDF.
    if (!pdfjsPromise) {
      pdfjsPromise = Promise.all([loadScript(PDFJS + 'pdf.min.js'), loadScript(PDFJS + 'pdf.worker.min.js')])
        .then(() => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
          return window.pdfjsLib;
        })
        .catch(err => { pdfjsPromise = null; throw err; });
    }
    return pdfjsPromise;
  }

  async function pdfText(file) {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    for (let i = 1; i <= Math.min(doc.numPages, 5); i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      pages.push(content.items.map(it => it.str + (it.hasEOL ? '\n' : '')).join(''));
    }
    return pages.join('\n');
  }

  const tidyResume = t => t.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  function updateResumeStatus(msg) {
    const text = fs.elements.resume.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    let status = msg || (words ? `${words} words` : 'No resume added');
    if (text.length > RESUME_MAX) status += ` · only the first ${RESUME_MAX.toLocaleString()} characters are sent to the AI`;
    $('#resume-status').textContent = status;
  }

  $('#btn-resume-upload').addEventListener('click', () => $('#resume-file').click());
  $('#btn-resume-clear').addEventListener('click', () => { fs.elements.resume.value = ''; updateResumeStatus(); });
  fs.elements.resume.addEventListener('input', () => updateResumeStatus());
  $('#resume-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    updateResumeStatus(`Reading ${file.name}…`);
    try {
      const text = tidyResume(isPdf ? await pdfText(file) : await file.text());
      if (!text) {
        updateResumeStatus("Couldn't find any text in that file. If it's a scanned image, paste the text instead.");
        return;
      }
      fs.elements.resume.value = text;
      updateResumeStatus(`Read ${file.name} · ${text.split(/\s+/).length} words. Check it, then Save.`);
    } catch (err) {
      updateResumeStatus(`Couldn't read that file: ${err.message || err}`);
    }
  });
  fs.addEventListener('submit', e => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(fs).entries());
    for (const k in raw) raw[k] = raw[k].trim();
    S.saveSettings(raw);
    if (dlgIdeas.open) updateExamplesSource();
    dlgSettings.close();
    toast('Settings saved');
  });

  // ---------- export / import ----------
  $('#btn-export').addEventListener('click', () => {
    const blob = new Blob([S.exportJSON(people)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `network-${S.todayISO()}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Exported ${people.length} people`);
  });

  const dlgImport = $('#dlg-import');
  let pendingImport = null;
  $('#btn-import').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      pendingImport = S.parseImport(await file.text());
    } catch (err) {
      toast('Import failed: ' + err.message);
      return;
    }
    const n = pendingImport.people.length;
    const existing = new Set(people.map(p => p.id));
    const updates = pendingImport.people.filter(p => existing.has(p.id)).length;
    $('#import-summary').textContent =
      `${n} people found in ${file.name} (${n - updates} new, ${updates} matching existing)` +
      (pendingImport.skipped ? `; ${pendingImport.skipped} skipped for missing a first name.` : '.');
    dlgImport.showModal();
  });

  function finishImport(replace) {
    if (!pendingImport) return;
    const incoming = pendingImport.people;
    if (replace) people = incoming;
    else {
      const map = new Map(people.map(p => [p.id, p]));
      for (const p of incoming) map.set(p.id, p);
      people = [...map.values()];
    }
    // Restore "About you" if this browser doesn't have it yet.
    const s = S.getSettings();
    if (pendingImport.me && !s.name) S.saveSettings({ ...s, ...pendingImport.me, apiKey: s.apiKey, model: s.model });
    persist();
    dlgImport.close();
    toast(`Imported ${incoming.length} people`);
    pendingImport = null;
  }
  $('#btn-import-merge').addEventListener('click', () => finishImport(false));
  $('#btn-import-replace').addEventListener('click', () => finishImport(true));

  // ---------- wiring ----------
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  $('#btn-add').addEventListener('click', () => openPerson());
  $('#search').addEventListener('input', e => { view.query = e.target.value; render(); });
  $('#filter').addEventListener('change', e => { view.filter = e.target.value; render(); });
  $('#sort').addEventListener('change', e => { view.sort = e.target.value; render(); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !e.target.closest('input, textarea, select, dialog')) { e.preventDefault(); $('#search').focus(); }
    if (e.key === 'n' && !e.target.closest('input, textarea, select, dialog')) { e.preventDefault(); openPerson(); }
  });
  // Re-render at midnight-ish so "due" labels stay current if the tab stays open.
  setInterval(render, 60 * 60 * 1000);

  render();
})();
