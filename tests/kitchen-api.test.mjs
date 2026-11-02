import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";


function client(handler) {
  const calls = [];
  const api = loadModule(new URL("../lib/kitchen-api.ts", import.meta.url), {}, {
    fetch: async (url, options) => {
      calls.push({ url, options });
      return handler(url, options);
    },
  });
  return { api, calls };
}

test("loading tickets reads the list and the server clock, and maps sign-in errors", async () => {
  const tickets = [{ id: "4b9e8f1c-2a3d-4e5f-8a9b-0c1d2e3f4a5b", ticketStatus: "received" }];
  const { api, calls } = client(() => Response.json({ tickets }, { headers: { date: "Mon, 02 Nov 2026 18:00:00 GMT" } }));
  const result = await api.fetchOpenTickets();
  assert.deepEqual(result.tickets, tickets);
  assert.equal(result.serverDate, "Mon, 02 Nov 2026 18:00:00 GMT");
  assert.equal(calls[0].url, "/api/staff/tickets");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.credentials, "same-origin");
  assert.equal(calls[0].options.headers, undefined);

  for (const [status, kind] of [[401, "signed_out"], [403, "forbidden"], [503, "server"]]) {
    const { api: failing } = client(() => new Response("{}", { status }));
    await assert.rejects(failing.fetchOpenTickets(), (e) => e.kind === kind);
  }
  const { api: odd } = client(() => Response.json({ nope: true }));
  await assert.rejects(odd.fetchOpenTickets(), (e) => e.kind === "server");
  const { api: offline } = client(() => { throw new TypeError("fetch failed"); });
  await assert.rejects(offline.fetchOpenTickets(), (e) => e.kind === "offline");
});

test("a request the board cancelled on purpose is passed through, not reported as offline", async () => {
  const controller = new AbortController();
  controller.abort();
  const { api } = client(() => { throw new DOMException("aborted", "AbortError"); });
  await assert.rejects(api.fetchOpenTickets(controller.signal), (e) => e.name === "AbortError");
});
