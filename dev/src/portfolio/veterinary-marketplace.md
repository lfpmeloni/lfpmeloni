# veterinary-marketplace.md

> vemkavet: at-home vet visits in São Paulo. Pet owners book a vet to come to the house, vets run their own agenda. Live in production, invite-only beta.

- Status: in production since July 2026, invite-only beta with founding vets
- Period: May 2026 - Present
- Role: solo founder-engineer: product, architecture, code, ops, go-to-market
- Links: [vemkavet.com.br](https://vemkavet.com.br) (repo is private)

## Problem

Taking a pet to the clinic in São Paulo costs half a day, and for cats and older animals the trip itself is the stressful part. On the other side there are good vets who want flexible, better-paid work outside clinic employment and have no decent tool to sell home visits. The existing options were directories or apps that had stopped being maintained. Nobody handled the whole loop: find a vet who actually covers your neighbourhood, book a real slot, pay, get a proper medical record afterwards.

I scoped it on purpose to routine and follow-up care. No emergencies, no surgery, not a clinic replacement. That one decision shaped a lot of the product, starting with the emergency check in booking.

## Solution

A two-sided marketplace, PT-BR only, web plus PWA[^pwa]:

- Signup with LGPD[^lgpd] consent (email or Google), resumable onboarding for owners and vets, vet document upload and CRMV[^crmv] verification (manual review plus a daily automated check).
- Vet-owned agenda on a 15-minute grid: service areas per weekday, blackouts, pause mode, two-way ICS[^ics] sync with their own calendar.
- Booking with an emergency red-flag questionnaire that blocks the flow and sends people to a clinic, multi-pet visits, counter-proposals and a waitlist.
- Checkout with PIX[^pix] or card, a single 10-minute slot hold and automatic refunds when something falls through.
- Medical record (prontuário)[^prontuario] that locks once finalized. Corrections are addenda, never edits. Structured vitals, prescriptions, attachments and server-generated PDFs.
- Realtime chat per booking, care reminders, reviews with sub-ratings.
- Admin desk behind TOTP 2FA[^totp] for verification, document review, payouts and policy switches. LGPD data export for users.

## Architecture

Everything runs on two managed platforms. A Next.js 15 App Router app on Vercel serves the pages and about 55 API route handlers. Every request body goes through shared Zod schemas[^zod], then a typed repository layer, then Supabase. Supabase (São Paulo region) provides Postgres, Auth, Realtime for chat and Storage. Row-level security[^rls] is the security boundary, not the API. Payments go through Pagar.me, email through Resend, errors to Sentry with PII[^pii] scrubbed.

```text
 Browser / PWA
      │
      ▼
 Next.js 15 on Vercel ── pages + /api route handlers
      │  Zod validation (shared package)
      │  typed repository (shared package)
      ▼
 Supabase (sa-east-1)
   ├─ Postgres  ── RLS default-deny, guard triggers, append-only logs
   ├─ Auth      ── email + Google, admin requires TOTP (AAL2)
   ├─ Realtime  ── per-booking chat
   └─ Storage   ── private buckets for documents and visit attachments

 Pagar.me (PIX / card) ──webhook──► API ──re-fetch order──► Pagar.me
 Resend (email) · Sentry (scrubbed)
 Vercel + GitHub Actions crons (slot holds, reminders)

 Release: CI gate → forward-only migration → SQL test harnesses
          → prebuilt deploy → /api/health (SHA + env) → promote
```

The repo is a pnpm + Turborepo monorepo[^monorepo]: the web app, a dormant Expo shell[^expo], and shared packages for types, validation, the Supabase client and design tokens.

## Engineering decisions

- **Boring, managed stack.** Two vendors, close to zero monthly cost before launch. I started with a separate NestJS API and deleted it. Next.js route handlers plus RLS covered everything, and every extra service is one more thing to keep alive alone.
- **RLS is the real permission system.** Tables are default-deny. Public reads go through narrow SECURITY DEFINER[^security-definer] functions instead of views. Privileged columns are protected by guard triggers[^guard-trigger] rather than ever more policies.
- **Forward-only migrations.**[^forward-only] No down migrations, no editing applied files. Audit log, payment events and finalized medical records are append-only[^append-only]. A mistake gets fixed with a new migration, never by rewriting history. Hooks in my AI tooling enforce this, because the agent is the one most tempted to "just fix the old file".
- **Money is integer cents and never trusted from the client.** Card data goes straight from the browser to Pagar.me as a token. Webhook[^webhook] bodies are treated as a hint: the server re-fetches the order before changing any state.
- **One build, demo or live.** Each integration turns on when its key exists and degrades cleanly when it doesn't, so staging, previews and local dev run the same code.
- **AI where it pays off today: building it.** The product has no chatbot yet, on purpose. The docs postpone AI features until people actually use the core loop. Where AI is all over this project is the development setup. I run it with Claude Code using per-area skills, project rules and hooks that block unsafe database and secret operations. An AI vet copilot is on the roadmap.

### What broke and how I fixed it

- **Production returned 42501 on every request.**[^42501] The production schema had lost its default role grants, so requests failed before RLS was even evaluated. I restored the grants with a migration and pinned the default privileges so every new table inherits them.
- **R$ 200 showed as R$ 20.000,00.** The price formatter received cents and never divided by 100. Charges were always correct because they never touched the display layer, but the screens were wrong. I fixed the formatter and pinned it with a unit test.
- **A payout field was readable on a public table.** My own security pass found it. I moved payout details to a private table with its own policies. It was a destructive migration, so I approved it by hand instead of letting it ride the pipeline. The takeaway for me: "who can read this column?" is a question for every new column, not just the obvious ones.
- **A migration failed in production but not in staging.** A trigger that freezes finalized medical records blocked the migration's own backfill, because only production had finalized records. A session-level bypass didn't work because the CLI opens a new connection per migration. I recovered forward-only: an idempotent[^idempotent] follow-up migration plus a one-time history repair, no rollback.
- **The app went down after I added a table.** A new booking↔pets junction table made the existing PostgREST embeds ambiguous (PGRST201)[^pgrst201]. I fixed it by naming the foreign key explicitly in the four affected queries. The takeaway: a new relationship can break queries that never mention it.

## Outcome

- **Works:** the full loop from signup to booking, payment, visit, medical record, review and payout is in production. A real PIX booking was paid end to end.
- **Delivered:** ~150 commits, 62 migrations, ~290 unit tests, 5 SQL test harnesses, a single release workflow that takes one exact commit from CI to promotion.
- **Still rough:** split payments to vets need the payment provider's account-level approval, accessibility hasn't had its WCAG pass[^wcag], there are no end-to-end browser tests yet, and the legal texts are waiting for lawyer review. Supply comes first: founding vets before opening to pet owners.

## Evidence

- Live: [vemkavet.com.br](https://vemkavet.com.br)
- Repository: private. I can walk through the code, the migrations and the release workflow in an interview.
- Architecture: diagram above.

## Stack

`TypeScript` `Next.js` `Supabase` `PostgreSQL` `RLS` `Zod` `Pagar.me` `Vercel` `GitHub Actions` `Sentry` `Turborepo` `Claude Code`

## Glossary for nerds

[^pwa]: **PWA** (Progressive Web App) - a website that installs to the home screen and behaves like an app. Here: owners and vets get an app on their phones from one codebase, with no app-store releases.
[^lgpd]: **LGPD** (Lei Geral de Proteção de Dados) - Brazil's data protection law, close to the GDPR. Here: it shapes the signup consent, the user data export and how medical and payment data are stored.
[^crmv]: **CRMV** (Conselho Regional de Medicina Veterinária) - the regional council every Brazilian vet must be registered with. Here: a vet can only take bookings after their CRMV registration is verified.
[^ics]: **ICS** (iCalendar) - the standard calendar file format read by Google, Apple and Outlook calendars. Here: it keeps the vet's agenda and their personal calendar in sync both ways.
[^pix]: **PIX** - Brazil's instant payment system, run by the Central Bank and paid by QR code or key in seconds. Here: it's how most Brazilians expect to pay, so checkout offers it next to cards.
[^prontuario]: **Prontuário** - Portuguese for medical record. Here: it locks once finalized, because a medical record that can be silently edited can't be trusted.
[^totp]: **TOTP 2FA** (Time-based One-Time Password) - the 6-digit codes from an authenticator app, used as a second login factor. Here: required for the admin desk, which approves vets and releases payouts.
[^aal2]: **AAL2** (Authenticator Assurance Level 2) - a session that has proven a second factor, not only a password. Here: admin database access checks for AAL2, so a stolen admin password alone opens nothing.
[^zod]: **Zod schemas** - TypeScript-first validation rules that check the shape of data at runtime and generate the types. Here: every API request is validated by the same schemas the frontend uses.
[^pii]: **PII** (Personally Identifiable Information) - data that identifies a person, such as name, email, phone or address. Here: it's scrubbed from Sentry error reports before they leave the app.
[^rls]: **RLS default-deny** (Row-Level Security) - Postgres rules that decide which rows each user can read or write; default-deny means no access until a policy grants it. Here: it's the real permission system, so a buggy API route still can't leak another user's data.
[^security-definer]: **SECURITY DEFINER** - a Postgres function that runs with its owner's privileges instead of the caller's. Here: public data such as vet profiles is exposed through narrow functions instead of opening whole tables.
[^guard-trigger]: **Guard trigger** - a database trigger that rejects changes to protected columns. Here: users can't change fields like verification status or prices, even on rows they own.
[^append-only]: **Append-only** - rows can be added but never updated or deleted. Here: the audit log, payment events and finalized medical records keep their full history.
[^forward-only]: **Forward-only migration** - schema changes are only ever added, never rolled back or edited after they've run. Here: production history stays reproducible, and every fix is a new migration.
[^webhook]: **Webhook** - an HTTP call a service makes to your server when something happens on its side. Here: a payment webhook is only a hint, and the server re-fetches the order from Pagar.me before trusting it.
[^42501]: **42501** - Postgres's "insufficient privilege" error code. Here: every request failed with it because the table grants were lost, before RLS was even evaluated.
[^idempotent]: **Idempotent migration** - a migration that gives the same result whether it runs once or several times. Here: it made a safe recovery possible after a migration half-failed in production.
[^pgrst201]: **PostgREST / PGRST201** - PostgREST turns the database into the REST API that Supabase uses; PGRST201 means a join is ambiguous because two relationships match. Here: adding one table broke queries that never mentioned it.
[^monorepo]: **pnpm + Turborepo monorepo** - one repository holding several apps and packages, with pnpm managing dependencies and Turborepo caching builds. Here: the web app and the shared types, validation and database client change together in one commit.
[^expo]: **Dormant Expo shell** - an Expo (React Native) mobile app that's set up but not developed yet. Here: it keeps native apps an option while the PWA covers mobile.
[^wcag]: **WCAG pass** - a review against the Web Content Accessibility Guidelines: contrast, keyboard use, screen readers. Here: still pending, and listed openly as a gap.
