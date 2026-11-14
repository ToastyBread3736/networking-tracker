# networking-tracker

A local, dark-themed web app for keeping track of your professional network, keeping it up, and growing it.

## Run it

Open `index.html` in your browser. There's no install, build step, or server.

## Features

- **One line per person**: when the next touchpoint is due, name and role, location, level of connection (1–5), relationship, goal (Build/Maintain), and tags. Click a tag to filter by it.
- **Multiple jobs and student orgs**: Work (job title + company) and Student organizations (org + leadership position) are repeating rows, up to 3 of each. When you fill one in, a new empty row appears, which covers professors who also run a business or students in several orgs. The list shows the first role plus `+N`; hover to see all of them.
- **Touchpoint tracking**: the next touchpoint date is last touch + desired frequency. Rows are sorted with overdue first. `✓` logs a touchpoint today (and can be undone).
- **Build vs. Maintain**: each person has a goal, and it changes what kinds of ideas you get.
- **AI ideas** (`✦`): Claude suggests 5 touchpoint ideas based on the person's role, location, relationship, level, interests, notes, and past touchpoints. Pick one, or type your own.
- **AI drafts**: turns the chosen idea into a short message you can edit. Clicking "Sent" logs the touchpoint.
- **Writing examples**: in Settings, paste messages you've actually sent for each tone (Friendly / Professional / Casual). Drafts copy your voice, length and formatting, not the content. In the ideas dialog, **Example messages for this draft** overrides the defaults for that one message. Separate multiple examples with a `---` line.
- **Copy prompt**: every AI step can be copied as a prompt to paste into claude.ai, so you don't need an API key.
- **Local storage + Export/Import**: data lives in your browser's localStorage. Export saves a JSON backup, and Import can merge it into or replace your current data. Your API key is never exported.

Keyboard: `/` jumps to search, `n` adds a person.

## AI setup (optional)

Open ⚙ Settings, paste a Claude API key from console.anthropic.com, and pick a model (Opus 5.5 is the default; Haiku 5.5 is cheapest). Fill in **About you** so ideas and drafts sound like you. For example, your location decides whether in-person ideas make sense.

The key stays in this browser and is sent only to `api.anthropic.com`. The Anthropic SDK is loaded from jsDelivr the first time you use an AI feature.

## Customizing the suggestions

The rules for choosing ideas (coffee chats for mid-level senior contacts, lunch or sports with peers, quick emails/articles/LinkedIn comments for maintaining, etc.) are plain text in `PLAYBOOK` in [js/prompts.js](js/prompts.js). Edit them to match how you network.

## Files

| File | Purpose |
|---|---|
| `index.html` | Layout and dialogs |
| `css/styles.css` | Dark theme |
| `js/store.js` | localStorage, import/export, due-date math |
| `js/prompts.js` | Playbook and prompt builders (shared by AI and Copy prompt) |
| `js/ai.js` | Claude API calls (structured JSON output) |
| `js/app.js` | UI logic |

> Tip: export a backup now and then. Clearing your browser data deletes localStorage.
