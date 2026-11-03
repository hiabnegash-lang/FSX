# PR A stage artwork

Added only `app/(customer)/order-stage-art.tsx`: decorative inline SVG artwork for each customer order stage. No dependencies, data access, animation timers, or changes to existing components.

Usage:

```tsx
<OrderStageArt stage="in_progress" />
<OrderStageArt stage="ready" compact />
```

`OrderArtStage` exports the four supported stage names. The default artwork is 140 × 110 CSS pixels, compact artwork is 40 × 32, and both use a 160 × 124 viewBox. `aria-hidden` and `focusable="false"` keep this supplementary artwork out of the accessibility tree and keyboard order. Pair it with visible status text.

## Illustration and animation hooks

All fills and strokes use existing theme token classes. The outlined shapes match the printed-menu sticker style. The root has `.order-stage-art` and `data-stage` and is keyed to `stage`, so its illustration subtree is recreated only on stage change, not on a poll with unchanged status.

| Stage | Picture | Groups to animate once on stage entry |
| --- | --- | --- |
| `received` | Paper receipt with a tilted paid check stamp | `.order-art-receipt`: brief settle; `.order-art-stamp`: check/stamp pop |
| `in_progress` | Curved blue wok, long handle, tossed ingredients, red steam | `.order-art-wok`: brief pivot; `.order-art-food`: short toss arc; `.order-art-steam`: rise/fade |
| `ready` | Mustard takeaway bag, blue handle and red bowl mark | `.order-art-bag`: small settle; `.order-art-ready-rays`: short reveal |
| `completed` | Takeaway bag with a large blue check on a cream seal | `.order-art-thanks`: seal settle; `.order-art-check`: reveal; `.order-art-farewell`: brief reveal |

Main agent owns CSS and integration. Recommended transform-box: fill-box and sensible transform-origin for groups; 150–400 ms, one iteration, no loops, with reduced-motion disabling animation. No animation or CSS was introduced here, so every stage is already meaningful as a still image. Simplify or omit secondary ray/steam motion in compact display if desired.

## Verification

- Decorative SVG semantics and nonfocusable presentation checked by source review.
- Responsive size contract provided; browser preview remains with the main agent after integration.
- Text contrast is unaffected; all status meaning remains in adjacent text.
- No changes to polling, storage, APIs, protected files, or other contributors' edits.

## Optical alignment refinement

The receipt's body originally ended at y=101 while the wok and bags ended at y=106–107. Shifted the complete receipt illustration left 5 viewBox units and down 6 so its visual weight sits near x=80 and its lower edge shares the y=107 baseline. The ground shadow remains centered at x=80/y=111 for every stage. The wok's handle extends right intentionally; its bowl remains left of center so the full silhouette is balanced. Bag and completion geometry already shared the baseline and required no repositioning.

Added block display to avoid an inline SVG text-baseline gap in non-flex contexts. Compact artwork now uses a 4-unit base outline (1 CSS pixel at compact size) rather than a 3-unit outline, improving phone readability without adding detail or changing the viewBox.

The user's later request explicitly allows continuous animation on the customer's phone; that supersedes the earlier once-on-entry recommendation above. Main agent owns looping CSS, hidden-page pausing, layout alignment, and reduced-motion handling. Keep the receipt's new outer static translation separate from animated child groups so CSS transforms preserve the alignment adjustment.

## PR 30 customer control revision

Removed the customer-facing pause/play controls and their shared manual state at the user's explicit request. The header status chip is one complete navigation Link again, with decorative artwork. The order page keeps its centered artwork wrapper. Automatic animation pausing while the document is hidden remains; reduced-motion CSS, animation timing, polling, and status refresh logic are unchanged.

## Lead integration and validation

- Integrated large stage artwork into the customer order page and compact artwork into the redesigned header status link.
- Added one customer-layout status provider. It consumes the existing order-page responses on that route and owns one shared refresh elsewhere. The user explicitly approved header status refresh after the original no-new-header-requests constraint was raised.
- Header refresh pauses on hidden tabs, resumes when visible, stops for terminal states, aborts obsolete requests, and labels unavailable status honestly. Only the order ID, number, and statuses are retained in memory; no extra customer information is stored.
- Original order-page polling block compared byte-for-byte to origin/dev and remains unchanged. Header changes limited to two responsive breakpoint classes to avoid tablet crowding.
- Lint and typecheck passed; all 169 tests passed, including malformed/mismatched status and unpaid/cancelled-state regression checks.
- Browser checked all four stage illustrations and header labels, one nonrepeating 400 ms wok animation, no header requests on the order page, no duplicate requests between responsive links, menu updates, hidden pause and visibility resume, explicit failure labeling, 44 px target, and no overflow at 375/640/768/1024/1440 px.
- Reduced-motion browser check confirms animation-name: none for every illustration group. Screenshots saved in docs/screenshots/T29-v2.
- Production build passed with FSX_DATA_SOURCE=supabase; no application production-mode override was added.

## Continuous motion and alignment revision

- The user explicitly requested continuous animation, replacing the original one-time-animation constraint. Stage artwork now loops every 2.4–3.6 seconds, with a short gesture and quiet hold. Existing stage keys avoid restarts on unchanged status responses.
- Receipt geometry now shares the other illustrations' baseline and optical center; compact strokes are clearer. Mobile order-page artwork is centered. Local gallery rows share heading, illustration, chip, description and button alignment.
- Both header artwork and the order page have 44 px pause/play controls. They share state through the existing customer provider. Motion pauses while hidden; reduced motion disables artwork animation entirely.
- Browser verified gallery row alignment, infinite animation continuing beyond a cycle, shared pause/play behavior, reduced-motion static artwork, and 375/640/768/1024/1440 px without overflow. Lint, typecheck and all 169 tests passed.
- Updated screenshots: docs/screenshots/T29-v3. Original order-page polling remains unchanged.
- Production build passed after the continuous-motion revision (FSX_DATA_SOURCE=supabase).

## Removal of manual animation controls — lead validation

Removed customer-facing pause/play controls and manual motion state as requested. The whole header chip is a single navigation link again. Continuous animation, automatic hidden-tab pausing/resume and reduced motion remain intact. Browser verified no manual controls in either customer location, an animated whole-chip link with a 44 px target, hidden/visible behavior, reduced-motion static artwork and five widths (375–1440 px). Lint, typecheck and all 169 tests passed. Updated screenshots: docs/screenshots/T29-v4.
