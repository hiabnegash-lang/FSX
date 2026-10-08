# Contributing — Menciu's Chopstix Ordering System (FSX)

Hard deadline: **17 Nov 2026**. No code or documentation changes after this date.

## Branches

```
main   ← releases only (protected, PR required)
dev    ← integration branch (protected, PR required)
feature/<name>-<desc>   ← your work
```

- Branch from `dev`: `feature/<name>-<desc>`, e.g. `feature/noor-kitchen-board`, `feature/perry-menu-seed`.
- Open a PR into `dev`. `dev` merges to `main` for releases.
- Nothing merges without a second pair of eyes. The developer lead (Hiab) reviews every PR into `dev`.

## Pull requests

CI must pass (lint, typecheck, build) before merge. Every PR uses the template in
`.github/pull_request_template.md`, including the **RTM IDs covered** field (F1–F30).
The IDs must match what actually changed.

## Commit style

Short imperative subject, 72 characters or fewer, with an optional prefix:

```
feat: add pickup-time picker to checkout
fix: recompute tax from settings, not constant
docs: add api contract
chore: bump supabase-js
```

## Hard rules

- **Never commit secrets.** `.env.local` is gitignored; `.env.example` lists key names only.
- `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are server-only. Never import them in a client component.
- Schema changes go through `supabase/migrations/`. Never edit the database by hand.
- Row Level Security on for every table.
- Prices are recalculated server-side from the database. Never trust a price from the browser.
- Money is integer cents. Never floats.
- An order is marked paid only by the Stripe webhook.
- Add no dependency without asking the developer lead first.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

Checks to run before pushing: `npm run lint`, `npm run typecheck`, `npm run build`.
