# lfpmeloni-dev.md

> This website, documented like the other projects: a CV and portfolio that recruiters and machines read from the same Markdown files, shown as source.

- Status: live on a Vercel preview, moving to lfpmeloni.dev
- Period: October 2026 - Present
- Role: everything, which is the point
- Links: [github.com/lfpmeloni/lfpmeloni](https://github.com/lfpmeloni/lfpmeloni)

## Problem

A portfolio site has two audiences that want opposite things. People skim and want to find the right page in two clicks. Models and crawlers want clean text without layout noise. Most portfolio templates serve neither well, and a PDF resume only serves the recruiter who already has it.

I also wanted the site itself to show how I work: plain files, version control, small code, no CMS[^1].

## Solution

Every page is a `.md` file in `dev/src/`. The site shows the Markdown **source**, with syntax highlighting, line numbers and clickable links, inside a file-browser layout: a tree on the left, the document in the middle, its sections on the right. URLs are the file paths. `/llms.txt`[^2] serves the same map to machines, and [AGENTS.md](/AGENTS.md) talks to them directly.

Publishing is: edit a `.md` file, push, Vercel rebuilds.

## Architecture

```text
 dev/src/**/*.md
      │  fs walk at build time
      ▼
 lib/content.ts ── routes, sidebar order, headings, page descriptions
      │
      ▼
 lib/md.tsx ── line tokenizer (not a Markdown renderer):
      │        headings · quotes · lists · fences ·
      │        tables · inline code · links · date ranges
      ▼
 Next.js App Router ── static pages per file and per folder
      │                + sitemap · robots · llms.txt · Open Graph image
      ▼
 Vercel (static output)
```

## Engineering decisions

- **No Markdown library.** A renderer's whole job is to hide the syntax, and I wanted the opposite. A small line tokenizer[^3] keeps every `#`, `**` and `-` visible and only adds color, anchors and links.
- **Fully static.**[^4] Every page is generated at build time from the files. There's no server work per request and nothing to keep alive.
- **The source is never hard-wrapped.** One line per paragraph or list item, and the browser does the wrapping, with hanging indents[^5] for list items. Code fences are the exception and scroll horizontally instead, so diagrams keep their shape.
- **Durations are computed, never typed.** Date ranges like `May 2026 - Present` get their length shown as a dimmed inlay hint[^6], the way an editor shows virtual text. Ranges ending in "Present" are recalculated in the browser, so the resume doesn't go stale between deploys.
- **Two themes, one set of tokens.** Night and day are VS Code's default Dark Modern and Light Modern colors, the editor most visitors already know. A tiny inline script applies the saved theme before first paint, so there's no flash[^7].
- **My terminal font.** Hack Nerd Font Mono[^8], self-hosted and subset[^9] to what the site uses (about 40 KB per weight). The header icons are Nerd Font glyphs, so there's no icon library.
- **SEO from the content itself.** Each page's first `>` line is its meta description. Canonical URLs[^10], Open Graph[^11], JSON-LD[^12], sitemap and robots all come from one site-URL setting. Previews and the temporary `vercel.app` host are marked noindex[^13], so only the real domain gets indexed. `/llms-full.txt` gives models every page in one file.
- **Checks that fail the build.** A small Node script lints the content before every build: no em dashes, no TODOs, no footnote without a reference, no internal link to a missing page, every page listed in `/llms.txt`. If it fails, Vercel doesn't deploy. A Playwright suite then checks every page at phone and desktop widths in both themes: no sideways scroll, keyboard navigation, axe accessibility scans, metadata, structured data and that no cookies are set.
- **Analytics without cookies.** Vercel Web Analytics and Speed Insights: page views, referrers and Core Web Vitals, counted with a daily-rotating anonymous hash instead of a cookie, so there's no consent banner.

### What broke and how I fixed it

- **Every long sentence broke twice.** The first version had hard-wrapped `.md` files, and the browser wrapped them again on narrow screens, which left ragged half-lines everywhere. I unwrapped every file to one line per paragraph, made it a writing rule, and let CSS handle the wrapping.
- **ASCII diagrams fell apart on mobile.** Wrapping that's right for prose shreds a box diagram. Fenced blocks are now grouped into their own scroll container with wrapping off.

## Outcome

- **Works:** file-browser navigation, source view with tables, day/night themes, computed durations, per-page SEO and structured data, `/llms.txt`, cookieless analytics, a content lint in the build and a browser test suite in CI.
- **Delivered:** the page you are reading.
- **Still rough:** moving to the lfpmeloni.dev domain, and the GitHub profile README still has to be brought in line with the site.

## Evidence

- Public repository: [github.com/lfpmeloni/lfpmeloni](https://github.com/lfpmeloni/lfpmeloni)
- Live: you are on it. Every page here is the evidence.

## Stack

`TypeScript` `Next.js` `React` `CSS` `Vercel` `Vercel Analytics` `Markdown` `Playwright` `axe-core`

## Glossary for nerds

[^1] CMS (Content Management System): Software such as WordPress where pages live in a database and are edited in an admin panel. Here: there is none; pages are plain Markdown files in Git.
[^2] llms.txt: A proposed standard: a Markdown file at a site's root that gives AI models a map of its content. Here: the whole site is Markdown already, so it comes almost for free.
[^3] Tokenizer: Code that splits text into typed pieces, such as headings, links and code, without interpreting them. Here: it colors the Markdown syntax instead of hiding it.
[^4] Static generation: Every page is built to HTML at deploy time instead of on each request. Here: nothing runs per visit, so pages are fast and hosting is free.
[^5] Hanging indent: Wrapped lines start under the text, not under the bullet. Here: long list items stay readable on phones.
[^6] Inlay hint / virtual text: Text an editor draws next to the code without it being part of the file. Here: computed durations appear after date ranges without being in the Markdown.
[^7] Theme flash (FOUC): A page briefly showing the wrong theme or unstyled content before its scripts run. Here: a tiny inline script sets the theme before the first paint.
[^8] Nerd Font: A programming font patched with thousands of icons. Here: the header icons are font characters, so no icon library is loaded.
[^9] Font subsetting: Removing the characters a site never uses from a font file. Here: about 40 KB per weight instead of megabytes.
[^10] Canonical URL: The one official address of a page, declared to search engines. Here: `/` and `/README.md` are the same page and shouldn't compete.
[^11] Open Graph: Meta tags that set the title, text and image shown when a link is shared on LinkedIn, Slack or WhatsApp. Here: every page gets its own title and description in the preview.
[^12] JSON-LD: Structured data in a script tag that tells search engines what a page is about: a person, a project, a service. Here: Google and AI search can connect the pages to me and my profiles.
[^13] noindex: A tag telling search engines not to list a page. Here: preview deployments and unfinished pages stay out of search.
[^14] App Router: Next.js's file-based routing, where folders become URLs. Here: one catch-all route serves every Markdown file and folder.
