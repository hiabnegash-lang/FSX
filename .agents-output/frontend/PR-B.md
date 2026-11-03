# PR B — Owner readability (SCRUM-73)

Owner dashboard now presents four large navigation cards: Order history, Menu and prices, Reports, and Kitchen board. Order history uses readable cards below the desktop breakpoint and a semantic table on wide screens, preserving the same server-returned orders, filtering, links, counts, and pagination. Order details emphasize customer name, pickup time, ticket status, and right-aligned totals.

## Accessibility and presentation

- Owner body, input, helper, error, confirmation, and table text is at least 18 px through text-lg or inherited sizing. Key names, order numbers and totals are larger.
- Shared back/filter/page links extend btnSecondary, retaining 44 px targets and visible keyboard focus. Filter fields have a 48 px minimum height.
- Every status badge combines its existing text label and status color with a decorative inline SVG icon. Icons are hidden from screen readers and nonfocusable.
- Mobile history uses a semantic list of cards. The desktop table retains its caption, column headers and row headers. CSS display switching keeps the inactive version out of the accessibility tree.
- Dates and money use tabular numerals. Customer names, contact values, notes and payment references wrap rather than stretching the page.
- Entry animation uses the existing brief anim-rise utility, respecting the existing reduced-motion rule. No new CSS or continuous motion.
- Calculated token contrast ratios: white/received amber 5.02:1, white/progress blue 6.70:1, white/ready green 5.02:1, white/brand blue 10.27:1, ink/white 17.49:1, muted/white 5.74:1, brand blue/tile yellow 8.28:1, yellow ink/tile yellow 5.58:1. All exceed the requested 4.5:1 for normal text.

## Preserved behavior and ownership

- Data reads, auth checks, query parsing/filter values, public error handling, final-state conditions and cancellation visibility are unchanged.
- CancelOrderButton changes are className strings only: 18 px help and confirmation copy, stronger section/card styling. Its event handlers, state, request, messages and confirmation flow are unchanged.
- Menu and reports source, staff pages, sign-in/sign-out, API routes, database, Stripe, pricing and dependencies were not changed.
- Main agent maintains the existing owner test loader's @/lib/ui import mapping because shared order-ui now reuses btnSecondary.

## Checks

- Targeted ESLint passed for all seven owned source files.
- npm run typecheck passed.
- git diff --check passed.
- Source review found no text-xs/text-sm/text-base, opacity reduction, or horizontal scrolling styles in the owner order screens.
- Main agent owns rendered keyboard/phone/tablet/desktop checks, filter/empty/error/cancel-flow checks, reduced-motion checks, full lint/build/tests, screenshots and PR creation. No claim of browser verification is made here.

## Lead verification

- Full lint and typecheck passed; all 169 Node tests passed. The owner test loader mapping was extended solely to resolve the shared button-style import.
- Browser verified dashboard/history/detail at 375 / 768 / 1440 px: every visible body text node is at least 18 px, controls are at least 44 px, and no horizontal overflow occurs.
- Browser verified four dashboard destinations, search filtering, empty results, invalid filters, out-of-range pages, Keep order without a PATCH, confirmation followed by one cancellation PATCH, and staff denial with no customer details.
- Reduced-motion emulation reduces owner entry animations to 0.00001 seconds. Contrast pairs exceed 4.5:1.
- Source comparison (normalizing line endings) confirms history/detail data-read, query and error prefixes unchanged. Removing static className strings makes the cancellation component identical to origin/dev.
- Visual review moved the desktop entrance animation from each table row to its block container to avoid washed-out row rendering. Fresh screenshots captured after animations settle.
- Final production build passed with FSX_DATA_SOURCE=supabase. Screenshot capture fast-forwards finite animations to document their settled state; final visuals reviewed.
