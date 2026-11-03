# PR D — Staff sign-in entry and sign-out (SCRUM-72)

Added a quiet customer footer Staff sign in link to /login and a reusable named SignOutButton component. The staff BoardShell header includes the button across loading, error, empty and ticket states. A new static owner layout adds the same session control across owner routes, including menu/reports, without editing those pages.

## Behavior

- Sign-out calls the existing Supabase browser client's auth.signOut and waits for a successful result before router.replace('/login') and router.refresh().
- If browser-client construction throws (for example, local stub mode without browser credentials), the button routes to /login and refreshes as requested.
- A returned sign-out error or rejected request shows a retryable message and reenables the button; it does not navigate or imply that the session was cleared.
- Busy state disables the button and shows Signing out with aria-busy. No browser role logic, owner link for staff, new fetch, guard, dependency, or authentication override was added.

## Accessibility and layout

- Navigation remains a Link; sign-out is a native button. Shared btnSecondary provides a 44 px minimum target and visible focus.
- Sign-out labels and error text are at least 18 px. Dark staff-header focus uses the existing mustard token; its error message uses a white panel with contrast-checked dark red text.
- Decorative SVG is hidden from screen readers and nonfocusable. Sign-out errors use role=alert.
- Header/footer groups wrap on narrow screens. New owner layout leaves each route's existing main landmark intact.
- No animation was added. Existing CSS reduced-motion behavior remains unchanged.

## Scope and verification

- Changed only new components/sign-out-button.tsx, new app/owner/layout.tsx, the staff board import/render, and customer footer link.
- Owner-to-kitchen dashboard navigation remains unchanged. Owner menu/reports source, lib/auth.ts, middleware, login routing, Supabase browser client and API code were not edited.
- Main agent owns handler tests, browser success/error/fallback/keyboard checks, phone/desktop screenshots, full lint/typecheck/build/tests, documentation and PR creation.

## Lead validation

- Added four meaningful handler tests: await success/disable repeat taps, unavailable-client fallback, returned-error retry and rejected-request retry. They use mocked clients and verify failures do not navigate or leak private service messages.
- Full lint/typecheck and all 173 tests passed.
- Browser verified the footer link, staff/owner sign-out navigation to /login in isolated local stub sessions, shared header across dashboard/history/detail/menu/reports, 44 px controls, and 375/1440 px without overflow.
- Browser verified staff have no owner navigation on the board and are still denied owner history. Keyboard Tab reaches Sign out with a visible 2 px outline; reduced-motion emulation reduces its transition to 0.00001 seconds.
- Auth, middleware, login, existing Supabase client and owner menu/report source are unchanged. No browser role logic or new dependency.
- Before/after screenshots: docs/screenshots/SCRUM-72. Live signed-in production account sign-out was not exercised; Supabase success/failure boundaries are covered by handler tests.
- Final production build passed with FSX_DATA_SOURCE=supabase. All 173 tests, lint and typecheck passed after final test cleanup.
