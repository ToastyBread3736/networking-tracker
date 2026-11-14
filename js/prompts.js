// Prompt text shared by the in-app AI and the "Copy prompt" buttons.
// Edit PLAYBOOK to change how ideas are chosen.
(function () {
  const PLAYBOOK = `You help the user keep up and grow their professional network. Given one contact's profile, you suggest specific, realistic touchpoint ideas and write short, natural messages.

How to choose ideas:

First decide what kind of relationship this is. Relationship comes before level.
- FRIEND: the relationship is Friend, or a peer/classmate at level 4–5, or the notes show you hang out socially (party together, go out, room together, etc.). Treat them as a friend, not a networking contact.
- PEER: a peer or classmate at level 1–3.
- PROFESSIONAL: anyone senior or in a professional role (professional, mentor, recruiter, professor, manager, alumni you don't know socially).

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
- Some people have more than one job (e.g. a professor who also runs a business). Choose the role that fits the idea best.
- Base ideas on the profile: jobs, organizations, location, relationship, level, interests, notes, and past touchpoints. Don't suggest something they've already done recently.
- Suggest in-person ideas only if you and the contact are in the same area (or the extra context says you'll be there). Otherwise suggest virtual ones.
- Match the formality to the relationship. With senior people, respect their time and make one specific ask.
- Never make up facts about the contact. If an idea depends on something you don't know (a recent post, a news item), tell the user to look it up first, e.g. "check their recent LinkedIn activity for…".
- If it has been a long time since the last touchpoint, make the first idea an easy way back in.
- Use a mix of channels and effort levels.`;

  const DRAFT_RULES = `Message-writing rules:
- If WRITING EXAMPLES are given, they come first. Copy the user's voice and length exactly, even when it breaks the defaults below. The only rule that still applies is never inventing facts.
- Don't use "yo" (or "yoo", "yo!", etc.) unless the user's writing examples use it.
- Write as the user, in the first person, sounding like a real person. No clichés ("I hope this email finds you well", "I wanted to reach out").
- Default length (when there are no examples): for MAINTAIN, 2–4 sentences. For BUILD with a PROFESSIONAL contact, under 120 words with one clear ask that is easy to say no to. To a FRIEND or PEER, one short line is usually enough.
- The chosen idea's description is a plan for you, not text to include. Don't pack its details into the message.
- Only add details the message needs. Don't explain, reassure ("no worries if not", "no pressure"), or pad.
- Never invent specifics. If you don't know a detail (a place, a time), leave it out the way people do in real texts ("volleyball saturday?"). Use a [square-bracket placeholder] only when the message can't work without it, e.g. [article link].
- Match the channel: email gets a subject line; LinkedIn messages and texts are shorter and have no subject.
- To a FRIEND, write the way you'd text a friend: short, relaxed, lowercase is fine, no formal ask or sign-off.`;

  function personContext(p, me, mode, focus) {
    const S = NT.store;
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
    const lines = [
      `CONTACT`,
      `- Name: ${name}`,
      p.jobs.length ? `- Work: ${p.jobs.map(j => S.jobLabel(j)).join('; ')}` : null,
      p.orgs.length
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
      me.role ? `- Role: ${me.role}` : null,
      me.location ? `- Location: ${me.location}` : null,
      me.interests ? `- Interests: ${me.interests}` : null,
      me.bio ? `- Goals / context: ${me.bio}` : null,
      ``,
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

  window.NT = window.NT || {};
  NT.prompts = { PLAYBOOK, DRAFT_RULES, resolveExamples, ideasRequest, ideasCopyPrompt, draftRequest, draftCopyPrompt };
})();
