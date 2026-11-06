# PR A — Customer order tracker (T29)

Implemented the approved customer journey using the existing brand tokens, typography, shared button style, and order data. The tracker shows Paid, Being prepared, Ready for pickup, and Picked up. Completed steps have checkmarks and text; the current step is labeled and receives the existing 220 ms pop animation. Connector fills transition for 300 ms as the order advances. The layout is vertical below 640 px and horizontal above it.

Pending payment, expired checkout, and cancelled orders keep their existing explanatory messages and show no tracker. The receipt groups requested pickup time, quantities and item options, instructions, and totals into a card. The shortcut uses the shared secondary button style with a decorative receipt icon and no new requests or status assumptions.

## Accessibility review

- Semantic structure: pass by source review; ordered steps, section headings, receipt totals in a description list, and navigation remains a Next Link.
- Status beyond color: pass by source review; labels, Complete/Current step/Up next text, checkmarks, and aria-current identify state.
- Screen reader announcements: pass by source review; exactly one live region in OrderStatus includes headline, description, and connection errors. Receipt and tracker do not independently announce duplicate updates.
- Focus and tap target: pass by source review; shared btnSecondary supplies a 44 px minimum height and visible focus outline. No new interactive tracker controls.
- Contrast: existing dark brand blue/ink/muted on paper, white on brand blue, and dark blue/yellow-ink on tile-yellow use existing tokens. Browser and calculated contrast verification remains for the lead's review.
- Reduced motion: source review confirms existing final prefers-reduced-motion rule disables the reused pop animation and new transition. Browser verification remains for the lead.
- Responsive: classes provide a 375 px vertical tracker, wrapping item names, flexible receipt widths, and horizontal tracker at 640 px. Actual screenshots/overflow checks remain for the lead.

## Checks and scope

- Targeted ESLint passed.
- npm run typecheck passed after the final JSX narrowing cleanup.
- git diff --check passed.
- All polling effects, timers, final-state handling, cart cleanup, local storage behavior, and server page reads remain unchanged.
- Changed only order-status.tsx, last-order-link.tsx, and minimal tracker CSS. page.tsx required no changes.
- No dependencies, API, auth, payment logic, schema, footer, owner, kitchen, or conflicting account-PR files changed.
- Full project lint/build/tests, rendered state coverage, screenshots, commit, and PR are left to the lead as assigned. No further writes after this report.

## Lead validation

- Full lint and typecheck passed; production build passed with FSX_DATA_SOURCE=supabase (stub mode is intentionally refused in production).
- All 166 existing Node tests passed.
- Source comparison confirmed the polling effects and final-state logic are byte-for-byte unchanged.
- Contrast calculations: blue/paper 10.27:1, muted/paper 5.74:1, ink/paper 17.49:1, blue/yellow 8.28:1, yellow-ink/yellow 5.58:1, red/paper 4.98:1.
- Captured original and updated phone (375 px) and desktop (1440 px) screenshots with stub fixtures; no customer data or secrets included.
- Browser verification passed across received, in progress, ready, completed, pending payment, expired, and cancelled states using intercepted polling responses against the real rendered page. Completed and expired stop polling; special states hide the tracker.
- Browser verified 44 px shortcut height, one live region inside the order content, and no horizontal overflow at 375 px / 1440 px.
- Reduced-motion emulation verified tracker transition and pop animation durations reduce to 0.00001 s under the existing global override.
