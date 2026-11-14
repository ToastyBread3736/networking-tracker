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
  const MAX_SEARCHES = 3;

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

  async function searchTurn(user, tool) {
    let messages = [{ role: 'user', content: user }];
    let resp;
    // A long search turn can pause; send it back unchanged to let the server continue.
    for (let i = 0; i < 4; i++) {
      resp = await send({ system: NT.prompts.OPTIONS_SYSTEM, messages, tools: [tool], output_config: { effort: 'low' } });
      if (resp.stop_reason !== 'pause_turn') break;
      messages = [...messages, { role: 'assistant', content: resp.content }];
    }
    return resp;
  }

  async function findOptions(person, me, mode, idea, focus) {
    const tool = { type: 'web_search_20260209', name: 'web_search', max_uses: MAX_SEARCHES };
    const ul = userLocation(me.location || person.location);
    if (ul) tool.user_location = ul;
    const user = NT.prompts.optionsRequest(person, me, mode, idea, focus);

    let resp;
    try {
      resp = await searchTurn(user, tool);
    } catch (err) {
      // Some models can't run search through code execution (dynamic filtering); call it directly instead.
      if (!/allowed_callers/.test(err.message || '')) throw err;
      resp = await searchTurn(user, { ...tool, allowed_callers: ['direct'] });
    }

    const text = textOf(resp);
    const parsed = parseOptions(text);
    if (parsed) return parsed;
    if (!text.trim()) throw new AIError('The search came back empty. Try again.');
    const sources = sourcesOf(resp);
    return structured(
      'Convert the search findings below into the JSON format. Use only what is written there; never add events, dates, prices or links. Use "" for anything unknown.',
      `${text}${sources.length ? `\n\nSource URLs:\n${sources.join('\n')}` : ''}`,
      OPTIONS_SCHEMA,
    );
  }

  async function suggestIdeas(person, me, mode, focus, avoid) {
    const out = await structured(NT.prompts.PLAYBOOK, NT.prompts.ideasRequest(person, me, mode, focus, avoid), IDEAS_SCHEMA);
    return out.ideas || [];
  }

  async function draftMessage(person, me, mode, idea, tone, examples) {
    const system = NT.prompts.PLAYBOOK + '\n\n' + NT.prompts.DRAFT_RULES;
    return structured(system, NT.prompts.draftRequest(person, me, mode, idea, tone, examples), DRAFT_SCHEMA);
  }

  window.NT = window.NT || {};
  NT.ai = { suggestIdeas, draftMessage, findOptions, AIError };
})();
