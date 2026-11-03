import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const { parseShortcutStatus, orderStage, shortcutLabel } = loadModule(new URL("../lib/order-shortcut.ts", import.meta.url), {});
const ID = "3f3b44d4-7d22-8138-9cd4-ccae4cba71ef";
const paid = (ticketStatus) => ({ id: ID, paymentStatus: "paid", ticketStatus });

test("header does not accept a response for another order or an unknown status", () => {
  for (const value of [null, {}, { ...paid("ready"), id: "other" }, paid("refunded"), { ...paid("ready"), paymentStatus: "refunded" }]) {
    assert.equal(parseShortcutStatus(value, ID), null);
  }
  assert.equal(parseShortcutStatus(paid("ready"), ID).ticketStatus, "ready");
});

test("unpaid, expired and cancelled states cannot display cooking or pickup artwork", () => {
  for (const status of ["pending_payment", "expired"]) {
    assert.equal(orderStage({ ...paid("ready"), paymentStatus: status }), null);
  }
  assert.equal(orderStage(paid("cancelled")), null);
  assert.equal(shortcutLabel({ ...paid(null), paymentStatus: "pending_payment" }), "Confirming payment");
  assert.equal(shortcutLabel({ ...paid(null), paymentStatus: "expired" }), "Checkout not completed");
  assert.equal(shortcutLabel(paid("cancelled")), "Order cancelled");
});

test("a paid order with no ticket keeps the page's received fallback and completion remains explicit", () => {
  assert.equal(orderStage(paid(null)), "received");
  assert.equal(shortcutLabel(paid(null)), "Paid");
  assert.equal(shortcutLabel(paid("completed")), "Picked up");
});
