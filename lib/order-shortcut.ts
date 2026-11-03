import type { PublicOrder } from "./public-order";

export type ShortcutStatus = Pick<PublicOrder, "id" | "paymentStatus" | "ticketStatus">;
export type OrderStage = "received" | "in_progress" | "ready" | "completed";

export function orderStage(order: ShortcutStatus): OrderStage | null {
  if (order.paymentStatus !== "paid" || order.ticketStatus === "cancelled") return null;
  return order.ticketStatus ?? "received";
}

export function shortcutLabel(order: ShortcutStatus): string {
  if (order.paymentStatus === "pending_payment") return "Confirming payment";
  if (order.paymentStatus === "expired") return "Checkout not completed";
  if (order.ticketStatus === "cancelled") return "Order cancelled";
  return { received: "Paid", in_progress: "Being prepared", ready: "Ready for pickup", completed: "Picked up" }[orderStage(order)!];
}

/** A failed or mismatched refresh must never claim progress for another order. */
export function parseShortcutStatus(value: unknown, id: string): ShortcutStatus | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.id !== id || !["pending_payment", "paid", "expired"].includes(data.paymentStatus as string)) return null;
  if (data.ticketStatus !== null && !["received", "in_progress", "ready", "completed", "cancelled"].includes(data.ticketStatus as string)) return null;
  return { id, paymentStatus: data.paymentStatus, ticketStatus: data.ticketStatus } as ShortcutStatus;
}
