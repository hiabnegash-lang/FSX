import { nextStep } from "./ticket";
import type { TicketStatus } from "./types";
import type { KitchenTicket } from "./views";

// Plain logic for the kitchen and counter board (SCRUM-71, SCRUM-75). No React, no browser APIs,
// so it can be tested with `node --test`. The status rules themselves live in lib/ticket.ts.

/** The statuses that appear on the board. completed and cancelled leave it. */
export type BoardStatus = Extract<TicketStatus, "received" | "in_progress" | "ready">;

const STATUS_LABELS: Record<BoardStatus, string> = {
  received: "Received",
  in_progress: "In progress",
  ready: "Ready",
};

/** Words for the header of a card. Colour is never the only signal (WCAG 1.4.1). */
export function statusLabel(status: TicketStatus): string {
  return isBoardStatus(status) ? STATUS_LABELS[status] : status;
}

export function isBoardStatus(status: TicketStatus): status is BoardStatus {
  return status === "received" || status === "in_progress" || status === "ready";
}

// Labels are keyed by the status the button moves TO, so they follow nextStep() rather than
// repeating the order of the steps here.
const ACTION_LABELS: Partial<Record<TicketStatus, string>> = {
  in_progress: "Start cooking",
  ready: "Mark ready",
  completed: "Handed over",
};

/** Text of the one button on a card, or null when there is no forward step (or it is not a kitchen step). */
export function actionLabel(status: TicketStatus): string | null {
  const to = nextStep(status);
  return to ? (ACTION_LABELS[to] ?? null) : null;
}

/**
 * Late rule (agreed 2 Nov): a ticket is late when it is still received or in progress and its pickup
 * time has passed. A ready ticket is never late: the food is waiting, and no-shows stay ready until
 * the owner closes them.
 */
export function isLate(ticket: Pick<KitchenTicket, "ticketStatus" | "pickupTime">, nowMs: number): boolean {
  if (ticket.ticketStatus !== "received" && ticket.ticketStatus !== "in_progress") return false;
  const pickup = Date.parse(ticket.pickupTime);
  return Number.isFinite(pickup) && nowMs > pickup;
}

/** Time since payment, for the always-visible timer: "<1 min", "12 min", "1 h 05 min". */
export function elapsedText(paidAt: string, nowMs: number): string {
  const paid = Date.parse(paidAt);
  if (!Number.isFinite(paid)) return "–";
  const minutes = Math.floor(Math.max(0, nowMs - paid) / 60_000);
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
}

/** The same duration in words, for screen readers: "12 minutes". */
export function elapsedSpoken(paidAt: string, nowMs: number): string {
  const paid = Date.parse(paidAt);
  if (!Number.isFinite(paid)) return "unknown time";
  const minutes = Math.floor(Math.max(0, nowMs - paid) / 60_000);
  if (minutes < 1) return "less than a minute";
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

const pickupFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  hour: "numeric",
  minute: "2-digit",
});

/** Pickup time in restaurant time (Central), e.g. "6:30 PM". */
export function pickupTimeText(pickupTime: string): string {
  const t = Date.parse(pickupTime);
  return Number.isFinite(t) ? pickupFormat.format(t) : "–";
}

const SIZE_TEXT: Record<string, string> = {
  sm: "Small",
  lg: "Large",
  S: "Small",
  M: "Medium",
  L: "Large",
};

/** Size words for a line, or null for unsized items ("regular"), so the card does not repeat noise. */
export function sizeText(sizeName: string): string | null {
  if (!sizeName || sizeName === "regular") return null;
  return SIZE_TEXT[sizeName] ?? sizeName;
}

/** Splits the board into "Cooking" (received, in progress) and "Ready for pickup", keeping the server's order. */
export function boardColumns<T extends Pick<KitchenTicket, "ticketStatus">>(tickets: T[]): { cooking: T[]; ready: T[] } {
  const cooking: T[] = [];
  const ready: T[] = [];
  for (const t of tickets) {
    if (t.ticketStatus === "received" || t.ticketStatus === "in_progress") cooking.push(t);
    else if (t.ticketStatus === "ready") ready.push(t);
  }
  return { cooking, ready };
}

/** Ids that were not on the board last time. Empty on the first load, so the opening batch does not flash or beep. */
export function newTicketIds(previous: ReadonlySet<string> | null, tickets: Pick<KitchenTicket, "id">[]): Set<string> {
  if (previous === null) return new Set();
  return new Set(tickets.map((t) => t.id).filter((id) => !previous.has(id)));
}

/**
 * Difference between the server's clock and this tablet's clock, from the response's Date header.
 * The timer and the late rule use server time so a tablet with a wrong clock still shows the right minutes.
 * Returns 0 when the header is missing or unreadable.
 */
export function clockOffsetMs(dateHeader: string | null, localNowMs: number): number {
  if (!dateHeader) return 0;
  const server = Date.parse(dateHeader);
  return Number.isFinite(server) ? server - localNowMs : 0;
}
