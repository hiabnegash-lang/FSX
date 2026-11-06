# Menciu's Chopstix: Online Ordering System (FSX)

Online pickup ordering for Menciu's Chopstix, a family-owned Chinese-American restaurant at
6755 Hillcroft St, Houston. Built by Team 09, Fusion Solutions Experience (XP), CIS 4375, Fall 2026.

One Next.js application serves three surfaces:

| Surface                                                  | Who                        | Where                                        |
| -------------------------------------------------------- | -------------------------- | -------------------------------------------- |
| Customer ordering: menu, cart, checkout, order status    | Public, no account needed  | `/menu`, `/cart`, `/checkout`, `/order/[id]` |
| Kitchen and counter ticket board                         | Role `staff` (and `owner`) | `/staff`                                     |
| Owner dashboard: order history, menu and prices, reports | Role `owner`               | `/owner`                                     |

Payments go through **Stripe Checkout**; card details never reach our servers. Data, staff login
and row-level security are in **Supabase**. The app is hosted on **Vercel**.

## Requirements

- Node.js 22 (the version CI uses) and npm
- A Supabase project (the team project ref is `csvuhyeplcxvzlvkduwj`)
- A Stripe account in **test mode**, and the [Stripe CLI](https://stripe.com/docs/stripe-cli) for local webhooks
- Docker Desktop, only if you want a local Supabase database

## Install and run locally

```bash
git clone https://github.com/hiabnegash-lang/FSX.git
cd FSX
npm ci
cp .env.example .env.local     # then fill in the values (see below)
npm run dev                    # http://localhost:3000
```

To look at the screens without any keys, set `FSX_DATA_SOURCE=stub` in `.env.local`. The app then
uses built-in sample data, and in development `POST /api/dev/seed` adds sample orders. In stub mode
there is no real login: send the header `x-stub-role: staff` or `x-stub-role: owner` to API routes.
Stub mode is refused in production.

Checks (the same ones CI runs on every pull request):

```bash
npm run typecheck
npm run lint
node --test "tests/*.test.mjs"
npm run build
```

## Environment variables

`.env.example` lists every variable by **name only**. Put real values in `.env.local` locally (it is
gitignored) and in the Vercel project settings for deployments. Never commit a real key.

| Variable                             | Where it is used   | Notes                                                                                                                                                                                  |
| ------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FSX_DATA_SOURCE`                    | Server             | `supabase` (default) or `stub` for local sample data                                                                                                                                   |
| `NEXT_PUBLIC_SUPABASE_URL`           | Browser and server | `https://<project-ref>.supabase.co`, no quotes or trailing path                                                                                                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Browser and server | Public anon (publishable) key                                                                                                                                                          |
| `SUPABASE_SERVICE_ROLE_KEY`          | **Server only**    | Bypasses row-level security; never in a `NEXT_PUBLIC_` variable or client component                                                                                                    |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Browser            | `pk_test_…` in test mode                                                                                                                                                               |
| `STRIPE_SECRET_KEY`                  | **Server only**    | `sk_test_…` in test mode                                                                                                                                                               |
| `STRIPE_WEBHOOK_SECRET`              | **Server only**    | `whsec_…`; different for `stripe listen` and for each deployed endpoint                                                                                                                |
| `STRIPE_SITE_TAG`                    | Server             | Required. Unique per environment (for example `local-jose`, `vercel-prod`) so a shared Stripe test account's webhooks only act on their own orders. Payments stay off until it is set. |
| `NEXT_PUBLIC_SITE_URL`               | Server             | Base URL used for Stripe return links, for example `http://localhost:3000`                                                                                                             |

## Supabase setup

All schema changes are migrations in `supabase/migrations/`; never edit tables by hand. Row-level
security is on for every table. The CLI runs through `npx` and is pinned to the version CI uses.

**New project:**

```bash
npx --yes supabase@2.78.1 login
npx --yes supabase@2.78.1 link --project-ref <project-ref>
npx --yes supabase@2.78.1 db push --linked --dry-run --include-seed   # review first
npx --yes supabase@2.78.1 db push --linked --include-seed
```

`supabase/seed.sql` loads the menu categories, items, sizes and prices, business hours and the
settings row (8.25% tax, 15- and 40-minute lead times). Later menu additions are migrations. It inserts missing rows only and never overwrites owner edits.

**Local database (Docker):**

```bash
npx --yes supabase@2.78.1 start
npx --yes supabase@2.78.1 test db      # row-level security and constraint tests
```

**Staff and owner accounts:** there is no public sign-up for staff. Create the user in
Supabase Dashboard → Authentication → Users, then give it a role with
`insert into public.staff_users (id, role) values ('<auth user id>', 'owner');` (or `'staff'`).
Turn an account off with `update public.staff_users set active = false where id = '<id>';`.

More detail: [`docs/database-setup.md`](docs/database-setup.md) and
[`docs/supabase-connection.md`](docs/supabase-connection.md).

## Vercel setup

1. Import the GitHub repository into Vercel. The framework preset is Next.js; no build settings need changing.
2. In **Project → Settings → Environment Variables**, add every variable from the table above for
   each environment (Production and Preview). Use a different `STRIPE_SITE_TAG` per environment.
3. In Stripe, add a webhook endpoint `https://<your-domain>/api/webhooks/stripe` for the events
   `checkout.session.completed`, `checkout.session.expired`,
   `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`, and put
   that endpoint's signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Redeploy after changing any variable.

The team's Supabase project is connected to GitHub with production deploys from `main`, so apply and
check every migration with a dry run **before** merging `dev` into `main`.

## Stripe: test mode and live mode

The project runs in **test mode**. Test keys start with `pk_test_` and `sk_test_`, no real money
moves, and you pay with test cards such as `4242 4242 4242 4242` (any future expiry, any CVC).
Local webhooks:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # prints a whsec_ secret for .env.local
```

An order is marked paid **only** by a verified `checkout.session.completed` webhook whose amount
matches the order, never by the browser. Repeated webhook deliveries are ignored safely.

**Going live** is the restaurant's decision and needs their own Stripe account to be activated. Then:
switch the Stripe dashboard to live mode; replace the three Stripe variables in Vercel Production
with the live `pk_live_…`, `sk_live_…` and the live endpoint's `whsec_…`; create the live webhook
endpoint as in step 3 above; redeploy; and place one small real order and refund it from the Stripe
dashboard to confirm. Refunds are always issued in Stripe's dashboard, after which the owner marks
the order cancelled in our dashboard. No code changes are needed.

More detail, including test cards and the replay check: [`docs/stripe.md`](docs/stripe.md).

## Project layout

```
app/
  (customer)/        menu, cart, checkout, order/[id]
  staff/             kitchen and counter ticket board
  owner/             order history, menu and prices, reports
  api/               orders, Stripe webhook, staff and owner APIs
lib/                 data store, Supabase and Stripe clients, pricing, validation
supabase/            migrations, seed.sql, database tests
tests/               Node tests (node --test)
docs/                API contract, setup guides, ERD, menu.csv
scripts/             menu seed generator, deliverables packager
```

## Team workflow

Branch from `dev` as `feature/T<id>-<name>-<desc>` or `fix/T<id>-<name>-<desc>`, start each commit
with the task ID, and open a pull request into `dev`. A PR needs one approval and green CI.
`dev` merges into `main` only at milestones. Full rules: [`CONTRIBUTING.md`](CONTRIBUTING.md).
Project context for every Claude Code session: [`CLAUDE.md`](CLAUDE.md).

## Final deliverables

`npm run package:deliverables` builds the source code zip and one commit-history file per team
member from a chosen branch (default `origin/main`). See the comment at the top of
[`scripts/package-deliverables.mjs`](scripts/package-deliverables.mjs).
