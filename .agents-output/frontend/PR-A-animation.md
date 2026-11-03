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

## Lead integration and validation

- Integrated large stage artwork into the customer order page and compact artwork into the redesigned header status link.
- Added one customer-layout status provider. It consumes the existing order-page responses on that route and owns one shared refresh elsewhere. The user explicitly approved header status refresh after the original no-new-header-requests constraint was raised.
- Header refresh pauses on hidden tabs, resumes when visible, stops for terminal states, aborts obsolete requests, and labels unavailable status honestly. Only the order ID, number, and statuses are retained in memory; no extra customer information is stored.
- Original order-page polling block compared byte-for-byte to origin/dev and remains unchanged. Header changes limited to two responsive breakpoint classes to avoid tablet crowding.
- Lint and typecheck passed; all 169 tests passed, including malformed/mismatched status and unpaid/cancelled-state regression checks.
- Browser checked all four stage illustrations and header labels, one nonrepeating 400 ms wok animation, no header requests on the order page, no duplicate requests between responsive links, menu updates, hidden pause and visibility resume, explicit failure labeling, 44 px target, and no overflow at 375/640/768/1024/1440 px.
- Reduced-motion browser check confirms animation-name: none for every illustration group. Screenshots saved in docs/screenshots/T29-v2.
- Production build passed with FSX_DATA_SOURCE=supabase; no application production-mode override was added.
