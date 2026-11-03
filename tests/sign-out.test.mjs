import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { loadModule } from "./helpers/load-module.mjs";
const require = createRequire(import.meta.url),
  jsx = require("react/jsx-runtime");
const ui = loadModule(new URL("../lib/ui.ts", import.meta.url), {});
function find(node, check) {
  if (!node || typeof node !== "object") return null;
  if (check(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const result = find(child, check);
    if (result) return result;
  }
  return null;
}
function setup(createClient) {
  let cursor = 0;
  const state = [],
    calls = [];
  const hook = (initial) => {
    const i = cursor++;
    if (!(i in state)) state[i] = initial;
    return [
      state[i],
      (value) =>
        (state[i] = typeof value === "function" ? value(state[i]) : value),
    ];
  };
  const { SignOutButton } = loadModule(
    new URL("../components/sign-out-button.tsx", import.meta.url),
    {
      "react/jsx-runtime": jsx,
      react: { useState: hook },
      "next/navigation": {
        useRouter: () => ({
          replace: (url) => calls.push(["replace", url]),
          refresh: () => calls.push(["refresh"]),
        }),
      },
      "@/lib/supabase/browser": { createClient },
      "@/lib/ui": ui,
    },
  );
  const render = () => {
    cursor = 0;
    return SignOutButton({});
  };
  const button = () => find(render(), (n) => n.type === "button");
  return { calls, render, button };
}

test("sign out waits for Supabase, disables repeated taps, then replaces the route and refreshes", async () => {
  let release,
    count = 0;
  const h = setup(() => ({
    auth: {
      signOut: () => {
        count++;
        return new Promise((resolve) => (release = resolve));
      },
    },
  }));
  const pending = h.button().props.onClick();
  assert.equal(h.button().props.disabled, true);
  await h.button().props.onClick();
  assert.equal(count, 1);
  assert.deepEqual(h.calls, []);
  release({ error: null });
  await pending;
  assert.deepEqual(h.calls, [["replace", "/login"], ["refresh"]]);
});

test("unavailable browser client follows local-stub fallback to login", async () => {
  const h = setup(() => {
    throw Error("Missing local configuration");
  });
  await h.button().props.onClick();
  assert.deepEqual(h.calls, [["replace", "/login"], ["refresh"]]);
});

for (const reject of [false, true])
  test(
    "failed sign out stays on the screen and allows retry (" +
      (reject ? "rejection" : "returned error") +
      ")",
    async () => {
      let tries = 0;
      const h = setup(() => ({
        auth: {
          signOut: async () => {
            tries++;
            if (tries > 1) return { error: null };
            if (reject) throw Error("private network detail");
            return { error: { message: "private service detail" } };
          },
        },
      }));
      await h.button().props.onClick();
      assert.deepEqual(h.calls, []);
      assert.equal(h.button().props.disabled, false);
      const alert = find(h.render(), (n) => n.props?.role === "alert");
      assert(alert);
      assert(!JSON.stringify(alert).includes("private"));
      await h.button().props.onClick();
      assert.deepEqual(h.calls, [["replace", "/login"], ["refresh"]]);
    },
  );
