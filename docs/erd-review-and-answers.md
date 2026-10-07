# ERD Entities and Open Decisions — Dev Lead Review
Hiab Negash, 7 Oct 2026. Response to Charles's draft.

**Short version: Part 1 is solid. I agree with all six proposals in Part 2. Three
additions, one restructure, and one inconsistency in our own documents that has to be
fixed before this goes for approval.**

---

## Part 1 — the entity list

This is the right model. Specifically worth keeping:

- **Price lives on Item Size, not Menu Item.** This is the correct call and it is the one
  thing that would have forced a rebuild if it had gone the other way. Fried rice (sm/lg)
  and catering trays (S/M/L) both need it, and the "one regular row" convention for
  unsized items keeps every price lookup identical instead of having two code paths.
- **Order Line Component for the Combination Plate.** Correct. G1 is two half orders from
  G2–G10, and nothing else in the menu behaves that way.
- **No Ticket table.** Agreed, and the reasoning is right. A kitchen ticket is a paid order
  viewed through a filter. A second table would duplicate status and drift out of sync, and
  our five-second requirement (F15) is easier to hit reading one table than syncing two.
- **No Customer table.** Matches guest checkout (BR-09, F8).
- **Passwords handled by Supabase, not our tables.** Right, and it is what lets us answer
  the security review honestly in W6 (T47).

### Three things missing

**1. Human-readable order number.** F14 requires the customer to see an order number, and
the counter checks it at pickup. A database primary key (a UUID or a sequence) is not what
you read aloud across a counter. Order needs a separate short, unique, display order number
— something like a daily sequence or a 4–6 character code — generated at creation and
unique at least per day.

**2. Snapshot the item name, not just the price.** Order Line saves price at checkout,
which is correct. It should save the item name too. If the owner renames "Pepper Chicken"
in March, an order from February should still read the way the customer ordered it. Same
principle, same reason — one line in the table, and it prevents a confusing bug later.

**3. Where does "sold out" live?** Menu Item carries "available today," but a large tray
could be gone while the small is fine. If we want that, availability belongs on Item Size.
If the sponsor only ever sells out a whole dish, leave it on Menu Item. Worth one question
to the owner rather than guessing — but my instinct is item level is enough for this
restaurant, and size level is over-engineering.

### One restructure

**Split "Business Hours and Settings" into two entities.** They are different shapes.
Business hours is one row per day of week (day, open time, close time) — six or seven rows.
Settings is a single row, or a key/value pair, holding tax rate and the two lead times.
Merging them means either empty columns on the hours rows or repeated tax rates on every
day. An architecture reviewer will spot that, and it is a thirty-second fix now.

---

## Part 2 — answers

**1. Why save the price twice? → Yes, agree.**
Snapshot the price and the tax rate onto the order at checkout. An order is a historical
record of what the customer actually paid; a menu is the current state of the business.
They are different facts and must be stored separately. Without this, a price change in
week five silently rewrites October's sales reports. Add the item name to the snapshot per
the note above.

**2. What does "remove a menu item" mean? → Yes, hiding, and the two switches are right.**
Never hard-delete anything referenced by an order. Two independent flags:
- *Sold out today* — temporary, flipped often, the owner's "86 this item" button (F27).
- *Off the menu* — permanent, hides it from the customer menu forever but keeps it readable
  in order history and reports.
They are genuinely different actions and conflating them would frustrate the owner.

**3. Order statuses → Yes, we need "waiting for payment," and I'd split this into two
columns.**

We need the pre-payment state for two reasons. We must create the order row *before*
redirecting to Stripe so there is an ID to attach the payment to, and the kitchen query has
to be able to exclude it. Without that state we cannot tell an abandoned checkout from a
real order.

My recommendation is two separate columns rather than one list:
- **Payment status:** waiting for payment → paid → refunded / cancelled
- **Ticket status:** (null until paid) → received → in progress → ready → completed

One combined column creates states that should be impossible, like "ready" on an unpaid
order. Two columns make the rule enforceable in the database: ticket status stays empty
until payment status is paid. It also means the kitchen view filters on one clean condition.

Charles's call as architect — but if we keep one column, we need a check constraint doing
the same work.

Note the last value: **completed**, set when the order is handed over. That is new since
this draft was written (see Issue #2 below).

**4. One payment, one order → Yes, agree, and this is not optional.**
A unique constraint on the Stripe session or payment reference. Stripe will retry a webhook
if our endpoint is slow or errors, so duplicate delivery is expected behavior, not an edge
case. The database constraint is the backstop that makes the webhook safe to retry. This
also satisfies the reliability requirement we wrote into the RTM (non-functional 4.02).

**5. Mixed orders and lead time → Yes, the longer one.**
If any line on the order is a catering tray, the whole order takes 40 minutes. The kitchen
can only hand over a complete order, so the slowest item sets the pace. Store the computed
earliest pickup time on the order so the rule is recorded, not recalculated.

**6. The "order ready" email → Yes, the simple option.**
An "email sent at" timestamp on the order. One email, one order, and a null means it has
not gone yet. A separate table would only earn its place if we later send several kinds of
email. We are not, and we have seven weeks.

---

## Still open

**Issue #1 — phone or email?**

Both, and this exposes a contradiction in our own documents that must be fixed before
submission:

- RTM **F8** says checkout collects **name and phone number**.
- The to-be process diagram and the scope diagram show checkout collecting **email**,
  because we decided the customer gets an order-ready email.

Both cannot stand. My answer: **email required** (the notification depends on it), **phone
optional** (useful when the kitchen needs to reach someone about an order, and your parents
will want it). I will raise the F8 correction with Quincy through the change log, since the
RTM has gone out.

**Issue #2 — who closes a picked-up order?**

Settled with Charles on 6 Oct: **the cashier/counter bumps it out.** Since counter and
kitchen share one view and one staff role, the system records it as that role; which
person taps it is the restaurant's procedure, not a system distinction. The owner can also
close an order from the dashboard, which is how no-shows get cleared.

This is what adds the **completed** ticket status in question 3. It also means F16 in the
RTM, which lists only three ticket states, needs the fourth added — another change-log item
for Quincy.

**Issue #3 — the five proposed rules.**

BR-08, BR-20, BR-23, BR-24 and BR-26 are still not written down anywhere I have access to.
Charles and Quincy: send the text of these five and I will give a yes or no on each the
same day. This is now the only thing blocking the ERD, and it blocks the 12 Oct approval
gate, which in turn blocks Perry's database build (T23).

---

## Summary of what changes in the ERD

| Change | Where |
|---|---|
| Add display order number | Order |
| Add item name snapshot | Order Line |
| Split into Business Hours + Settings | People and settings |
| Add "completed" ticket status | Order status values |
| Split payment status from ticket status (recommended) | Order |
| Decide availability level: item or size | Menu Item / Item Size |

## Changes needed in the RTM (through the change log)

- **F8** — checkout collects name, email (required) and phone (optional), not name and phone.
- **F16** — ticket states are received, in progress, ready, **completed**.
