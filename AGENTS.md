# Instructions on how to develop, update and deploy this project

> This project lives at `https://github.com/lfpmeloni/lfpmeloni` so the root README.md file serves my GitHub public profile and should be my visitors hero page. Keep it clean and factual, do not change this document without my approval.

## 1. Developing

lfpmeloni.dev is my CV and portfolio (tagline: "Ask me to build anything"), shown as a developer's public working directory: every page is a Markdown file displayed as **source**. Audiences: recruiters, founders and technical leaders, freelance clients, engineers inspecting my work, and AI agents.

Next.js App Router in `./dev`. Every `.md` in `./dev/src/` becomes a static page whose URL is its file path (`/RESUME.md`, `/PORTFOLIO/real-estate-mcp.md`); folders get a generated listing page. `src/README.md` is the homepage.

### Layout

- Sticky header in three parts: left `lfpmeloni.dev/` + current path (current file in the accent color), center my name, right GitHub / LinkedIn / email chips (Nerd Font glyphs, labels hide on narrow screens) and the day/night toggle.
- Left: unix-style file tree, with a footnote area for non-essential pages (LLMS.md, PRIVACY.md), LinkedIn and copyright. Right: the page's headings. Both sidebars narrow and equal width.
- Middle: a centered reading column of about 88ch with left-aligned text. It never stretches across the viewport.
- Mobile: the tree becomes a burger menu, the header keeps burger, name and icon-only chips.
- Order lives in `dev/lib/content.ts`: `MAIN_ORDER` (sidebar), `FOOTNOTE_ORDER` (footnote area), `DIR_ORDER` (PORTFOLIO/ by effort, not alphabetically), `HIDDEN` (see section 2).

### Markdown is shown, never rendered

- Visitors see the syntax: `#`, `**`, `` ` ``, `-`, `1.`, `>`, `[text](url)` and `[^id]` all stay visible. Never turn them into `<h1>`, `<strong>`, `<ul>`. Links stay clickable.
- It is syntax-highlighted and typeset, not an unstyled `<pre>`. `dev/lib/md.tsx` is a line tokenizer, not a Markdown renderer.
- Prose wraps in the browser with hanging indents for list items. Fenced code blocks never wrap; each scrolls horizontally so ASCII diagrams keep their shape.
- Tables (`| a | b |` rows) are shown as source in the same scroll box as a fence, with cells padded at render time so the pipes line up. Write them unpadded, and prefer lists over tables: tables scroll sideways on phones.
- Date ranges like `May 2026 - Present` get a dimmed computed duration (`components/Duration.tsx`); "Present" is recalculated in the visitor's browser.
- Line numbers come from CSS (`data-n`), so they are not part of the text crawlers and models read.

### Writing rules for every .md in `dev/src/`

- **No em dashes (U+2014)** anywhere: Markdown, code, metadata, alt text, JSON-LD. Use a colon, a comma, parentheses or ` | `. Box-drawing characters in diagrams are fine. Say "AI-assisted development", never "vibe-coding".
- **No new claims.** Every fact comes from a portfolio page, the resume or a value I supplied. When pages disagree, the portfolio page wins.
- **No hard line breaks.** One physical line per paragraph, blockquote, list item or footnote. Only fenced blocks are exempt; keep their lines at 72 characters or less.
- **One email:** `mail@lfpmeloni.dev`, defined once as `EMAIL` in `dev/lib/site.ts`. `EMAIL_LIVE` there decides whether the header leads with email or LinkedIn; keep it `false` until the mailbox works.
- **Dates:** `Month YYYY - Month YYYY` or `Month YYYY - Present` with full month names, `YYYY - YYYY` when only years are known. Never type durations.
- **Languages:** German is "Professional Working - B1 certified, currently studying for B2".
- **Every page starts with a unique `> ` line** under its `# FILE.md` title. It is the page's hook and its meta description; no two pages share one. No footnote markers in it.
- **Tailored resumes:** RECRUITERS.md and CONTACT.md say a resume tailored to the job description is sent once the recruiter emails the JD.
- **Confidentiality:** never publish client names, credentials, customer or user data, pricing or fee internals, partner deals, or implementation details beyond what explains the work.
- Pages that must keep their character: README.md (who I am, open to, a "Projects" list in PORTFOLIO/ order, a "More" list, why Markdown; under 30 lines, no build instructions, no repeating other pages), RECRUITERS.md (instructions to recruiters written like a system prompt, funny "Do not" list), AGENTS.md page (instructions to machines, playful prompt injection), LLMS.md (human version of `/llms.txt`).

### Portfolio pages (`dev/src/portfolio/`)

Same skeleton, in this order:

```md
# <file>.md

> One-line hook: what it is, for whom, current state.

- Status: ...
- Period: Month YYYY - Month YYYY | Present
- Role: ...
- Links: ...

## Problem
## Solution
## Architecture
## Engineering decisions
### What broke and how I fixed it
## Outcome
## Evidence
## Stack
## Glossary for nerds
```

- **Architecture:** short stack summary plus a ```text ASCII box diagram.
- **Engineering decisions:** "I chose X over Y because...".
- **What broke:** 2 to 6 stories, each a spoken interview answer: symptom, cause, fix, takeaway.
- **Outcome:** three bullets: works, delivered (real counts), still rough.
- **Evidence:** public repo, private repo ("walkthrough on request"), live URL, or the diagram. Client work never links to the client's repo or deployment.
- **Stack:** one line of backticked tags.
- **Glossary for nerds:** numbered footnotes, counting from `[^1]` on each page in order of first appearance. Put the marker right after a term's first occurrence in prose, never in headings, the hook or code fences. Define it at the end as one plain line, no bold: `[^1] Term (expansion): What it is. Here: why it matters in this project.` Terms that only appear in a diagram get the last numbers and no marker. Renumber when inserting a term. Only portfolio pages have a glossary.
- Voice: first person engineering notes, concrete numbers, plain verbs, no marketing adjectives or generic AI phrasing. Every fact comes from the project's repo or docs.
- Sources, in effort order: github.com/lfpmeloni/vemkavet, /open-decade (+ private /open-decade-dev), /song2video, /realtor-mcp, /lfpmeloni.

### Design

`developer`, `AI engineer`, `terminal`, `repository`, `minimalism`, `precision`, `high trust`. Creative and fun to browse, but deliberately simple. References: GitHub repository navigation, source editors, Markdown files, terminal conventions. Avoid generic portfolio templates.

- **Themes:** night is VS Code Dark Modern, day is VS Code Light Modern, both with the default Dark+/Light+ syntax colors. Every color is a token in `dev/app/globals.css` with the same names in both themes; no hard-coded colors elsewhere (exceptions: `themeColor` in `app/layout.tsx` and the Open Graph image, which can't read CSS). Text colors keep at least 4.5:1 contrast on every panel in both themes (axe checks it). The default follows the system; the toggle saves to `localStorage` (try/catch) and an inline `<head>` script applies it before paint.
- **Font:** Hack Nerd Font Mono everywhere, self-hosted subset woff2 in `dev/public/fonts/` (license next to it), `local()` first. Header icons are Nerd Font glyphs; re-run the subset if new glyphs are needed.

## 2. Update

Follow exactly any instruction given on the prompt on how and what to change. Update the files at ./dev/src and they should serve the webpage automatically on redeploy.

- **Hidden pages:** files in `HIDDEN` (`dev/lib/content.ts`) build and open by URL but stay out of the sidebar, sitemap, `/llms.txt` and `/llms-full.txt`, and are noindex. Currently `SERVICES.md` and its German twin `LEISTUNGEN.md` (linked by hreflang). To publish them: add an Impressum page first (§5 DDG requires one for commercial offers in Germany) and extend PRIVACY.md, then remove them from `HIDDEN`, add them to `MAIN_ORDER` after `PORTFOLIO/`, and add them to LLMS.md.
- When a page changes what the site does (analytics, new routes), update PRIVACY.md, LLMS.md and `portfolio/lfpmeloni-dev.md` with it.

## 3. Deploy

This project is deployed on my Vercel account (project `lfpmeloni`, Hobby plan, Root Directory `dev`). Every push to `main` deploys to production automatically; other branches get preview deployments. Source code and actions live in the ./dev folder. Keep the root clean. `dev/etc/` holds personal files and is gitignored; never commit it.

- **Checks, in `./dev`:** `npm run check:content` (no browser: em dashes, banned wording, TODOs, footnotes without a reference, broken internal links, pages missing from LLMS.md or out of order), `npx next build`, `npm run check:built` (the generated HTML), then `npm run test:site` (Playwright + axe at 320/375/768/1280 in both themes: no sideways scroll, menu and keyboard, focus rings, accessible names, metadata, JSON-LD, OG image, no cookies or third-party requests). Run all four before pushing.
- **Gates:** `vercel.json` runs `check:content` before and `check:built` after `next build`, so a lint failure fails the Vercel build and nothing deploys. `.github/workflows/site.yml` runs all four on every push, once as today (noindex) and once as production on the domain (indexable), and fails on any failure, skip, flaky test or missing report. Playwright can't stop a Vercel deploy on Hobby; treat a red run as a reason to revert.
- **URL casing:** `dev/middleware.ts` sends any other spelling (`/recruiters.md`, `/portfolio`) to the canonical path with a 308. `next.config.mjs` bakes the route list into it at build time.
- **SEO:** `dev/lib/site.ts` holds `SITE_URL` (`NEXT_PUBLIC_SITE_URL`, else `https://` + Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, else localhost); nothing else hard-codes the domain. Only production on a non-`vercel.app` host is indexable (`INDEXABLE`); everything else is noindex with `Disallow: /`. Titles are `<FILE> | Felipe Meloni`, home is `Felipe Meloni | AI & Software Engineer`. Page metadata names the OG image explicitly (`OG_IMAGE`), because a page-level `openGraph` drops the inherited one. Each page gets a unique title, its `> ` line as description, a canonical URL, Open Graph and Twitter tags (`lib/meta.ts`) and schema.org JSON-LD (`lib/jsonld.ts`: Person and WebSite site-wide, ProfilePage on home, project and service pages). `/` and `/README.md` share the canonical `/`. `app/sitemap.ts` dates pages by their last git commit when history is available. `/llms.txt` serves LLMS.md, `/llms-full.txt` every public page.
- **Analytics:** `@vercel/analytics` and `@vercel/speed-insights` in `app/layout.tsx`, both cookieless. Enable Web Analytics and Speed Insights in the Vercel project dashboard. Referrers (Google, LinkedIn, chatgpt.com, Perplexity...), countries, devices and Web Vitals work on Hobby. `components/Track.tsx` sends `outbound` and `glossary` custom events, which only record on Pro; the UTM panel also needs Web Analytics Plus. Share links with `?utm_source=<site>` anyway. AI crawler traffic (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot) is visible under Firewall; do not block it.
- **Domain go-live** (once the domain is bought):
  1. Add `lfpmeloni.dev` to the Vercel project as the production domain. If DNS is on Cloudflare, create the records Vercel shows with the proxy off (DNS only, grey cloud).
  2. Set `NEXT_PUBLIC_SITE_URL=https://lfpmeloni.dev` for Production only, and redeploy. Previews keep their own hosts and stay noindex.
  3. Redirect the `*.vercel.app` production host to the domain with a Vercel domain redirect.
  4. Run `BASE_URL=https://lfpmeloni.dev EXPECT_INDEXABLE=1 npm run test:site`. Check `/robots.txt`, `/sitemap.xml`, canonicals and `og:image` on the domain, and the card in LinkedIn Post Inspector. Submit the sitemap in Google Search Console and Bing Webmaster Tools.
  5. Email: send a test to `mail@lfpmeloni.dev` from an outside account and reply from it; SPF, DKIM and DMARC must pass in the received headers. Then set `EMAIL_LIVE = true`.
  6. Before publishing SERVICES.md/LEISTUNGEN.md or relying on freelance work through the site, add IMPRESSUM.md (§ 5 DDG) and put the controller address in PRIVACY.md.

## 4. General Guidelines

- Keep the repo clean, bloat free and simple. No development updates should be kept. No decisions should be stored. It should simply contain what is needed for it to work.
