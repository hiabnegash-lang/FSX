import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const ticketRules = loadModule(new URL("../lib/ticket.ts", import.meta.url), {});
const id = "4b9e8f1c-2a3d-4e5f-8a9b-0c1d2e3f4a5b";

function client(handler) {
  const calls = [];
  const api = loadModule(new URL("../lib/kitchen-api.ts", import.meta.url), { "./ticket": ticketRules }, {
    fetch: async (url, options) => {
      calls.push({ url, options });
      return handler(url, options);
    },
  });
  return { api, calls };
}

test("advancing asks for exactly the step nextStep() gives, and nothing else", async () => {
  for (const [from, to] of [["received", "in_progress"], ["in_progress", "ready"], ["ready", "completed"]]) {
    const { api, calls } = client(() => Response.json({ orderId: id, ticketStatus: to }));
    assert.equal(await api.advanceTicket(id, from), to);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `/api/orders/${id}/ticket`);
    assert.equal(calls[0].options.method, "PATCH");
    assert.equal(calls[0].options.credentials, "same-origin");
    assert.equal(calls[0].options.body, JSON.stringify({ status: ticketRules.nextStep(from) }));
    // The browser never claims a role: no stub header, no auth bypass.
    assert.equal(JSON.stringify(calls[0].options.headers).toLowerCase().includes("x-stub-role"), false);
  }
});

test("the board can never cancel or move a finished ticket", async () => {
  for (const from of ["completed", "cancelled"]) {
    const { api, calls } = client(() => Response.json({}));
    await assert.rejects(api.advanceTicket(id, from), (e) => e.kind === "changed");
    assert.equal(calls.length, 0, `no request for ${from}`);
  }
});

test("each failure becomes a plain message with a kind the board can act on, without server details", async () => {
  const expected = { 401: "signed_out", 403: "forbidden", 404: "not_found", 409: "changed", 500: "server" };
  for (const [status, kind] of Object.entries(expected)) {
    const { api } = client(() => new Response("private server details", { status: Number(status) }));
    await assert.rejects(api.advanceTicket(id, "received"), (e) => e.kind === kind && !e.message.includes("private"));
  }
  const { api: mismatch } = client(() => Response.json({ orderId: id, ticketStatus: "ready" }));
  await assert.rejects(mismatch.advanceTicket(id, "received"), (e) => e.kind === "changed");
  const { api: offline } = client(() => { throw new Error("private network details"); });
  await assert.rejects(offline.advanceTicket(id, "received"), (e) => e.kind === "offline" && /connection/i.test(e.message));
});

test("loading tickets reads the list and the server clock, and maps sign-in errors", async () => {
  const tickets = [{ id, ticketStatus: "received" }];
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
