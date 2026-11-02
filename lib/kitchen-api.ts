import type { KitchenTicket } from "./views";

// Browser calls for the kitchen board. Like lib/cancel-order.ts, these only ask the server; the server
// checks the role and the status rules. Never send a role header from here: in stub mode the developer's
// own tools add `x-stub-role`, and in live mode the signed-in session cookie is what counts.

/** Why a call failed, so the board can decide what to do: sign in again, or retry quietly. */
export type KitchenErrorKind = "signed_out" | "forbidden" | "offline" | "server";

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
