# PR C — Kitchen board polish (SCRUM-71)

Kitchen and counter staff now see a stronger dark board header, separate cooking/ready count chips, status-colored column heading bands, larger 48 px order numbers, clear customer names and timers, and a boxed pickup time. All displayed data still comes from the existing KitchenTicket fields; no contact details, prices or payment references were added.

## Motion and action feedback

- New ticket wrapper rises/fades over 240 ms when the existing isNew flag is set.
- Ready ticket wrapper slides/fades in over 260 ms when mounted in the ready column. Existing stable ticket keys preserve the wrapper across unchanged polls, so the animation does not restart on refresh.
- The late pulse remains on the inner article while entrance motion belongs to an outer wrapper, preventing the two animations from competing for the same animation property.
- Each card still has exactly one action button and no cancellation control. Existing 64 px minimum height, disabled behavior and visible focus remain. An inline icon, aria-busy, blue saving background, and 150 ms pressed feedback reinforce the existing Saving label without changing its handler or state.
- Reduced-motion styling explicitly sets all new kitchen animation names to none, including the retained late pulse. The existing global reduced-motion transition treatment remains.

## Accessibility and responsive review

- Status labels remain text and now include decorative inline icons; no status relies on color alone.
- All new icon SVGs are aria-hidden and nonfocusable. No extra keyboard stops were introduced.
- Existing contrast-checked tokens are reused. Dark header uses paper/cream text; sound errors sit on white; the sound control uses a mustard focus outline for visibility against the dark header.
- Kitchen grid breakpoints and column counts are unchanged: one main column below lg, 2:1 cooking/ready at lg, cooking cards two across from sm. min-w-0 and wrapping protect the existing layout from long names/notes.
- Browser/tablet-distance readability, exact overflow checks, animation replay checks, pressed/saving/error behavior and reduced-motion rendering remain for the lead's browser verification.

## Preserved behavior and checks

- Polling, effects, refs, timers, state, server-clock adjustment, sorting, column assignment, new-ticket detection, sound logic, actions, refresh callbacks and late calculations remain unchanged.
- No kitchen lib/API files, tests, dependencies, permissions, sign-out, owner or customer code changed.
- Targeted ESLint, npm run typecheck and git diff --check passed.
- Main agent owns the required full checks, before/after screenshots, design documentation and PR creation.

## Lead validation

- Full lint/typecheck and all 169 tests passed.
- Source comparison confirms both components' logic before rendering is unchanged, including board polling/effects and ticket advancement handling. lib/kitchen-board.ts, lib/kitchen-api.ts and their tests are untouched.
- Browser verified 375 / 1024 / 1440 px with no horizontal overflow, exactly one action per ticket and no cancel/contact/payment information.
- Browser verified Saving disables the sole action, one PATCH advances the ticket into Ready, Ready entrance node remains stable on repeated polls, and newly arriving tickets use the rise animation.
- Browser verified cooking-late pulses while overdue Ready does not become late, hidden polling pauses, visibility resumes immediately, and connection failure retains the last tickets.
- Reduced-motion emulation disables all kitchen entrance/saving/late animation. Phone/tablet/desktop before-and-after screenshots captured with fixture data; finite animations fast-forwarded for settled screenshots.
- Final production build passed with FSX_DATA_SOURCE=supabase.
