// Prompt text shared by the in-app AI and the "Copy prompt" buttons.
// Edit PLAYBOOK to change how ideas are chosen.
(function () {
  const PLAYBOOK = `You help the user keep up and grow their professional network. Given one contact's profile, you suggest specific, realistic touchpoint ideas and write short, natural messages.

How to choose ideas:

GOAL = BUILD (make the connection stronger)
- Level 1–2 (new or weak): start small and give first. Examples: a thoughtful comment on their LinkedIn post, congratulating them on news, sharing a resource that fits their work, asking one specific question, or saying hello at an upcoming event.
- Level 3 with someone senior (professional, mentor, recruiter, professor, manager): ask for a 20–30 minute coffee chat or informational conversation. Meet in person if you're in the same city, otherwise on a video call. Ask for advice on a specific decision.
- Peers, classmates, and friends: suggest a casual shared activity they would actually enjoy, picked from their interests. Examples: lunch, coffee, a pickup game or sport (volleyball, etc.), a study or work session, or going to a meetup, talk, or game together.
- Level 4–5: bigger gives and asks. Examples: introduce them to someone useful, propose working on something together, invite them to an event, offer concrete help, or ask for a referral if it's appropriate.

GOAL = MAINTAIN (stay on their mind, with little effort from either of you)
- A quick check-in email or text, an article/podcast/video related to their work or interests ("this made me think of you"), a comment or congratulations on a LinkedIn post or milestone, a holiday or birthday note, or a short update on something they helped with.
- No big asks. Keep it easy for them to reply to, or not reply at all.

Always:
- Base ideas on the profile: job, company, location, relationship, level, interests, notes, and past touchpoints. Don't suggest something they've already done recently.
- Suggest in-person ideas only if you and the contact are in the same area (or the extra context says you'll be there). Otherwise suggest virtual ones.
- Match the formality to the relationship. With senior people, respect their time and make one specific ask.
- Never make up facts about the contact. If an idea depends on something you don't know (a recent post, a news item), tell the user to look it up first, e.g. "check their recent LinkedIn activity for…".
- If it has been a long time since the last touchpoint, make the first idea an easy way back in.
- Use a mix of channels and effort levels.`;

  const DRAFT_RULES = `Message-writing rules:
- Write as the user, in the first person, sounding like a real person. No clichés ("I hope this email finds you well", "I wanted to reach out").
- Length: for MAINTAIN, 2–4 sentences. For BUILD, under 120 words, with one clear and easy ask (suggest a time or option, and make it easy to say no).
- Mention something specific from the profile or idea, so it couldn't have been sent to anyone.
- Use [square-bracket placeholders] for anything the user must fill in (an article link, a date, a detail you don't know). Never invent specifics.
- Match the channel: email gets a subject line; LinkedIn messages and texts are shorter and have no subject.`;

  function personContext(p, me, mode, focus) {
    const S = NT.store;
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
    const lines = [
      `CONTACT`,
      `- Name: ${name}`,
      p.job || p.company ? `- Role: ${[p.job, p.company].filter(Boolean).join(' at ')}` : null,
      p.location ? `- Location: ${p.location}` : null,
      p.relationship ? `- Relationship to user: ${p.relationship}` : null,
      `- Level of connection: ${p.level}/5 (${S.LEVELS[p.level]})`,
      p.tags.length ? `- Tags: ${p.tags.join(', ')}` : null,
      p.interests ? `- Interests: ${p.interests}` : null,
      p.notes ? `- Notes: ${p.notes}` : null,
      `- Last touchpoint: ${S.sinceLabel(p)}${p.lastTouch ? ` (${p.lastTouch})` : ''}; desired every ${p.frequencyDays} days`,
      p.history.length
        ? `- Recent touchpoints:\n${p.history.slice(-5).map(h => `    ${h.date}: ${h.note || 'touchpoint'}`).join('\n')}`
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

  function ideasRequest(p, me, mode, focus) {
    return `${personContext(p, me, mode, focus)}\n\nSuggest 5 distinct touchpoint ideas for this contact.`;
  }

  function ideasCopyPrompt(p, me, mode, focus) {
    return `${PLAYBOOK}\n\n${ideasRequest(p, me, mode, focus)}\n\nFor each idea give a short title, the channel, the effort (low/medium/high), 1–2 sentences on exactly what to do, and one line on why it fits this person. Number them 1–5.`;
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

  function examplesBlock(examples) {
    if (!examples) return '';
    const parts = examples.split(/^\s*---+\s*$/m).map(s => s.trim()).filter(Boolean);
    const body = parts.map(s => `<example>\n${s}\n</example>`).join('\n');
    return `\n\nWRITING EXAMPLES (messages the user actually wrote)\nMatch their voice: word choice, sentence length, greeting and sign-off style, punctuation, capitalization, emoji use, and overall length. Do NOT copy their content or facts; they are about other people and situations.\n${body}`;
  }

  function draftRequest(p, me, mode, idea, tone, examples) {
    return `${personContext(p, me, mode, '')}\n\nCHOSEN IDEA: ${ideaText(idea)}\nTONE: ${tone}${examplesBlock(examples)}\n\nWrite the message the user would send for this idea.`;
  }

  function draftCopyPrompt(p, me, mode, idea, tone, examples) {
    return `${PLAYBOOK}\n\n${DRAFT_RULES}\n\n${draftRequest(p, me, mode, idea, tone, examples)}\nIf it's an email, start with "Subject: …". Output only the message.`;
  }

  window.NT = window.NT || {};
  NT.prompts = { PLAYBOOK, DRAFT_RULES, resolveExamples, ideasRequest, ideasCopyPrompt, draftRequest, draftCopyPrompt };
})();
