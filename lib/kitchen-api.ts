import { nextStep } from "./ticket";
import type { TicketStatus } from "./types";
import type { KitchenTicket } from "./views";

// Browser calls for the kitchen board. Like lib/cancel-order.ts, these only ask the server; the server
// checks the role and the status rules. Never send a role header from here: in stub mode the developer's
// own tools add `x-stub-role`, and in live mode the signed-in session cookie is what counts.

/** Why a call failed, so the board can decide what to do: sign in again, refresh, or retry quietly. */
export type KitchenErrorKind = "signed_out" | "forbidden" | "not_found" | "changed" | "offline" | "server";

export class KitchenError extends Error {
  readonly kind: KitchenErrorKind;
  constructor(kind: KitchenErrorKind, message: string) {
    super(message);
    this.name = "KitchenError";
    this.kind = kind;
  }
}

export interface TicketsResult {
  tickets: KitchenTicket[];
  /** The server's Date header, used to correct the tablet's clock for timers. */
  serverDate: string | null;
}

/** GET /api/staff/tickets: open tickets, oldest paid first. */
export async function fetchOpenTickets(signal?: AbortSignal): Promise<TicketsResult> {
  let response: Response;
  try {
    response = await fetch("/api/staff/tickets", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error; // the board cancelled this request on purpose
    throw new KitchenError("offline", "Could not reach the server.");
  }
  if (response.status === 401) throw new KitchenError("signed_out", "Sign in to use the kitchen board.");
  if (response.status === 403) throw new KitchenError("forbidden", "This account cannot use the kitchen board.");
  if (!response.ok) throw new KitchenError("server", "The server could not load tickets.");
  const body = await response.json().catch(() => null);
  if (!body || !Array.isArray(body.tickets)) throw new KitchenError("server", "The server sent an unexpected reply.");
  return { tickets: body.tickets as KitchenTicket[], serverDate: response.headers.get("date") };
}

/**
 * PATCH /api/orders/{id}/ticket one step forward. The next status always comes from nextStep() in
 * lib/ticket.ts; this file never decides the order of the steps itself. Cancelling is not possible here.
 */
export async function advanceTicket(orderId: string, from: TicketStatus): Promise<TicketStatus> {
  const to = nextStep(from);
  if (!to || to === "cancelled") {
    throw new KitchenError("changed", "This ticket has no next step. Refresh the board.");
  }
  let response: Response;
  try {
    response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/ticket`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status: to }),
    });
  } catch {
    throw new KitchenError("offline", "Could not reach the server. Check the connection and try again.");
  }
  if (response.status === 401) throw new KitchenError("signed_out", "Your session ended. Sign in again.");
  if (response.status === 403) throw new KitchenError("forbidden", "This account cannot change tickets.");
  if (response.status === 404) throw new KitchenError("not_found", "This order is no longer on the board.");
  if (response.status === 409) {
    throw new KitchenError("changed", "This ticket changed on another screen. The board is refreshing.");
  }
  if (!response.ok) throw new KitchenError("server", "Could not update this ticket. Try again.");
  const result = await response.json().catch(() => null);
  if (result?.orderId !== orderId || result?.ticketStatus !== to) {
    throw new KitchenError("changed", "Could not confirm the change. The board is refreshing.");
  }
  return to;
}
