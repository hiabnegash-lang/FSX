import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";
const require = createRequire(import.meta.url);
const zod = require("zod");
const query = loadModule(
  new URL("../lib/owner-order-query.ts", import.meta.url),
  { zod, "./ticket": { isTicketStatus: () => true } },
  { URLSearchParams },
);
const model = loadModule(
  new URL("../lib/owner-report-model.ts", import.meta.url),
  { zod, "./owner-order-query": query },
  { Map, Intl, Date },
);
const errors = loadModule(new URL("../lib/errors.ts", import.meta.url), {
  "next/server": require("next/server"),
});
const empty = {
  summary: { orders: 0, sales: 0, tax: 0, collected: 0 },
  daily: [],
  items: [],
  hourly: [],
};
test("report dates use Central midnight and handle both DST changes", () => {
  const spring = model.reportRange({ start: "2026-03-08", end: "2026-03-08" });
  assert.equal(Date.parse(spring.to) - Date.parse(spring.from), 23 * 3600000);
  const fall = model.reportRange({ start: "2026-11-01", end: "2026-11-01" });
  assert.equal(Date.parse(fall.to) - Date.parse(fall.from), 25 * 3600000);
  const defaults = model.reportRange({}, new Date("2026-11-03T02:30:00Z"));
  assert.equal(defaults.start, "2026-10-04");
  assert.equal(defaults.end, "2026-11-02");
  for (const bad of [
    { start: "2026-02-30" },
    { start: "2026-11-03", end: "2026-11-02" },
    { start: "2025-01-01", end: "2026-11-02" },
    { start: ["2026-01-01"] },
  ])
    assert.throws(() => model.reportRange(bad));
});
test("empty reports include zero days and all 24 hours; top sellers rank on the selected metric", () => {
  const result = model.completeReport(empty, "2026-10-31", "2026-11-02");
  assert.equal(result.daily.length, 3);
  assert.equal(result.hourly.length, 24);
  assert.equal(result.daily[1].sales, 0);
  const data = {
    ...empty,
    items: [
      { code: "A1", name: "A", quantity: 10, revenue: 100 },
      { code: "A2", name: "B", quantity: 2, revenue: 1000 },
    ],
  };
  assert.equal(model.topItems(data, "quantity")[0].code, "A1");
  assert.equal(model.topItems(data, "revenue")[0].code, "A2");
});
test("CSV exports label their scope, use exact cents and neutralize spreadsheet formula text", () => {
  const csv = model.reportCsv(
    {
      ...empty,
      items: [
        { code: "A1", name: '=HYPERLINK("bad")', quantity: 2, revenue: 151 },
      ],
    },
    "items",
  );
  assert.match(csv, /Online orders only/);
  assert.match(csv, /"1.51"/);
  assert.match(csv, /'=/);
  assert.match(csv, /""bad""/);
  for (const value of ["=x", "+x", "@x", "-x", "\t=x", " \n=x"])
    assert.ok(model.csvCell(value).startsWith("\"'"));
});
function setup({
  role = "owner",
  data = empty,
  orders = [],
  total = orders.length,
  rpcError = null,
  stub = false,
} = {}) {
  const calls = [];
  const service = loadModule(
    new URL("../lib/owner-reports.ts", import.meta.url),
    {
      "./auth": {
        requireRole: async () => {
          if (role !== "owner")
            throw new errors.ApiError(403, "forbidden", "Owner required");
        },
      },
      "./supabase/server": {
        createClient: async () => ({
          rpc: async (name, args) => {
            calls.push({ name, args });
            return { data, error: rpcError };
          },
        }),
      },
      "./data/mode": { usingStub: () => stub },
      "./data": {
        store: {
          listOrders: async (args) => {
            calls.push(args);
            return { orders, total };
          },
        },
      },
      "./errors": errors,
      "./owner-report-model": model,
    },
    { Intl, Date },
  );
  return { ...service, calls };
}
test("reports reject staff and invalid dates before database access, and hide database details", async () => {
  const staff = setup({ role: "staff" });
  await assert.rejects(staff.readOwnerReports({}, {}), { status: 403 });
  assert.equal(staff.calls.length, 0);
  const invalid = setup();
  await assert.rejects(invalid.readOwnerReports({}, { start: "bad" }), {
    status: 400,
  });
  assert.equal(invalid.calls.length, 0);
  await assert.rejects(
    setup({ rpcError: { message: "private SQL" } }).readOwnerReports({}, {}),
    (e) => e.status === 503 && !e.message.includes("private SQL"),
  );
  await assert.rejects(setup({ data: {} }).readOwnerReports({}, {}), {
    status: 503,
  });
});
test("report RPC receives inclusive calendar days, not client-supplied timezone bounds", async () => {
  const service = setup();
  await service.readOwnerReports(
    {},
    { start: "2026-11-01", end: "2026-11-02", from: "untrusted" },
  );
  assert.equal(service.calls[0].name, "owner_operational_reports");
  assert.equal(service.calls[0].args.p_start, "2026-11-01");
  assert.equal(service.calls[0].args.p_end, "2026-11-02");
});
test("fixture reports use snapshots, skip cancelled and unpaid tickets, and aggregate Central payment day", async () => {
  const order = {
    paymentStatus: "paid",
    ticketStatus: "completed",
    paidAt: "2026-11-03T02:00:00Z",
    subtotalCents: 300,
    taxCents: 25,
    totalCents: 325,
    lines: [
      {
        itemCode: "A2",
        nameSnapshot: "Original",
        unitPriceCents: 150,
        quantity: 2,
      },
    ],
  };
  const service = setup({
    stub: true,
    orders: [
      order,
      { ...order, ticketStatus: "cancelled" },
      { ...order, paymentStatus: "pending_payment" },
    ],
  });
  const { data } = await service.readOwnerReports(
    {},
    { start: "2026-11-02", end: "2026-11-02" },
  );
  assert.equal(data.summary.orders, 1);
  assert.equal(data.summary.sales, 300);
  assert.equal(data.items[0].revenue, 300);
  assert.equal(data.daily[0].day, "2026-11-02");
  assert.equal(data.hourly[20].orders, 1);
});
