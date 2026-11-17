// Prompt text shared by the in-app AI and the "Copy prompt" buttons.
// Edit PLAYBOOK to change how ideas are chosen.
(function () {
  const PLAYBOOK = `You help the user keep up and grow their professional network. Given one contact's profile, you suggest specific, realistic touchpoint ideas and write short, natural messages.

How to choose ideas:

First decide what kind of relationship this is. Relationship comes before level.
- FRIEND: the relationship is Friend, or a peer/classmate at level 4–5, or the notes show you hang out socially (party together, go out, room together, etc.). Treat them as a friend, not a networking contact.
- PEER: a peer or classmate at level 1–3.
- PROFESSIONAL: anyone senior or in a professional role (professional, mentor, recruiter, professor, manager, alumni you don't know socially).
- BOTH STUDENTS: when the request says "BOTH STUDENTS: yes", the contact is a fellow student, so never treat them as PROFESSIONAL, even if they have a job or internship. Use FRIEND-style college ideas: hanging out, food runs, game nights, the gym, pickup sports, going to a game or show, studying together, or going to an org event or campus event together. Scale to the level: at level 1–2 keep it low-key and easy to say yes to (grab food after class or an org meeting, "want to study for this together?", "a few of us are going to…"); at level 3+ use the full FRIEND ideas. No corporate networking (formal coffee chats, informational interviews, referrals, introductions, sharing articles, LinkedIn anything) unless the user's goal or extra context asks for it.

GOAL = BUILD (make the connection stronger)
- FRIEND: ideas should be what college students actually do together for fun. Examples: going out or to a party, hosting people over, a game night, a tailgate or watching a game, a concert or show, a road trip or day trip, a late-night food run, the gym, pickup sports or intramurals, or a spontaneous "you free tonight?" plan. Lean into whatever the notes and interests say you already do together. Do NOT suggest networking-style ideas for friends: co-hosting events, collaborating on projects, introductions, referrals, sharing articles, or LinkedIn anything. The only exception is when the extra context asks for it. Congratulations on big news is fine, but as a text or in person (or "let's celebrate"), not a LinkedIn comment.
- PEER: a casual shared activity they would actually enjoy, picked from their interests. Examples: lunch, coffee, a pickup game (volleyball, etc.), a study session, or going to a meetup, talk, or game together.
- PROFESSIONAL, level 1–2: start small and give first. Examples: a thoughtful comment on their LinkedIn post, congratulating them on news, sharing a resource that fits their work, asking one specific question, or saying hello at an upcoming event.
- PROFESSIONAL, level 3: ask for a 20–30 minute coffee chat or informational conversation. Meet in person if you're in the same city, otherwise on a video call. Ask for advice on a specific decision.
- PROFESSIONAL, level 4–5: bigger gives and asks. Examples: introduce them to someone useful, propose working on something together, invite them to an event, offer concrete help, or ask for a referral if it's appropriate.

GOAL = MAINTAIN (stay on their mind, with little effort from either of you)
- FRIEND: a text, sending a meme/reel/TikTok that's an inside joke or fits them, reacting to their story, a "we need to hang out soon" message, or a birthday message. Nothing that sounds like networking.
- PEER and PROFESSIONAL: a quick check-in email or text, an article/podcast/video related to their work or interests ("this made me think of you"), a comment or congratulations on a LinkedIn post or milestone, a holiday or birthday note, or a short update on something they helped with.
- No big asks. Keep it easy for them to reply to, or not reply at all.

Always:
- Notes and interests are the strongest signal about the person. If the notes say how you spend time together, most ideas should build on that.
- Touchpoint notes are things the user learned firsthand. Use them. Follow up on what was discussed (an interview they mentioned, a trip, a project), and turn personal details into thoughtful gestures (e.g. "loves getting donuts on Sundays" → bring a box of donuts to the next coffee chat). Don't repeat the same kind of touchpoint they just had unless it's a regular thing you do together.
- For PEER and PROFESSIONAL contacts, student organizations and leadership roles make good openings: their org's events, asking how their role is going, working together across orgs, or (for officers) offering to help or speak. For FRIENDS, an org event is only something to go to together for fun.
- Shared ground counts: if the user and the contact go to the same university, study the same or a related major, or are in the same student organization, use that (a class or professor in common, an org event, "fellow ANS member"). Never claim a connection the profiles don't show.
- Some people have more than one job (e.g. a professor who also runs a business). Choose the role that fits the idea best.
- Base ideas on the profile: jobs, organizations, location, relationship, level, interests, notes, and past touchpoints. Don't suggest something they've already done recently.
- Suggest in-person ideas only if you and the contact are in the same area (or the extra context says you'll be there). Otherwise suggest virtual ones.
- Match the formality to the relationship. With senior people, respect their time and make one specific ask.
- Never make up facts about the contact. If an idea depends on something you don't know (a recent post, a news item), tell the user to look it up first, e.g. "check their recent LinkedIn activity for…".
- If it has been a long time since the last touchpoint, make the first idea an easy way back in.
- Use a mix of channels and effort levels.
- Don't add skill or experience reassurances to ideas ("no experience needed", "all levels welcome").
- MY RESUME, when given, is the user's background. For PEER and PROFESSIONAL contacts, look for real overlap between it and the contact's work, field, or the user's goal (e.g. the user did detector research and the contact is a nuclear engineering professor) and use that overlap to make an idea more specific. Don't build every idea around the resume, and ignore it for FRIENDS.`;

  const DRAFT_RULES = `Message-writing rules:
- If WRITING EXAMPLES are given, they come first. Copy the user's voice and length exactly, even when it breaks the defaults below. Only two rules still apply: never invent facts, and never add skill or experience reassurances.
- Don't use "yo" (or "yoo", "yo!", etc.) unless the user's writing examples use it.
- Write as the user, in the first person, sounding like a real person. No clichés ("I hope this email finds you well", "I wanted to reach out").
- Default length (when there are no examples): for MAINTAIN, 2–4 sentences. For BUILD with a PROFESSIONAL contact, under 120 words with one clear ask that is easy to say no to. To a FRIEND or PEER, one short line is usually enough.
- The chosen idea's description is a plan for you, not text to include. Don't pack its details into the message.
- Only add details the message needs. Don't explain, reassure ("no worries if not", "no pressure"), or pad.
- Never reassure them about skill or experience: no "no experience needed", "no skill needed", "all levels welcome", "beginners welcome", "you don't have to be good", or anything like it. Just invite them.
- Never invent specifics. If you don't know a detail (a place, a time), leave it out the way people do in real texts ("volleyball saturday?"). Use a [square-bracket placeholder] only when the message can't work without it, e.g. [article link].
- Match the channel: email gets a subject line; LinkedIn messages and texts are shorter and have no subject.
- To a FRIEND, write the way you'd text a friend: short, relaxed, lowercase is fine, no formal ask or sign-off.
- When it says BOTH STUDENTS, write like one student texting another: casual and short, like a FRIEND message (a little less familiar at level 1–2), never like a networking email.
- MY RESUME, when given: mention at most one experience from it, in a few words, and only when it connects directly to this contact's work, the goal, or the chosen idea (e.g. emailing a nuclear engineering professor about detection research → one short clause about the user's own detector work). If nothing connects, leave the resume out entirely. Never list credentials, copy resume lines, or make the message about the user; it's a message, not a cover letter. Never use it with FRIENDS.`;

  // Friends get texts and hangouts, so the resume would only cost tokens there. Same test as the casual tone default.
  // Both the user (Settings) and the contact have "Student" checked: ideas and drafts go college-style.
  const bothStudents = (p, me) => !!(p.student && me && me.student);

  function isFriend(p, me) {
    const rel = (p.relationship || '').toLowerCase();
    return /friend/.test(rel) || (/peer|classmate/.test(rel) && p.level >= 4) || bothStudents(p, me);
  }
  const MAX_RESUME_CHARS = 6000; // roughly 1,500 tokens

  function resumeBlock(p, me) {
    const text = (me.resume || '').trim();
    if (!text || isFriend(p, me)) return null; // friends and fellow students get college ideas, not resume mentions
    return `\nMY RESUME (the user's background; use only what connects to this contact or goal)\n<resume>\n${text.slice(0, MAX_RESUME_CHARS)}\n</resume>`;
  }

  // The user's own student details (Settings), only while "I'm a student" is checked. Imported settings may be
  // malformed, so orgs are checked here.
  // The user's work rows (Settings); older settings had a single `role` string instead.
  function myWorkLine(me, prefix = '- ') {
    const jobs = (Array.isArray(me.jobs) ? me.jobs : [])
      .filter(j => j && typeof j === 'object')
      .map(j => NT.store.jobLabel({ title: String(j.title || '').trim(), company: String(j.company || '').trim() }))
      .filter(Boolean);
    if (jobs.length) return `${prefix}Work: ${jobs.join('; ')}`;
    return typeof me.role === 'string' && me.role.trim() ? `${prefix}Role: ${me.role.trim()}` : null;
  }

  function myStudentLines(me, prefix = '- ') {
    if (!me.student) return [];
    const study = [me.major, me.university].filter(s => typeof s === 'string' && s.trim()).join(' at ');
    const orgs = (Array.isArray(me.orgs) ? me.orgs : [])
      .filter(o => o && typeof o.name === 'string' && o.name.trim())
      .map(o => (o.role ? `${o.role} of ${o.name}` : `member of ${o.name}`));
    return [
      `${prefix}Student${study ? `: ${study}` : ''}`,
      orgs.length ? `${prefix}Student organizations: ${orgs.join('; ')}` : null,
    ].filter(Boolean);
  }

  function personContext(p, me, mode, focus, { resume = true } = {}) {
    const S = NT.store;
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
    const lines = [
      `CONTACT`,
      `- Name: ${name}`,
      p.jobs.length ? `- Work: ${p.jobs.map(j => S.jobLabel(j)).join('; ')}` : null,
      p.student ? `- Student${S.studyLabel(p, ', ') ? `: ${[p.major, p.university].filter(Boolean).join(' at ')}` : ''}` : null,
      S.studentOrgs(p).length
        ? `- Student organizations: ${p.orgs.map(o => (o.role ? `${o.role} of ${o.name}` : `member of ${o.name}`)).join('; ')}`
        : null,
      p.location ? `- Location: ${p.location}` : null,
      p.relationship ? `- Relationship to user: ${p.relationship}` : null,
      `- Level of connection: ${p.level}/5 (${S.LEVELS[p.level]})`,
      p.tags.length ? `- Tags: ${p.tags.join(', ')}` : null,
      p.interests ? `- Interests: ${p.interests}` : null,
      p.notes ? `- Notes: ${p.notes}` : null,
      `- Last touchpoint: ${S.sinceLabel(p)}${p.lastTouch ? ` (${p.lastTouch})` : ''}; desired every ${p.frequencyDays} days`,
      p.history.length
        ? `- Past touchpoints (oldest first), with what the user learned:\n${p.history.slice(-10).map(h =>
            `    ${h.date}: ${h.type}${h.note ? `\n      Notes: ${h.note.replace(/\s*\n\s*/g, ' ')}` : ''}`).join('\n')}`
        : null,
      ``,
      `USER (me)`,
      me.name ? `- Name: ${me.name}` : null,
      myWorkLine(me),
      ...myStudentLines(me),
      me.location ? `- Location: ${me.location}` : null,
      me.interests ? `- Interests: ${me.interests}` : null,
      me.goal ? `- Current goal: ${me.goal}` : null,
      me.bio ? `- Other context: ${me.bio}` : null,
      resume ? resumeBlock(p, me) : null,
      ``,
      bothStudents(p, me) ? `BOTH STUDENTS: yes (the user and this contact are both students; use college ideas, not corporate ones)` : null,
      `GOAL: ${mode === 'build' ? 'BUILD this connection' : 'MAINTAIN this connection'}`,
      `Today: ${S.todayISO()}`,
      focus ? `Extra context from the user: ${focus}` : null,
    ];
    return lines.filter(l => l !== null).join('\n');
  }

  // `avoid` lists ideas already shown for this person in the open dialog, so "Suggest" again gives new ones.
  function ideasRequest(p, me, mode, focus, avoid = []) {
    const seen = avoid.length
      ? `\n\nALREADY SUGGESTED (the user wants different ones). Do not repeat these or give close variations. Suggest different activities or angles:\n${avoid.map(a => `- ${a}`).join('\n')}`
      : '';
    return `${personContext(p, me, mode, focus)}${seen}\n\nSuggest 5 distinct touchpoint ideas for this contact.`;
  }

  function ideasCopyPrompt(p, me, mode, focus, avoid = []) {
    return `${PLAYBOOK}\n\n${ideasRequest(p, me, mode, focus, avoid)}\n\nFor each idea give a short title, the channel, the effort (low/medium/high), 1–2 sentences on exactly what to do, and one line on why it fits this person. Number them 1–5.`;
  }

  function ideaText(idea) {
    if (typeof idea === 'string') return idea;
    return `${idea.title} (${idea.channel.replace('_', ' ')}): ${idea.description}`;
  }

  const TONE_KEYS = { friendly: 'exFriendly', professional: 'exProfessional', casual: 'exCasual' };
  const MAX_EXAMPLES_CHARS = 8000;

  // Examples pasted for this one draft win; otherwise use the tone's defaults from Settings.
  function resolveExamples(me, tone, override) {
    const custom = (override || '').trim();
    if (custom) return { text: custom.slice(0, MAX_EXAMPLES_CHARS), source: 'custom' };
    const def = (me[TONE_KEYS[tone]] || '').trim();
    if (def) return { text: def.slice(0, MAX_EXAMPLES_CHARS), source: 'default' };
    return { text: '', source: 'none' };
  }

  function splitExamples(examples) {
    return (examples || '').split(/^\s*---+\s*$/m).map(s => s.trim()).filter(Boolean);
  }
  const wordCount = s => s.split(/\s+/).filter(Boolean).length;

  // Word limit taken from the user's own examples, so drafts can't come out longer than they really write.
  function exampleWordLimit(examples) {
    const parts = splitExamples(examples);
    if (!parts.length) return 0;
    return Math.max(6, Math.ceil(Math.max(...parts.map(wordCount)) * 1.2));
  }

  function examplesBlock(examples) {
    const parts = splitExamples(examples);
    if (!parts.length) return '';
    const counts = parts.map(wordCount);
    const avg = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
    const body = parts.map(s => `<example>\n${s}\n</example>`).join('\n');
    return `\n\nWRITING EXAMPLES (messages the user actually wrote). This is the most important part of the request.
Write the way these are written: the same length, word choice, slang, capitalization, punctuation (or lack of it), greetings or none, sign-offs or none, and emoji use. If the examples skip names, greetings, details, or reassurance, so do you. Do NOT copy their content; they are about other people and plans.
These examples average ${avg} words (longest: ${Math.max(...counts)}).
${body}`;
  }

  function draftRequest(p, me, mode, idea, tone, examples) {
    const limit = exampleWordLimit(examples);
    const ending = limit
      ? `Write the message the user would send for this idea, exactly in the style of the examples. Keep it to ${limit} words or fewer. Leave out anything the user wouldn't bother to type.`
      : 'Write the message the user would send for this idea.';
    return `${personContext(p, me, mode, '')}\n\nCHOSEN IDEA: ${ideaText(idea)}\nTONE: ${tone}${examplesBlock(examples)}\n\n${ending}`;
  }

  function draftCopyPrompt(p, me, mode, idea, tone, examples) {
    return `${PLAYBOOK}\n\n${DRAFT_RULES}\n\n${draftRequest(p, me, mode, idea, tone, examples)}\nIf it's an email, start with "Subject: …". Output only the message.`;
  }

  // ---------- finding real options on the web ----------
  const OPTIONS_SYSTEM = `You find real, upcoming things the user can do with a contact, for a touchpoint idea they already picked. You have a web search tool, and you must use it before answering. Never answer from memory.
- Search in the SEARCH AREA and DATE RANGE given in the request. The user should never have to tell you where or when.
- Use at most 4 searches in total. Run them one at a time (don't write a loop over many queries). Make each one specific: the kind of event + city + month, e.g. "Knoxville Symphony Orchestra concerts December 2026" or "live jazz Knoxville this weekend".
- Look for real listings first: venue and event calendars (symphony, theaters, music venues, the city's event listings), then narrow down.
- Only include options you actually found in search results, each with its source URL. Never invent events, dates, times, venues or prices. If a detail isn't in the results, use "".
- Prefer dated events within the DATE RANGE. If no dated event fits, a regular venue or recurring activity (a weekly open gym, a bar with live music on Fridays) is fine.
- Pick things this contact would actually enjoy, based on their interests, notes and relationship. Close matches count: for a brass or trombone idea, an orchestra, jazz or band concert is a good option. 2 to 4 options.
- "why" is one short line on why it fits this person.
Your final answer must be ONLY this JSON, with no other text:
{"options":[{"name":"","when":"","where":"","price":"","why":"","url":""}],"note":""}
Use "note" for one short caveat (e.g. "couldn't find dated events; these are regular spots"), or "". If you found nothing, say in "note" what you searched for.`;

  const SEARCH_WEEKS = 6;
  function addDaysISO(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d + n);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  // Where to search, taken from the two profiles so the user doesn't have to type it.
  function searchArea(p, me) {
    const mine = (me.location || '').trim(), theirs = (p.location || '').trim();
    if (mine && theirs && mine.toLowerCase() !== theirs.toLowerCase()) {
      return `${mine} (user) or ${theirs} (contact); prefer wherever the extra context says you'll both be`;
    }
    return mine || theirs;
  }

  function optionsRequest(p, me, mode, idea, focus) {
    const today = NT.store.todayISO();
    const area = searchArea(p, me) ||
      'unknown (no location in either profile). Use the extra context if it names a place; otherwise say in "note" that a location is needed';
    return `${personContext(p, me, mode, focus, { resume: false })}

CHOSEN IDEA: ${ideaText(idea)}
SEARCH AREA: ${area}
DATE RANGE: ${today} to ${addDaysISO(today, SEARCH_WEEKS * 7)} (the next ${SEARCH_WEEKS} weeks)

Search the web now and find 2–4 real, specific options for this idea.`;
  }

  function optionsCopyPrompt(p, me, mode, idea, focus) {
    return `${OPTIONS_SYSTEM.replace(/Your final answer must be ONLY this JSON[\s\S]*$/, 'List each option with its name, date/time, place, price, a line on why it fits, and the link.')}\n\n${optionsRequest(p, me, mode, idea, focus)}`;
  }

  // Folds a picked real-world option into the idea so the draft can mention the actual event.
  function ideaWithOption(idea, opt) {
    if (!opt) return idea;
    const details = [opt.name, opt.when, opt.where].filter(Boolean).join(' · ');
    return `${ideaText(idea)}\nSPECIFIC PLAN (found online; mention it naturally and briefly, the way the user would): ${details}`;
  }

  // ---------- ranking contacts by relevance to the user's goal ----------
  const GOAL_RANK_SYSTEM = `You rank the user's contacts by how much each one could help with the user's current goal.
Score each contact 0–100 for "could this person help me reach this goal?":
- 80–100: a direct path. They work at a company or lab that fits the goal, recruit or hire for it, teach or research in the goal's field, or the notes say they can refer, introduce, or advise on exactly this.
- 50–79: close. A related field or industry, alumni working in the area, someone likely to know the right people, or an org officer whose group connects to the goal.
- 20–49: indirect. Some overlap, or general career help (a mentor in a different field, a well-connected peer).
- 0–19: no visible connection to this goal.
Use what you know about companies, labs, and fields (e.g. Westinghouse and Oak Ridge National Laboratory are nuclear employers). Read the notes and touchpoints: a friend whose parent works at a target company can score high.
Relevance comes first. Closeness (level) only breaks near-ties: a level 1 manager at a target company outranks a level 5 friend with no link to the goal.
Judge only from the profile. Never invent facts about a contact. If a profile is too thin to tell, score it low and say so.
"reason" is one short line (under 15 words) naming the specific link, e.g. "Engineer at Westinghouse, a nuclear company that hires interns." Return every contact exactly once, using its id.`;

  const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

  // The compact profile sent for ranking (no name, email or phone). Also hashed to tell when someone needs re-ranking.
  function rankSummary(p) {
    const S = NT.store;
    const notes = p.history.slice(-3).filter(h => h.note).map(h => `${h.type}: ${clip(h.note.replace(/\s+/g, ' '), 150)}`);
    return [
      p.jobs.length ? `work: ${p.jobs.map(j => S.jobLabel(j)).join('; ')}` : null,
      p.student ? `student${S.studyLabel(p, ', ') ? `: ${[p.major, p.university].filter(Boolean).join(' at ')}` : ''}` : null,
      S.studentOrgs(p).length ? `orgs: ${p.orgs.map(o => (o.role ? `${o.role} of ${o.name}` : o.name)).join('; ')}` : null,
      p.relationship ? `relationship: ${p.relationship}` : null,
      `level: ${p.level}/5`,
      p.location ? `location: ${p.location}` : null,
      p.tags.length ? `tags: ${p.tags.join(', ')}` : null,
      p.interests ? `interests: ${clip(p.interests, 200)}` : null,
      p.notes ? `notes: ${clip(p.notes.replace(/\s+/g, ' '), 300)}` : null,
      notes.length ? `recent touchpoints: ${notes.join(' | ')}` : null,
    ].filter(Boolean).join('; ');
  }

  // The goal to rank against: the dedicated field, else the general "goals / anything" box.
  // Only the dedicated Current goal field; "Anything the AI should know" is general context, not a goal.
  const goalOf = me => (me.goal || '').trim();

  // `items` is [{ id, person }] with short ids to save tokens.
  function goalRankRequest(items, me) {
    const user = [
      myWorkLine(me, ''),
      ...myStudentLines(me, ''),
      me.location ? `Location: ${me.location}` : null,
      me.interests ? `Interests: ${me.interests}` : null,
      me.bio ? `Other context: ${clip(me.bio, 400)}` : null,
    ].filter(Boolean).join('\n');
    return `USER'S GOAL: ${goalOf(me)}${user ? `\n${user}` : ''}

CONTACTS (${items.length})
${items.map(it => `[${it.id}] ${rankSummary(it.person)}`).join('\n')}

Score every contact for this goal.`;
  }

  window.NT = window.NT || {};
  NT.prompts = {
    PLAYBOOK, DRAFT_RULES, OPTIONS_SYSTEM, resolveExamples, ideasRequest, ideasCopyPrompt, draftRequest, draftCopyPrompt,
    optionsRequest, optionsCopyPrompt, ideaWithOption,
    GOAL_RANK_SYSTEM, rankSummary, goalOf, goalRankRequest,
  };
})();
