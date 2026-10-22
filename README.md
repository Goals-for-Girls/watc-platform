# We Are the Change — platform

The web platform for **We Are the Change**, the community change-project program of
[Goals for Girls](https://www.goalsforgirls.org).

This release has the **public project library and map**, plus a **working demo of the
WhatsApp bot**. Neither stores any information about individual girls, so both can go
live before the safeguarding sign-off that gates the WhatsApp pilot. The full plan is in the *We Are the Change — Platform Build
Recommendation* document.

## What is here

| Page | Path |
| --- | --- |
| Home: project mosaic, how a project comes together, map preview | `/` |
| Project library with filters by UN goal and country | `/projects/` |
| One page per project | `/projects/<slug>/` |
| Project map, everywhere and by country | `/map/`, `/map/<country>/` |
| Safety rules and Report a Concern | `/safety/` |
| How starting a project will work (2027) | `/start/` |
| Working bot demo, with the staff view beside it | `/demo/` |

## Stack

- **Next.js 16** (App Router, TypeScript). Every page is pre-rendered as static HTML,
  fast on low-end phones. Only `/api/bot` runs on the server, because it holds the
  AI key.
- **Fonts:** Unbounded (headings) and Atkinson Hyperlegible (body, designed for
  readers with low vision and for second-language readers). Self-hosted; no
  third-party font requests.
- **Map:** drawn at build time from Natural Earth data (`world-atlas` + `d3-geo`).
  No map library and no tile requests to third parties. The base map for each
  view is a cached SVG at `/maps/<view>.svg`; pins are drawn over it.
- **Content:** `content/projects.ts` for now. Only `lib/content.ts` reads it, so
  moving content into Sanity changes that one file.

## The bot (`lib/bot/`)

| File | What it does |
| --- | --- |
| `flow.ts` | The conversation, as a small state machine. Stores nothing. |
| `brain.ts` | The four AI jobs: safety screening, issue-to-goal mapping, matching similar projects, drafting a plan. Claude through the Anthropic API, with keyword rules as the fallback. |
| `redact.ts` | Rule-based checks that run before any AI call: hides phone numbers, emails and links, and catches safety keywords even if the AI is down. |
| `types.ts` | Message types that mirror what WhatsApp can show (text, up to 3 reply buttons, cards), so the same flow can drive WhatsApp later. |

How it stays safe:

- Every typed message is screened first. A possible disclosure of harm stops the
  project flow, tells the girl a trusted adult will follow up, and raises an urgent
  alert for staff. The keyword safety net cannot be overridden by the AI.
- The AI never chats freely. Each call is forced into a fixed structure (tool use),
  which also keeps the bot within Meta's rules on AI assistants in WhatsApp.
- Girls' text is passed to the AI as data, inside tags, with instructions to ignore
  anything inside it that looks like an instruction.
- The demo stores and logs nothing. Conversation state lives in the visitor's browser.
- A per-visitor limit (30 messages a minute) protects the AI budget.

Without `ANTHROPIC_API_KEY` the bot runs in **offline mode** on keyword rules and says
so on the page. If the AI service fails mid-conversation it falls back to the same
rules and tells staff.

**Before real girls use it:** the safeguarding lead should review the safety keywords
in `redact.ts` (and add them in each partner language), the disclosure reply in
`flow.ts`, and the referral route behind "a trusted adult will follow up".

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

Deploy on Vercel: import the repository; no build settings needed. Then add the
environment variables from `.env.example` under Settings > Environment Variables.

## Before going live

- [ ] **Confirm the SDG for each project.** The tags in `content/projects.ts` were
      assigned for the prototype (`sdgConfirmed: false`).
- [ ] **Set the safeguarding contact.** Copy `.env.example` to `.env.local` (and set the
      same variable in Vercel): `NEXT_PUBLIC_SAFEGUARDING_EMAIL` must be a monitored
      Goals for Girls inbox. Until then the Safety page shows a visible placeholder.
- [ ] **Board approval of the safety rules and age policy** stated on `/safety/`. They
      describe commitments from the build recommendation.
- [ ] **Partner contact link.** `/start/` points to goalsforgirls.org; replace it with a
      contact page or form when one exists.
- [ ] **Anthropic API key** from a Goals for Girls account in Vercel's environment
      variables (`ANTHROPIC_API_KEY`), so the demo runs on AI rather than keyword rules.
      Set a monthly spend limit in the Anthropic Console.
- [ ] Confirm consent for every team name shown (all are already public on
      goalsforgirls.org/change-projects).

## Content rules (child protection)

- Projects are named by **team or organization**, never by a girl's name.
- Places are **town or district level** only. Never a school, home or meeting place.
- No photos of girls without separate media consent from a parent or guardian.

## Next phases

1. Move content into **Sanity** so staff can edit stories, guides and translations.
2. Add **Supabase** (database, coach logins, consent records) and the coach portal.
3. Connect the **WhatsApp** provider (Turn.io or Glific) to `lib/bot/flow.ts`, with
   conversations stored in the data core under the consent and retention rules.

Each phase gets an independent security review before any girl's data is stored.
