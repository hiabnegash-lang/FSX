import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const ticketRules = loadModule(new URL("../lib/ticket.ts", import.meta.url), {});
const board = loadModule(new URL("../lib/kitchen-board.ts", import.meta.url), { "./ticket": ticketRules });

const at = (iso) => Date.parse(iso);
const ticket = (id, ticketStatus, extra = {}) => ({
  id,
  orderNumber: "0042",
  customerName: "Ana",
  ticketStatus,
  pickupTime: "2026-11-02T18:30:00Z",
  paidAt: "2026-11-02T18:00:00Z",
  lines: [],
  ...extra,
});

test("the button label follows nextStep() for each step, and there is no button after ready", () => {
  assert.equal(board.actionLabel("received"), "Start cooking");
  assert.equal(board.actionLabel("in_progress"), "Mark ready");
  assert.equal(board.actionLabel("ready"), "Handed over");
  assert.equal(board.actionLabel("completed"), null);
  assert.equal(board.actionLabel("cancelled"), null);
  // Each label names the step nextStep() would take, not a separate copy of the rules.
  for (const from of ["received", "in_progress", "ready"]) {
    assert.ok(ticketRules.nextStep(from), `${from} has a next step`);
  }
});

test("every board status has a text label so colour is never the only signal", () => {
  assert.equal(board.statusLabel("received"), "Received");
  assert.equal(board.statusLabel("in_progress"), "In progress");
  assert.equal(board.statusLabel("ready"), "Ready");
  assert.equal(board.isBoardStatus("completed"), false);
  assert.equal(board.isBoardStatus("cancelled"), false);
});

test("a ticket is late only when it is received or in progress and pickup time has passed", () => {
  const pickup = "2026-11-02T18:30:00Z";
  const before = at("2026-11-02T18:29:59Z");
  const exactly = at(pickup);
  const after = at("2026-11-02T18:30:01Z");
  for (const status of ["received", "in_progress"]) {
    assert.equal(board.isLate(ticket("a", status, { pickupTime: pickup }), before), false);
    assert.equal(board.isLate(ticket("a", status, { pickupTime: pickup }), exactly), false);
    assert.equal(board.isLate(ticket("a", status, { pickupTime: pickup }), after), true);
  }
  // Ready food is waiting for the customer (no-shows stay ready), so it is never late.
  assert.equal(board.isLate(ticket("a", "ready", { pickupTime: pickup }), after + 3_600_000), false);
  assert.equal(board.isLate(ticket("a", "received", { pickupTime: "not a time" }), after), false);
});

test("elapsed time reads in whole minutes, then hours, and never goes negative", () => {
  const paid = "2026-11-02T18:00:00Z";
  assert.equal(board.elapsedText(paid, at("2026-11-02T18:00:59Z")), "<1 min");
  assert.equal(board.elapsedText(paid, at("2026-11-02T18:01:00Z")), "1 min");
  assert.equal(board.elapsedText(paid, at("2026-11-02T18:59:59Z")), "59 min");
  assert.equal(board.elapsedText(paid, at("2026-11-02T19:05:00Z")), "1 h 05 min");
  assert.equal(board.elapsedText(paid, at("2026-11-02T17:58:00Z")), "<1 min");
  assert.equal(board.elapsedText("garbage", at(paid)), "–");
  assert.equal(board.elapsedSpoken(paid, at("2026-11-02T18:01:30Z")), "1 minute");
  assert.equal(board.elapsedSpoken(paid, at("2026-11-02T18:12:00Z")), "12 minutes");
  assert.equal(board.elapsedSpoken(paid, at("2026-11-02T18:00:10Z")), "less than a minute");
});

test("pickup time shows in Central time, including across the daylight-saving change", () => {
  assert.equal(board.pickupTimeText("2026-11-02T18:30:00Z"), "12:30 PM"); // CST, UTC-6
  assert.equal(board.pickupTimeText("2026-10-30T18:30:00Z"), "1:30 PM"); // CDT, UTC-5
  assert.equal(board.pickupTimeText("nope"), "–");
});

test("size words hide the default size and spell out the short codes", () => {
  assert.equal(board.sizeText("regular"), null);
  assert.equal(board.sizeText(""), null);
  assert.equal(board.sizeText("sm"), "Small");
  assert.equal(board.sizeText("lg"), "Large");
  assert.equal(board.sizeText("M"), "Medium");
  assert.equal(board.sizeText("Family"), "Family");
});

test("columns split cooking from ready and keep the server's oldest-first order", () => {
  const tickets = [
    ticket("1", "in_progress"),
    ticket("2", "ready"),
    ticket("3", "received"),
    ticket("4", "completed"),
    ticket("5", "ready"),
  ];
  const { cooking, ready } = board.boardColumns(tickets);
  // Spread first: arrays built inside the loadModule sandbox have a different Array prototype.
  assert.deepEqual([...cooking].map((t) => t.id), ["1", "3"]);
  assert.deepEqual([...ready].map((t) => t.id), ["2", "5"]);
});

test("new tickets are spotted after the first load, and the first load never counts as new", () => {
  assert.deepEqual([...board.newTicketIds(null, [ticket("1", "received")])], []);
  const seen = new Set(["1", "2"]);
  assert.deepEqual([...board.newTicketIds(seen, [ticket("1", "received"), ticket("3", "received")])], ["3"]);
});

test("the clock offset comes from the server's Date header, or 0 when it cannot be read", () => {
  const local = at("2026-11-02T18:00:00Z");
  assert.equal(board.clockOffsetMs("Mon, 02 Nov 2026 18:00:30 GMT", local), 30_000);
  assert.equal(board.clockOffsetMs(null, local), 0);
  assert.equal(board.clockOffsetMs("not a date", local), 0);
});
