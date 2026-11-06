# Cart and checkout UI polish — T29

The cart now pairs compact item rows with a separate receipt summary on desktop; the summary sticks alongside a longer item list. Rows use menu code chips, clearer item names and totals, one shared quantity control, and quieter Edit/Remove actions. Empty/loading/unavailable states retain their behavior with clearer presentation. Checkout places the form first in both document and mobile reading order and the summary alongside it on desktop. Customer details, pickup lead time and payment action have distinct visual hierarchy.

## Shared presentation

- New pure CheckoutSteps component labels Cart, Pickup details and Payment. Only the previous Cart step links to a real route; future payment is plain text, and the current step has aria-current.
- Added shared btnQuiet, quantityButton and orderPanel styles to lib/ui.ts. Existing exports are unchanged. Quiet actions retain 44 px targets and visible focus; quantity minus/plus are each 44 × 44 px minimum. Main checkout actions and form inputs have stronger sizing.
- Existing cream, red, blue, ink and paper tokens and typography are reused. No assets, dependencies, new colors or CSS animations were added. Existing reduced-motion handling also covers the brief shared hover/press transitions.
- On narrow screens, panels stack naturally and text/notes wrap. Desktop cart and checkout summaries use sticky positioning only from lg upward. The checkout form comes before its summary in the DOM so keyboard order follows the visual mobile order.
- Error descriptions, roles and focus targets are retained. The customer-facing total note explains that the final total is confirmed at Stripe without exposing server implementation details.

## Behavior retained

- All cart edit/remove/clear callbacks and focus restoration IDs are unchanged, including edit Save/Cancel, neighbor selection after removal, and empty-cart focus.
- Quantity lower/upper limits, unavailable selections and closed-ordering disabling are unchanged.
- CartTotals still uses the existing integer-cent tax and formatting functions with unchanged computations.
- Checkout state, effects, validation, customer field names/labels/IDs and attributes, pickup constraints, business-hour and catering lead rules, submission guard, payload, persistence, error focus and back-forward restoration are unchanged.
- The merged customer account hook, email-prefill effect and email defaultValue remain unchanged.
- No API, reducer, authentication, database, pricing logic, site header or availability logic was changed.

## Checks and ownership

- Targeted ESLint passed across the six changed/new source files.
- npm run typecheck and git diff --check passed.
- Main agent owns browser flow checks, responsiveness, before/after screenshots, full lint/build/tests and PR creation. No browser verification claim is made in this implementation note.

## Lead verification

- Full lint/typecheck and all 217 existing tests passed. No new dependencies or behavioral tests that mirror styling were added.
- Parsed/tokenized source comparisons confirm cart/checkout event handlers, effects, submission and focus helpers remain unchanged after formatting. Cart, pricing, checkout, accounts, auth and API logic modules are untouched.
- Browser checked 375/768/1440 px with no horizontal overflow and 44 px minimum navigation/control targets. Desktop cart summary is sticky; a 200-character unbroken note wraps on a phone.
- Browser checked quantity decrement/increment and 1/50 caps; Save/Cancel edit with focus restoration; remove-neighbor focus; clear/empty; persistence; required-field error focus; disabled busy fields; server error with preserved cart/contact values; and closed-hours disabling.
- Browser checked 15-minute regular and 40-minute mixed-catering pickup constraints. Mocked order payload contains customer, pickup and selections, with no client prices/tax/total. One intercepted success response redirected to a mocked Stripe page; no real order or payment was created.
- Reduced-motion browser check confirms quantity-control transition duration reduces to 0.00001 seconds. Existing contrast-checked brand tokens are reused without new colors.
- Before/after screenshots use matching A1/A2/A3 fixtures ($13.50 subtotal, $14.61 total) and a Friday-noon client clock, saved in docs/screenshots/cart-checkout. Additional empty/error phone screenshots are included.
- Final production build passed with FSX_DATA_SOURCE=supabase; all 217 tests, lint and typecheck passed after final formatting.
