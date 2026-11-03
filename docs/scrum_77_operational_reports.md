# SCRUM-77 / T39 — operational reports

Scope follows docs/PERRY.md's T39 brief: daily sales, paid-order count, average order value, top 10 items by quantity and revenue, and orders by hour. RTM/sponsor confirmation remains pending; the Jira acceptance criterion requires agreed RTM scope and a merge into dev before Done.

`/owner/reports` and all CSV exports require an active owner login. Choose Today, Last 7 days, Last 30 days (default), or an inclusive custom range of up to 366 days. All dates/hours are America/Chicago, including DST. Apply dates or refresh for current figures. Every report/export is labelled Online orders only.

Sales and average order value exclude tax; Collected includes tax. Only paid, non-cancelled orders with a recorded payment date count. Stripe refunds are managed outside the app; the owner must cancel the corresponding ticket to exclude it. Item sales use historical line prices/names, not the current menu. Item quantities aggregate across sizes; combo halves are not separate sales. Empty dates and hours show zero.

The security-invoker RPC aggregates under the authenticated session and RLS in a single database snapshot. It returns aggregates only, without customer information, and does not inherit PostgREST's row limit. CSV exports contain all matching aggregate rows, with formula-safe owner-controlled names. Apply the migration through the reviewed deployment process before hosted use.

UI follows Shopify's date-range + summary + drilldown pattern. SVG/HTML charts reuse existing tokens and expose exact values; no chart package or other dependency added. This intentionally avoids the brief's suggested Recharts dependency because the repository requires approval for new packages.

## Project lessons

- Report by `payments.paid_at`, not order creation or requested pickup.
- Exclude cancelled tickets in every aggregation, not just the summary.
- Keep date filters inclusive in Central and perform timezone conversion in PostgreSQL.
- A security-invoker reporting function still needs an explicit owner check because staff can read operational columns.
