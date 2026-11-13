# Order-ready email (SCRUM-87 / RTM F31, BR-28)

When a kitchen or counter user moves a ticket to **Ready**, the customer gets **one** email saying their order is
ready for pickup. It is sent by our server through [Resend](https://resend.com); the browser never sees the
address, and staff and owner sessions still cannot read it (BR-20).

## What the customer gets

- Subject: `Your order #### is ready for pickup`.
- Their name, the order number, the pickup time they chose (Houston time), the pickup address, and a link to their
  order page when `NEXT_PUBLIC_SITE_URL` is set. No prices, no payment details.
- A plain-text and an HTML version. The customer's name is HTML-escaped.
- Sent from `EMAIL_FROM` (default `Menciu's Chopstix <no-reply@chopstixhouston.com>`, the domain verified in Resend).

## How it works

1. `PATCH /api/orders/{id}/ticket` changes the ticket. If the new status is `ready`, it then calls
   `notifyOrderReady` (`lib/notify-ready.ts`).
2. `notifyOrderReady` does nothing if `RESEND_API_KEY` is not set. Otherwise it reads the contact details with the
   service role, but only for an order that is Ready and has no `email_sent_at` yet.
3. It sends the email (`lib/ready-email.ts`, a single `fetch` to Resend, 5 second timeout) with the header
   `Idempotency-Key: order-ready/<order id>`. Resend ignores a repeat of that key for 24 hours.
4. On success it sets `orders.email_sent_at`, so the order is never emailed again.

## Safety rules

- **It can never block the kitchen.** The function never throws and never undoes the ticket change. If Resend is
  down or slow, the ticket is still Ready.
- **Off by default.** No key, no email, no error. Merging this changes nothing until the key is added.
- **No retry.** A failed send is logged as `Order-ready email was not sent; no automatic retry` with the order id
  only, and `email_sent_at` stays empty so the failure is visible. Staff can phone the customer.
- **No personal data in logs.** Logs hold the order id, a stage and an HTTP status, never the name or address.
- **No new npm dependency.** It uses `fetch`, so `package.json` does not change.

## Turning it on (the sponsor approved Resend on 12 Nov 2026)

1. In Resend: the sending domain `chopstixhouston.com` is already verified. Create a **sending-only** API key.
2. In Vercel, add `RESEND_API_KEY` for **Production** (and Preview if you want to test there). Optionally add
   `EMAIL_FROM`. Keep the key out of git and documents.
3. Redeploy (the server reads the key at runtime, but a redeploy applies the new variable to the running build).
4. Check `NEXT_PUBLIC_SITE_URL` is the production address so the link in the email is right.
5. Test: place a test order (Stripe test card) with an email address you own, move the ticket to Ready on `/staff`,
   and check the inbox. Resend's dashboard (Emails) shows the delivery.

## Limits

- Only the step into Ready sends. An order marked Ready before the key was added is not emailed afterwards.
- One attempt per Ready step. There is no resend button yet.
- The pickup address is the same text as the site footer; change both if the restaurant moves.
- Hours are not in the email, because they live in the database settings (BR-27).
