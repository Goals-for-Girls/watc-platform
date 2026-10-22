# We Are the Change — platform

The web platform for **We Are the Change**, the community change-project program of
[Goals for Girls](https://www.goalsforgirls.org).

This first release is the **public project library and map**. It holds no information
about individual girls, so it can go live before the safeguarding sign-off that gates
the WhatsApp pilot. The full plan is in the *We Are the Change — Platform Build
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

## Stack

- **Next.js 16** (App Router, TypeScript), exported as a static site: plain HTML,
  fast on low-end phones, free or near-free to host.
- **Fonts:** Unbounded (headings) and Atkinson Hyperlegible (body, designed for
  readers with low vision and for second-language readers). Self-hosted; no
  third-party font requests.
- **Map:** drawn at build time from Natural Earth data (`world-atlas` + `d3-geo`).
  No map library and no tile requests to third parties. The base map for each
  view is a cached SVG at `/maps/<view>.svg`; pins are drawn over it.
- **Content:** `content/projects.ts` for now. Only `lib/content.ts` reads it, so
  moving content into Sanity changes that one file.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site in ./out
```

Deploy `out/` to Vercel (import the repository; no settings needed) or any static host.

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
- [ ] Confirm consent for every team name shown (all are already public on
      goalsforgirls.org/change-projects).

## Content rules (child protection)

- Projects are named by **team or organization**, never by a girl's name.
- Places are **town or district level** only. Never a school, home or meeting place.
- No photos of girls without separate media consent from a parent or guardian.

## Next phases

1. Move content into **Sanity** so staff can edit stories, guides and translations.
2. Add **Supabase** (database, coach logins, consent records) and the coach portal.
3. Connect the **WhatsApp** provider (Turn.io or Glific) and the AI services.

Each phase gets an independent security review before any girl's data is stored.
