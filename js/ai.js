// Claude API calls via the official Anthropic SDK, loaded from a CDN the first time it's needed.
(function () {
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.3.0/+esm';
  // Opus 5.5 and Sonnet 5.5 support server-side refusal fallbacks; Haiku 5.5 doesn't.
  const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5']);

  const IDEAS_SCHEMA = {
    type: 'object',
    properties: {
      ideas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            channel: { type: 'string', enum: ['email', 'linkedin', 'text', 'call', 'video_call', 'in_person', 'other'] },
            effort: { type: 'string', enum: ['low', 'medium', 'high'] },
            description: { type: 'string' },
            why: { type: 'string' },
          },
          required: ['title', 'channel', 'effort', 'description', 'why'],
          additionalProperties: false,
        },
      },
    },
    required: ['ideas'],
    additionalProperties: false,
  };

  const DRAFT_SCHEMA = {
    type: 'object',
    properties: {
      subject: { type: 'string', description: 'Email subject line, or empty string for non-email channels' },
      body: { type: 'string' },
    },
    required: ['subject', 'body'],
    additionalProperties: false,
  };

  class AIError extends Error {}
  let sdkPromise = null;

  function loadSDK() {
    if (!sdkPromise) {
      sdkPromise = import(SDK_URL).catch(err => {
        sdkPromise = null;
        throw new AIError('Could not load the Anthropic SDK. Check your internet connection. (' + err.message + ')');
      });
    }
    return sdkPromise;
  }

  // Sends one Messages API request (model and key come from Settings) and turns SDK errors into readable AIErrors.
  async function send(params) {
    const settings = NT.store.getSettings();
    if (!settings.apiKey) throw new AIError('Add your Claude API key in Settings (⚙), or use "Copy prompt" and paste it into claude.ai.');

    const mod = await loadSDK();
    const Anthropic = mod.default || mod.Anthropic;
    const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });
    const model = settings.model || 'claude-opus-5-5';
    params = { model, max_tokens: 16000, ...params };

    let resp;
    try {
      if (FALLBACK_MODELS.has(model)) {
        try {
          resp = await client.beta.messages.create({
            ...params,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
          });
        } catch (err) {
          // If the fallback beta is rejected for any reason, retry once without it.
          if (err instanceof Anthropic.BadRequestError) resp = await client.messages.create(params);
          else throw err;
        }
      } else {
        resp = await client.messages.create(params);
      }
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) throw new AIError('Your API key was rejected. Check it in Settings.');
      if (err instanceof Anthropic.PermissionDeniedError) throw new AIError('Your API key does not have access to this model.');
      if (err instanceof Anthropic.RateLimitError) throw new AIError('Rate limited. Wait a moment and try again.');
      if (err instanceof Anthropic.BadRequestError) {
        if (/web search/i.test(err.message || '') && /not enabled|disabled/i.test(err.message || '')) {
          throw new AIError('Web search is turned off for your Anthropic account. An admin can turn it on in the Claude Console under Settings → Capabilities (platform.claude.com/settings/capabilities).');
        }
        throw new AIError('The request was rejected: ' + (err.message || 'bad request'));
      }
      if (err instanceof Anthropic.InternalServerError) throw new AIError('Claude is having trouble right now. Try again shortly.');
      if (err instanceof Anthropic.APIConnectionError) throw new AIError('Could not reach api.anthropic.com. Check your connection.');
      throw new AIError(err.message || String(err));
    }

    if (resp.stop_reason === 'refusal') throw new AIError('Claude declined this request. Try rewording the extra context.');
    if (resp.stop_reason === 'max_tokens') throw new AIError('The response was cut off. Try again.');
    return resp;
  }

  const textOf = resp => resp.content.filter(b => b.type === 'text').map(b => b.text).join('');

  async function structured(system, user, schema) {
    const resp = await send({
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    });
    try { return JSON.parse(textOf(resp)); }
    catch { throw new AIError('Got an unexpected response format. Try again.'); }
  }

  // ---------- web search for real options (events, venues) ----------
  const OPTIONS_SCHEMA = {
    type: 'object',
    properties: {
      options: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            when: { type: 'string' },
            where: { type: 'string' },
            price: { type: 'string' },
            why: { type: 'string' },
            url: { type: 'string' },
          },
          required: ['name', 'when', 'where', 'price', 'why', 'url'],
          additionalProperties: false,
        },
      },
      note: { type: 'string' },
    },
    required: ['options', 'note'],
    additionalProperties: false,
  };
  // The prompt asks for at most 4; the cap is a little higher because going over it when search runs inside
  // code execution (dynamic filtering) ends the whole run with an error and loses every result.
  const MAX_SEARCHES = 6;

  // "Knoxville, TN" -> approximate location so search results are local.
  function userLocation(loc) {
    const [city, region] = (loc || '').split(',').map(s => s.trim()).filter(Boolean);
    const out = { type: 'approximate' };
    if (city) out.city = city;
    if (region) out.region = region;
    try { out.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch {}
    return Object.keys(out).length > 1 ? out : null;
  }

  // Web search returns citations, which can't be combined with JSON output mode, so Claude writes JSON as
  // plain text here. If that doesn't parse, a second (search-free) call converts it with a strict schema.
  function parseOptions(text) {
    const clean = text.replace(/```(?:json)?/g, '');
    const start = clean.search(/\{\s*"options"/);
    const end = clean.lastIndexOf('}');
    if (start < 0 || end < start) return null;
    try {
      const out = JSON.parse(clean.slice(start, end + 1));
      return Array.isArray(out.options) ? out : null;
    } catch { return null; }
  }

  function sourcesOf(resp) {
    const urls = new Set();
    for (const b of resp.content) {
      if (b.type === 'text') (b.citations || []).forEach(c => c.url && urls.add(c.url));
      if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) b.content.forEach(r => r.url && urls.add(r.url));
    }
    return [...urls];
  }

  // Counts searches across every request in the turn (usage counts only one request each).
  const searchesIn = resp => resp?.usage?.server_tool_use?.web_search_requests || 0;
  // Search errors arrive inside a 200 response, e.g. max_uses_exceeded or too_many_requests.
  function searchErrors(resp) {
    const found = new Set();
    JSON.stringify(resp.content).replace(/"error_code"\s*:\s*"([a-z_]+)"/g, (_, c) => found.add(c));
    return [...found];
  }

  async function searchTurn(messages, tool, log) {
    let resp;
    // A long search turn can pause; send it back unchanged to let the server continue.
    for (let i = 0; i < 4; i++) {
      resp = await send({ system: NT.prompts.OPTIONS_SYSTEM, messages, tools: [tool], output_config: { effort: 'medium' } });
      log.searches += searchesIn(resp);
      log.responses.push(resp);
      if (resp.stop_reason !== 'pause_turn') break;
      messages = [...messages, { role: 'assistant', content: resp.content }];
    }
    return { resp, messages };
  }

  async function findOptions(person, me, mode, idea, focus) {
    let tool = { type: 'web_search_20260209', name: 'web_search', max_uses: MAX_SEARCHES };
    const ul = userLocation(me.location || person.location);
    if (ul) tool.user_location = ul;
    const log = { searches: 0, responses: [] };
    const first = [{ role: 'user', content: NT.prompts.optionsRequest(person, me, mode, idea, focus) }];

    let turn;
    try {
      turn = await searchTurn(first, tool, log);
    } catch (err) {
      // Some models can't run search through code execution (dynamic filtering); call it directly instead.
      if (!/allowed_callers/.test(err.message || '')) throw err;
      tool = { ...tool, allowed_callers: ['direct'] };
      turn = await searchTurn(first, tool, log);
    }

    // If Claude answered without searching, push it once to actually search.
    if (log.searches === 0) {
      turn = await searchTurn([...turn.messages, { role: 'assistant', content: turn.resp.content },
        { role: 'user', content: 'You did not use web search. Search the web now for real listings in the SEARCH AREA and DATE RANGE, then answer with the JSON.' }], tool, log);
    }

    const resp = turn.resp;
    const errors = log.responses.flatMap(searchErrors);
    console.info('[Find real options] searches:', log.searches, 'errors:', errors, 'responses:', log.responses);
    const meta = { searches: log.searches, errors: [...new Set(errors)] };

    const text = textOf(resp);
    const parsed = parseOptions(text);
    if (parsed) return { ...parsed, ...meta };
    if (!text.trim()) return { options: [], note: '', ...meta };
    const sources = sourcesOf(resp);
    const out = await structured(
      'Convert the search findings below into the JSON format. Use only what is written there; never add events, dates, prices or links. Use "" for anything unknown.',
      `${text}${sources.length ? `\n\nSource URLs:\n${sources.join('\n')}` : ''}`,
      OPTIONS_SCHEMA,
    );
    return { ...out, ...meta };
  }

  async function suggestIdeas(person, me, mode, focus, avoid) {
    const out = await structured(NT.prompts.PLAYBOOK, NT.prompts.ideasRequest(person, me, mode, focus, avoid), IDEAS_SCHEMA);
    return out.ideas || [];
  }

  async function draftMessage(person, me, mode, idea, tone, examples) {
    const system = NT.prompts.PLAYBOOK + '\n\n' + NT.prompts.DRAFT_RULES;
    return structured(system, NT.prompts.draftRequest(person, me, mode, idea, tone, examples), DRAFT_SCHEMA);
  }

  // ---------- rank contacts by relevance to the goal ----------
  const RANK_SCHEMA = {
    type: 'object',
    properties: {
      rankings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            score: { type: 'integer' },
            reason: { type: 'string' },
          },
          required: ['id', 'score', 'reason'],
          additionalProperties: false,
        },
      },
    },
    required: ['rankings'],
    additionalProperties: false,
  };
  const RANK_BATCH = 60; // contacts per request; keeps each response comfortably small

  // Returns { [personId]: { score, reason } }. One request per 60 people; short ids ("1", "2", …) instead of UUIDs save tokens.
  async function rankByGoal(people, me, onProgress) {
    const out = {};
    for (let i = 0; i < people.length; i += RANK_BATCH) {
      const batch = people.slice(i, i + RANK_BATCH);
      onProgress?.(i, people.length);
      const items = batch.map((person, j) => ({ id: String(j + 1), person }));
      const res = await structured(NT.prompts.GOAL_RANK_SYSTEM, NT.prompts.goalRankRequest(items, me), RANK_SCHEMA);
      for (const r of res.rankings || []) {
        const it = items.find(x => x.id === String(r.id).replace(/[^\d]/g, ''));
        if (!it) continue;
        out[it.person.id] = {
          score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
          reason: String(r.reason || '').slice(0, 200),
        };
      }
    }
    return out;
  }

  window.NT = window.NT || {};
  NT.ai = { suggestIdeas, draftMessage, findOptions, rankByGoal, AIError };
})();
