import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";
import { loadModule } from "./helpers/load-module.mjs";

// The owner dashboard and the kitchen board hold no data themselves, but a signed-out visitor must be sent
// to /login by the server instead of seeing the page frame (SCRUM-87, found in the 9 Nov live check).
const require = createRequire(import.meta.url);
const next = require("next/server");
const jsx = require("react/jsx-runtime");
const { renderToStaticMarkup } = require("react-dom/server");
const errors = loadModule(new URL("../lib/errors.ts", import.meta.url), { "next/server": next });

function signal(kind, target) { return Object.assign(new Error(kind), { kind, target }); }
const navigation = { redirect: (target) => { throw signal("redirect", target); } };
const link = { default: ({ href, children, ...props }) => jsx.jsx("a", { href, ...props, children }) };
const BOARD_MARKER = "kitchen-board-rendered";
const board = { KitchenBoard: () => jsx.jsx("div", { children: BOARD_MARKER }) };

// Real lib/auth in stub mode: the role comes from the x-stub-role header, no header means signed out.
function authWith(error = null) {
  const real = loadModule(new URL("../lib/auth.ts", import.meta.url), {
    "./errors": errors, "./data/mode": { usingStub: () => true },
    "./supabase/server": { createClient: async () => { throw new Error("not used in stub mode"); } },
  });
  if (!error) return real;
  return { ...real, requireRole: async () => { throw error; } };
}

function ownerPage(role, auth = authWith()) {
  const headers = new Headers(role ? { "x-stub-role": role } : {});
  return loadModule(new URL("../app/owner/page.tsx", import.meta.url), {
    "react/jsx-runtime": jsx, "next/link": link, "next/headers": { headers: async () => headers },
    "next/navigation": navigation, "@/lib/auth": auth, "@/lib/errors": errors,
  }).default;
}

function staffPage(role, auth = authWith()) {
  const headers = new Headers(role ? { "x-stub-role": role } : {});
  return loadModule(new URL("../app/staff/page.tsx", import.meta.url), {
    "react/jsx-runtime": jsx, "next/headers": { headers: async () => headers },
    "next/navigation": navigation, "@/lib/auth": auth, "@/lib/errors": errors, "./kitchen-board": board,
  }).default;
}

test("owner dashboard sends signed-out visitors to /login before rendering anything", async () => {
  await assert.rejects(ownerPage(null)(), (error) => error.kind === "redirect" && error.target === "/login");
});

test("owner dashboard tells staff it is owner only and shows no owner links", async () => {
  const html = renderToStaticMarkup(await ownerPage("staff")());
  assert.match(html, /Owner access required/);
  assert.match(html, /href="\/staff"/);
  assert.doesNotMatch(html, /Order history|Menu and prices|Reports/);
});

test("owner dashboard renders its links for the owner", async () => {
  const html = renderToStaticMarkup(await ownerPage("owner")());
  for (const text of ["Owner dashboard", "Order history", "Menu and prices", "Reports", "Kitchen board"]) assert.match(html, new RegExp(text));
});

test("owner dashboard does not hide an unexpected auth failure", async () => {
  const unavailable = new errors.ApiError(503, "auth_unavailable", "Could not verify the account role.");
  await assert.rejects(ownerPage("owner", authWith(unavailable))(), (error) => error === unavailable);
  const unrelated = new Error("boom");
  await assert.rejects(ownerPage("owner", authWith(unrelated))(), (error) => error === unrelated);
});

test("kitchen board page sends signed-out visitors to /login without rendering the board", async () => {
  await assert.rejects(staffPage(null)(), (error) => error.kind === "redirect" && error.target === "/login");
});

test("kitchen board page sends a role that is not staff or owner to /login", async () => {
  await assert.rejects(staffPage("customer")(), (error) => error.kind === "redirect" && error.target === "/login");
});

test("kitchen board page renders the board for staff and for the owner", async () => {
  for (const role of ["staff", "owner"]) assert.match(renderToStaticMarkup(await staffPage(role)()), new RegExp(BOARD_MARKER));
});

test("kitchen board still renders when the role check is only temporarily unavailable", async () => {
  const unavailable = new errors.ApiError(503, "auth_unavailable", "Could not verify the account role.");
  assert.match(renderToStaticMarkup(await staffPage("staff", authWith(unavailable))()), new RegExp(BOARD_MARKER));
  const unrelated = new Error("boom");
  await assert.rejects(staffPage("staff", authWith(unrelated))(), (error) => error === unrelated);
});

test("every route gets the hardening headers and none of them is a Content-Security-Policy", async () => {
  const config = loadModule(new URL("../next.config.ts", import.meta.url), {}).default;
  const [rule] = await config.headers();
  assert.equal(rule.source, "/:path*");
  const byKey = Object.fromEntries(rule.headers.map(({ key, value }) => [key, value]));
  assert.equal(byKey["X-Content-Type-Options"], "nosniff");
  assert.equal(byKey["X-Frame-Options"], "DENY");
  assert.equal(byKey["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(byKey["Permissions-Policy"], /camera=\(\)/);
  assert.equal("Content-Security-Policy" in byKey, false);
  // JSON compare: the config is built in a separate VM context, so strict deep-equal sees different prototypes.
  assert.equal(JSON.stringify(await config.redirects()), JSON.stringify([{ source: "/", destination: "/menu", permanent: false }]));
});

test("the staff page keeps the real gate in the API and does not import server secrets", () => {
  const source = readFileSync(new URL("../app/staff/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /SERVICE_ROLE|STRIPE_SECRET/);
});
