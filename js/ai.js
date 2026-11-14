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

  async function structured(system, user, schema) {
    const settings = NT.store.getSettings();
    if (!settings.apiKey) throw new AIError('Add your Claude API key in Settings (⚙), or use "Copy prompt" and paste it into claude.ai.');

    const mod = await loadSDK();
    const Anthropic = mod.default || mod.Anthropic;
    const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });
    const model = settings.model || 'claude-opus-5-5';

    const params = {
      model,
      max_tokens: 16000,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    };

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
      if (err instanceof Anthropic.BadRequestError) throw new AIError('The request was rejected: ' + (err.message || 'bad request'));
      if (err instanceof Anthropic.InternalServerError) throw new AIError('Claude is having trouble right now. Try again shortly.');
      if (err instanceof Anthropic.APIConnectionError) throw new AIError('Could not reach api.anthropic.com. Check your connection.');
      throw new AIError(err.message || String(err));
    }

    if (resp.stop_reason === 'refusal') throw new AIError('Claude declined this request. Try rewording the extra context.');
    if (resp.stop_reason === 'max_tokens') throw new AIError('The response was cut off. Try again.');

    const text = resp.content.filter(b => b.type === 'text').map(b => b.text).join('');
    try { return JSON.parse(text); }
    catch { throw new AIError('Got an unexpected response format. Try again.'); }
  }

  async function suggestIdeas(person, me, mode, focus) {
    const out = await structured(NT.prompts.PLAYBOOK, NT.prompts.ideasRequest(person, me, mode, focus), IDEAS_SCHEMA);
    return out.ideas || [];
  }

  async function draftMessage(person, me, mode, idea, tone, examples) {
    const system = NT.prompts.PLAYBOOK + '\n\n' + NT.prompts.DRAFT_RULES;
    return structured(system, NT.prompts.draftRequest(person, me, mode, idea, tone, examples), DRAFT_SCHEMA);
  }

  window.NT = window.NT || {};
  NT.ai = { suggestIdeas, draftMessage, AIError };
})();
