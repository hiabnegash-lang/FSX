import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

// Order-ready email (RTM F31, BR-28). Real TypeScript handlers; only the network and the store are replaced.

const logs = [];
const globals = {
  fetch: async () => {
    throw new Error("unexpected real network call");
  },
  AbortController,
  URL,
  setTimeout,
  clearTimeout,
  console: { error: (...args) => logs.push(JSON.stringify(args)) },
};
const accounts = loadModule(
  new URL("../lib/customer-accounts.ts", import.meta.url),
  {},
);
const email = loadModule(
  new URL("../lib/ready-email.ts", import.meta.url),
  { "./customer-accounts": accounts },
  globals,
);
const ticket = loadModule(new URL("../lib/ticket.ts", import.meta.url), {});

const ORDER = {
  orderId: "11111111-2222-3333-4444-555555555555",
  orderNumber: "0042",
  customerName: "Maria Lopez",
  customerEmail: "maria.private@example.invalid",
  pickupTime: "2026-11-12T00:15:00.000Z", // Wed 6:15 PM Houston
};
const ENV = {
  RESEND_API_KEY: "re_test_key",
  NEXT_PUBLIC_SITE_URL: "https://fsx.example/",
};
const recorder = (response = { ok: true, status: 200 }) => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return response;
  };
  return { calls, fetchImpl };
};
const noLeak = () => {
  const text = logs.join("\n");
  assert.ok(
    !text.includes("maria.private"),
    "log must not contain the email address",
  );
  assert.ok(!text.includes("Maria"), "log must not contain the customer name");
};

test("the message names the order, the Houston pickup time and the address, in text and HTML", () => {
  const built = email.buildReadyEmail(ORDER, "https://fsx.example");
  assert.equal(built.subject, "Your order #0042 is ready for pickup");
  for (const part of [
    "Hi Maria Lopez",
    "order #0042",
    "Wed, Nov 11, 6:15 PM",
    "6755 Hillcroft St, Houston",
    `https://fsx.example/order/${ORDER.orderId}`,
  ]) {
    assert.ok(built.text.includes(part), `text should include ${part}`);
    assert.ok(
      built.html.includes(part.replace("&", "&amp;")) || part.startsWith("Hi "),
      `html should include ${part}`,
    );
  }
  assert.ok(!/<[a-z]/i.test(built.text), "the text version has no HTML");
  assert.ok(
    !/\$|total|price/i.test(built.text),
    "no prices or payment details in the email",
  );
});

test("without a site address there is no link, and a blank name still reads naturally", () => {
  const built = email.buildReadyEmail({ ...ORDER, customerName: "   " }, null);
  assert.ok(!built.text.includes("/order/") && !built.html.includes("/order/"));
  assert.ok(built.text.startsWith("Hi there,"));
});

test("a customer name cannot inject HTML into the email", () => {
  const built = email.buildReadyEmail(
    { ...ORDER, customerName: `<img src=x onerror=alert(1)> & "Co"` },
    null,
  );
  assert.ok(!built.html.includes("<img"), "raw tag must not appear");
  assert.ok(
    built.html.includes(
      "&lt;img src=x onerror=alert(1)&gt; &amp; &quot;Co&quot;",
    ),
  );
});

test("the site address setting is reduced to a safe origin or ignored", () => {
  assert.equal(
    email.cleanSiteUrl("https://fsx.example/menu/"),
    "https://fsx.example",
  );
  assert.equal(
    email.cleanSiteUrl("http://localhost:3000"),
    "http://localhost:3000",
  );
  for (const bad of [
    "javascript:alert(1)",
    "ftp://x.example",
    "",
    undefined,
    "not a url",
  ])
    assert.equal(email.cleanSiteUrl(bad), null);
});

test("without RESEND_API_KEY nothing is sent and the network is never touched", async () => {
  const net = recorder();
  const result = await email.sendEmail(
    {
      ...email.buildReadyEmail(ORDER),
      to: ORDER.customerEmail,
      idempotencyKey: "k",
    },
    { env: {}, fetchImpl: net.fetchImpl },
  );
  assert.equal(result, "not_configured");
  assert.equal(net.calls.length, 0);
});

test("the Resend request carries the key, the sender, one recipient and an idempotency key", async () => {
  const net = recorder();
  const message = {
    ...email.buildReadyEmail(ORDER),
    to: ORDER.customerEmail,
    idempotencyKey: `order-ready/${ORDER.orderId}`,
  };
  assert.equal(
    await email.sendEmail(message, { env: ENV, fetchImpl: net.fetchImpl }),
    "sent",
  );
  const [call] = net.calls;
  assert.equal(call.url, "https://api.resend.com/emails");
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.headers.Authorization, "Bearer re_test_key");
  assert.equal(
    call.init.headers["Idempotency-Key"],
    `order-ready/${ORDER.orderId}`,
  );
  assert.equal(
    call.body.from,
    "Menciu's Chopstix <no-reply@chopstixhouston.com>",
  );
  assert.deepEqual(call.body.to, [ORDER.customerEmail]);
  assert.equal(call.body.subject, "Your order #0042 is ready for pickup");
  assert.ok(call.body.html && call.body.text);
  const custom = recorder();
  await email.sendEmail(message, {
    env: { ...ENV, EMAIL_FROM: "Kitchen <kitchen@chopstixhouston.com>" },
    fetchImpl: custom.fetchImpl,
  });
  assert.equal(
    custom.calls[0].body.from,
    "Kitchen <kitchen@chopstixhouston.com>",
  );
});

test("a refusal, a network error and a timeout are all reported as failed, never thrown, never logging the address", async () => {
  logs.length = 0;
  const message = {
    ...email.buildReadyEmail(ORDER),
    to: ORDER.customerEmail,
    idempotencyKey: "k",
  };
  assert.equal(
    await email.sendEmail(message, {
      env: ENV,
      fetchImpl: recorder({ ok: false, status: 422 }).fetchImpl,
    }),
    "failed",
  );
  assert.equal(
    await email.sendEmail(message, {
      env: ENV,
      fetchImpl: async () => {
        throw new Error(`boom ${ORDER.customerEmail}`);
      },
    }),
    "failed",
  );
  const hangs = (_url, init) =>
    new Promise((_resolve, reject) =>
      init.signal.addEventListener("abort", () =>
        reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
      ),
    );
  assert.equal(
    await email.sendEmail(message, {
      env: ENV,
      fetchImpl: hangs,
      timeoutMs: 20,
    }),
    "failed",
  );
  assert.ok(
    logs.some((l) => l.includes("timeout")) &&
      logs.some((l) => l.includes("422")),
  );
  noLeak();
});

// ---- the orchestration, with a fake store
function loadNotifier(store) {
  return loadModule(
    new URL("../lib/notify-ready.ts", import.meta.url),
    { "./data": { store }, "./ready-email": email },
    globals,
  );
}
function fakeStore({
  target = ORDER,
  failMark = false,
  failRead = false,
} = {}) {
  const calls = { read: 0, marked: [] };
  return {
    calls,
    getReadyEmailTarget: async () => {
      calls.read++;
      if (failRead) throw new Error("db down");
      return target;
    },
    markReadyEmailSent: async (id) => {
      if (failMark) throw new Error("db down");
      calls.marked.push(id);
    },
  };
}

test("a Ready order is emailed once and then marked as sent", async () => {
  const store = fakeStore();
  const net = recorder();
  const { notifyOrderReady } = loadNotifier(store);
  assert.equal(
    await notifyOrderReady(ORDER.orderId, {
      env: ENV,
      fetchImpl: net.fetchImpl,
    }),
    "sent",
  );
  assert.equal(net.calls.length, 1);
  assert.equal(
    net.calls[0].init.headers["Idempotency-Key"],
    `order-ready/${ORDER.orderId}`,
  );
  assert.ok(
    net.calls[0].body.text.includes(
      `https://fsx.example/order/${ORDER.orderId}`,
    ),
    "link uses the site address setting",
  );
  assert.deepEqual(store.calls.marked, [ORDER.orderId]);
});

test("an order that was already emailed, or is not Ready, gets nothing", async () => {
  const store = fakeStore({ target: null });
  const net = recorder();
  const { notifyOrderReady } = loadNotifier(store);
  assert.equal(
    await notifyOrderReady(ORDER.orderId, {
      env: ENV,
      fetchImpl: net.fetchImpl,
    }),
    "not_needed",
  );
  assert.equal(net.calls.length, 0);
  assert.deepEqual(store.calls.marked, []);
});

test("with no key the store is not even read, so nothing is marked", async () => {
  const store = fakeStore();
  const net = recorder();
  const { notifyOrderReady } = loadNotifier(store);
  assert.equal(
    await notifyOrderReady(ORDER.orderId, {
      env: {},
      fetchImpl: net.fetchImpl,
    }),
    "not_configured",
  );
  assert.equal(store.calls.read, 0);
  assert.equal(net.calls.length, 0);
});

test("a failed send is not marked as sent, is logged by order id only, and never throws", async () => {
  logs.length = 0;
  const store = fakeStore();
  const net = recorder({ ok: false, status: 500 });
  const { notifyOrderReady } = loadNotifier(store);
  assert.equal(
    await notifyOrderReady(ORDER.orderId, {
      env: ENV,
      fetchImpl: net.fetchImpl,
    }),
    "failed",
  );
  assert.deepEqual(
    store.calls.marked,
    [],
    "email_sent_at stays empty so the failure is visible",
  );
  assert.ok(logs.some((l) => l.includes(ORDER.orderId)));
  noLeak();
});

test("a database error while reading, or while recording the send, never throws", async () => {
  logs.length = 0;
  const net = recorder();
  const reading = loadNotifier(fakeStore({ failRead: true })).notifyOrderReady;
  assert.equal(
    await reading(ORDER.orderId, { env: ENV, fetchImpl: net.fetchImpl }),
    "failed",
  );
  assert.equal(net.calls.length, 0);
  const marking = loadNotifier(fakeStore({ failMark: true })).notifyOrderReady;
  assert.equal(
    await marking(ORDER.orderId, { env: ENV, fetchImpl: net.fetchImpl }),
    "sent",
    "the email went out, so the result is sent",
  );
  assert.ok(logs.some((l) => l.includes("email_sent_at was not saved")));
  noLeak();
});

// ---- the stub store used for local work and tests
test("the stub store hands out the email details only for a Ready order that has not been emailed", async () => {
  const menu = loadModule(new URL("../lib/data/menu.ts", import.meta.url), {});
  const { stubStore } = loadModule(
    new URL("../lib/data/stub.ts", import.meta.url),
    { "./menu": menu },
    { crypto: globalThis.crypto },
  );
  const order = await stubStore.insertOrder({
    customerName: "Maria",
    customerEmail: "m@example.invalid",
    customerPhone: null,
    pickupTime: "2026-11-12T00:15:00.000Z",
    paymentStatus: "paid",
    ticketStatus: "received",
    subtotalCents: 100,
    taxCents: 8,
    totalCents: 108,
    taxRateBps: 825,
    stripeSessionId: null,
    lines: [],
  });
  assert.equal(
    await stubStore.getReadyEmailTarget(order.id),
    null,
    "not Ready yet",
  );
  await stubStore.setTicketStatus(order.id, "ready");
  const target = await stubStore.getReadyEmailTarget(order.id);
  assert.deepEqual(
    { ...target },
    {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: "Maria",
      customerEmail: "m@example.invalid",
      pickupTime: "2026-11-12T00:15:00.000Z",
    },
  );
  await stubStore.markReadyEmailSent(order.id);
  assert.equal(
    await stubStore.getReadyEmailTarget(order.id),
    null,
    "emailed once, never again",
  );
  assert.equal(await stubStore.getReadyEmailTarget("missing"), null);
});

// ---- the ticket route: only the Ready step sends, and email trouble never blocks the ticket
function routeFor({ order, notify, role = "staff" }) {
  const next = {
    NextResponse: {
      json: (body, init) =>
        new Response(JSON.stringify(body), {
          status: init?.status ?? 200,
          headers: { "content-type": "application/json" },
        }),
    },
  };
  class ApiError extends Error {
    constructor(status, code, message) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  const errors = {
    ApiError,
    errorResponse: (e) =>
      new Response(JSON.stringify({ error: { code: e.code } }), {
        status: e.status ?? 500,
      }),
  };
  const changes = [];
  const route = loadModule(
    new URL("../app/api/orders/[id]/ticket/route.ts", import.meta.url),
    {
      "next/server": next,
      "@/lib/errors": errors,
      "@/lib/ticket": ticket,
      "@/lib/auth": { requireRole: async () => role },
      "@/lib/validation": {
        parseBody: async (request) => request.json(),
        ticketPatchSchema: {},
      },
      "@/lib/notify-ready": { notifyOrderReady: notify },
      "@/lib/data": {
        store: {
          getOrder: async () => order,
          setTicketStatus: async (id, status) => {
            changes.push(status);
            return { ...order, ticketStatus: status };
          },
        },
      },
    },
  );
  return { route, changes };
}
const patch = (status) =>
  new Request("https://fsx.example/api/orders/x/ticket", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
const params = { params: Promise.resolve({ id: ORDER.orderId }) };
const paid = (ticketStatus) => ({
  id: ORDER.orderId,
  paymentStatus: "paid",
  ticketStatus,
});

test("moving a ticket to Ready sends the email once; the other steps send nothing", async () => {
  const sent = [];
  const notify = async (id) => {
    sent.push(id);
    return "sent";
  };
  const toReady = routeFor({ order: paid("in_progress"), notify });
  assert.equal((await toReady.route.PATCH(patch("ready"), params)).status, 200);
  assert.deepEqual(sent, [ORDER.orderId]);
  const inProgress = routeFor({ order: paid("received"), notify });
  await inProgress.route.PATCH(patch("in_progress"), params);
  const completed = routeFor({ order: paid("ready"), notify });
  await completed.route.PATCH(patch("completed"), params);
  const cancelled = routeFor({
    order: paid("in_progress"),
    notify,
    role: "owner",
  });
  await cancelled.route.PATCH(patch("cancelled"), params);
  assert.equal(sent.length, 1, "only the Ready step emails the customer");
});

test("a refused or skipped step does not email, and a failed email does not undo the ticket", async () => {
  const sent = [];
  const notify = async (id) => {
    sent.push(id);
    return "failed";
  };
  const skip = routeFor({ order: paid("received"), notify });
  assert.equal(
    (await skip.route.PATCH(patch("ready"), params)).status,
    409,
    "received cannot jump to ready",
  );
  assert.equal(sent.length, 0);
  assert.deepEqual(skip.changes, []);
  const ok = routeFor({ order: paid("in_progress"), notify });
  const response = await ok.route.PATCH(patch("ready"), params);
  assert.equal(response.status, 200, "the kitchen still gets its Ready");
  assert.equal((await response.json()).ticketStatus, "ready");
  assert.deepEqual(ok.changes, ["ready"]);
});
