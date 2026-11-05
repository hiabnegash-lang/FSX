import assert from "node:assert/strict";
import test from "node:test";
import {
  MEMBERS,
  findSecrets,
  forbiddenEnvFiles,
} from "../scripts/package-deliverables.mjs";

test("only .env.example may ship; every other env file is refused", () => {
  assert.deepEqual(
    forbiddenEnvFiles([
      ".env.example",
      "apps/web/.env.example",
      ".env",
      ".env.local",
      ".env.production.local",
      "config/.env.test",
      "docs/environment.md",
      "lib/env.ts",
    ]),
    [".env", ".env.local", ".env.production.local", "config/.env.test"],
  );
});

test("secret scan flags real-looking values but not variable names or placeholders", () => {
  const fake = (prefix, n) => prefix + "a1B2c3D4e5".repeat(n);
  const hits = findSecrets([
    { path: "a.ts", text: `const k = "${fake("sk_test_", 3)}";` },
    { path: "b.ts", text: `whsec=${fake("whsec_", 3)}` },
    {
      path: "c.ts",
      text: `key: ${fake("eyJ", 3)}.${fake("", 3)}.${fake("", 2)}`,
    },
    {
      path: "d.md",
      // Assembled at runtime so this test file does not trip the packager's own scan.
      text: [
        "postgresql://postgres",
        "Sup3rSecret!@db.example.com:5432/postgres",
      ].join(":"),
    },
    { path: "ok1", text: "STRIPE_SECRET_KEY=\nSUPABASE_SERVICE_ROLE_KEY=" },
    {
      path: "ok2",
      text: "Test keys start with `pk_test_` and `sk_test_`; webhook secrets with `whsec_…`.",
    },
    {
      path: "ok3",
      text: "postgresql://postgres.ref@aws-0-us-west-2.pooler.supabase.com:5432/postgres",
    },
  ]);
  assert.deepEqual(hits, [
    "a.ts: Stripe secret or restricted key",
    "b.ts: Stripe webhook secret",
    "c.ts: JSON web token (Supabase key)",
    "d.md: Database URL with password",
  ]);
});

test("every member has a unique file name, and none mixes in another member's email", () => {
  assert.equal(new Set(MEMBERS.map((m) => m.name)).size, MEMBERS.length);
  const emails = MEMBERS.flatMap((m) => m.emails);
  assert.equal(new Set(emails).size, emails.length);
  for (const m of MEMBERS) assert.match(m.name, /^[A-Za-z]+$/);
});
