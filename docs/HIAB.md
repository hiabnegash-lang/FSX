# Hiab — Developer Lead · Working File

Read `CLAUDE.md` first. This file is my task list and my Claude Code prompts.

## My owned tasks
| ID | Week | Due | Task |
|----|------|-----|------|
| T24 | W3 | 19 Oct | Git repo structure, branch convention, contribution guide |
| T25 | W3 | 19 Oct | Backend service skeleton and API endpoints defined |
| T30 | W4 | 26 Oct | Order submission and order storage API |
| T31 | W4 | 26 Oct | Stripe integration in test mode |
| T43 | W5 | 2 Nov | Mid-project sponsor demo |
| T49 | W6 | 9 Nov | Defect fixes from test cycle |
| T56 | W7 | 16 Nov | Demo rehearsal |
| T60 | W7 | 16 Nov | Source code package with all dependencies |

Supporting: T32/T37 (Noor, kitchen view), T34 (Perry), T40 (Jose), T50 (Ihsan, deployment).

## Standing responsibilities
- Sole channel to the sponsor. Every decision gets logged.
- Review every PR into `dev`. Nothing merges without a second pair of eyes.
- Keep `CLAUDE.md` current. It is the context every Claude Code session loads.

---

## Prompts

### T24 — Scaffold (do first)
> Read CLAUDE.md. The GitHub repo and Supabase project already exist. Scaffold a Next.js 15 App
> Router project with TypeScript, Tailwind, ESLint and Prettier into this repo. Add
> @supabase/supabase-js and @supabase/ssr with three clients in lib/supabase: browser, server, and
> an admin client that is server-only and throws if imported client-side. Add stripe and
> @stripe/stripe-js. Create the folder layout from CLAUDE.md with placeholder pages. Add
> .env.example listing key names only, a .gitignore excluding .env*.local, and CONTRIBUTING.md
> describing the branch convention, the PR template with an "RTM IDs covered" field, and commit
> style. Add a GitHub Action running lint, typecheck and build on PRs to dev and main.

Then in GitHub: create `dev`, protect `main` and `dev` (PR required), add Perry, Jose and Noor.

### T25 — API contract and stubs
> Read CLAUDE.md. Write docs/api.md defining the API contract, then stub the routes. Endpoints:
> GET menu (server component query, grouped by category with sizes); POST /api/orders (validate the
> cart with zod, recompute every price from the database, check business hours and compute the
> earliest pickup time from lead times, create the order as pending_payment, create a Stripe
> Checkout Session, return the URL); POST /api/webhooks/stripe (verify signature, on
> checkout.session.completed set payment_status paid and ticket_status received, idempotent);
> PATCH ticket status (staff and owner only, enforces the received → in_progress → ready →
> completed sequence). Return typed JSON errors. Use TypeScript types and in-memory stubs for data
> access so this works before the schema is approved.

### T30 / T31 — Orders and payment
> Implement the order and payment flow in Stripe test mode using Checkout with automatic payment
> methods so card, Apple Pay and Google Pay all work. Pass the order id as client_reference_id.
> Make the webhook idempotent — a repeated delivery of the same session must never create a second
> paid order. Add /order/[id] showing status and polling until paid. Write docs/stripe.md covering
> `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and the test card numbers.

### Review prompt (use on every PR)
> Review this diff against CLAUDE.md. Check specifically: no secrets committed; no server-only key
> imported client-side; every price recomputed server-side; money handled as integer cents; RLS not
> bypassed; and the RTM IDs in the PR description actually match what changed. Be concise.

---

## This week (7–12 Oct) — closing W2
- [ ] Chase Quincy and Charles for the text of BR-08, BR-20, BR-23, BR-24, BR-26. **This blocks everything.**
- [ ] File the two RTM change-log items with Quincy (F8 email/phone, F16 completed status)
- [ ] Confirm the 8.25% tax rate against an actual receipt
- [ ] Confirm Perry rotated the Supabase credentials and the password file is gone
- [ ] Hand Jose the design-direction brief so he isn't idle until 20 Oct
