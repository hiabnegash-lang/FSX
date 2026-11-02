"use client";

import { useState } from "react";
import { advanceTicket, KitchenError } from "@/lib/kitchen-api";
import {
  actionLabel,
  elapsedSpoken,
  elapsedText,
  isBoardStatus,
  isLate,
  pickupTimeText,
  sizeText,
  statusLabel,
} from "@/lib/kitchen-board";
import type { TicketStatus } from "@/lib/types";
import type { KitchenTicket } from "@/lib/views";

// One ticket, in the DoorDash tablet layout from docs/DESIGN.md: full-width status header, order number
// and name large, the timer always visible, the lines, and ONE button at the bottom. Only fields from
// KitchenTicket are used, so no email, phone, price or payment detail can appear here.

const HEADER: Record<"received" | "in_progress" | "ready", string> = {
  received: "bg-status-received",
  in_progress: "bg-status-progress",
  ready: "bg-status-ready",
};

/** Large, high-contrast and at least 64px tall: easy to hit with a wet or gloved hand. */
const actionButton =
  "sticker flex min-h-16 w-full items-center justify-center rounded-xl bg-ink px-4 py-3 text-2xl font-bold text-paper focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand-blue disabled:cursor-wait disabled:opacity-60 disabled:shadow-none";

export function TicketCard({
  ticket,
  nowMs,
  isNew,
  onAdvanced,
  onStale,
  onSignedOut,
}: {
  ticket: KitchenTicket;
  nowMs: number;
  isNew: boolean;
  onAdvanced: () => void;
  onStale: () => void;
  onSignedOut: () => void;
}) {
  // Both remember which status they belong to, so they clear themselves once the ticket moves on.
  const [pendingFrom, setPendingFrom] = useState<TicketStatus | null>(null);
  const [failure, setFailure] = useState<{ from: TicketStatus; message: string } | null>(null);

  const status = ticket.ticketStatus;
  const late = isLate(ticket, nowMs);
  const label = actionLabel(status);
  const busy = pendingFrom === status;
  const error = failure?.from === status ? failure.message : null;
  const headingId = `ticket-${ticket.id}`;

  async function advance() {
    if (busy) return;
    setFailure(null);
    setPendingFrom(status);
    try {
      await advanceTicket(ticket.id, status);
      // Stay disabled until the refreshed board shows the new status, so a second tap cannot repeat it.
      onAdvanced();
    } catch (err) {
      setPendingFrom(null);
      const kitchenError = err instanceof KitchenError ? err : null;
      if (kitchenError?.kind === "signed_out" || kitchenError?.kind === "forbidden") {
        onSignedOut();
        return;
      }
      setFailure({ from: status, message: kitchenError?.message ?? "Could not update this ticket. Try again." });
      if (kitchenError?.kind === "changed" || kitchenError?.kind === "not_found") onStale();
    }
  }

  return (
    <article
      aria-labelledby={headingId}
      className={`flex flex-col overflow-hidden rounded-2xl border-ink bg-paper text-ink ${
        late ? "anim-late border-4 border-status-late" : "border-2"
      } ${isNew ? "anim-rise" : ""}`}
    >
      <header
        className={`px-5 py-3 text-xl font-bold uppercase tracking-wide text-white ${
          late ? "bg-status-late" : isBoardStatus(status) ? HEADER[status] : "bg-ink"
        }`}
      >
        {late ? `Late · ${statusLabel(status)}` : statusLabel(status)}
      </header>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <h3 id={headingId} className="min-w-0">
            <span className="tabular block text-4xl font-bold leading-none">#{ticket.orderNumber}</span>
            <span className="mt-2 block break-words text-2xl font-semibold">{ticket.customerName}</span>
          </h3>
          <p className={`text-right ${late ? "text-status-late" : ""}`}>
            <span className="block text-sm font-bold uppercase tracking-wide text-muted">Since paid</span>
            <span className="tabular block text-3xl font-bold" aria-hidden="true">
              {elapsedText(ticket.paidAt, nowMs)}
            </span>
            <span className="sr-only">Paid {elapsedSpoken(ticket.paidAt, nowMs)} ago</span>
          </p>
        </div>

        <p className="text-xl">
          Pickup <time dateTime={ticket.pickupTime} className="tabular font-bold">{pickupTimeText(ticket.pickupTime)}</time>
        </p>

        <ul className="flex flex-col gap-3 border-t-2 border-line pt-4">
          {ticket.lines.map((line, index) => {
            const size = sizeText(line.sizeName);
            return (
              <li key={index} className="text-xl leading-snug">
                <p>
                  <span className="tabular font-bold">{line.quantity}×</span> <span className="font-semibold">{line.name}</span>
                  {size && <span> · {size}</span>}
                  {line.spicy && (
                    <span className="ml-2 inline-block rounded border-2 border-status-late px-2 text-base font-bold uppercase text-status-late">
                      Spicy
                    </span>
                  )}
                </p>
                {line.components.length > 0 && (
                  <ul className="mt-1 pl-6 text-lg" aria-label="Combination halves">
                    {line.components.map((code, half) => (
                      <li key={half}>½ {code}</li>
                    ))}
                  </ul>
                )}
                {line.instructions && (
                  <p className="mt-1 rounded bg-tile px-3 py-1 text-lg">
                    <span className="font-bold">Note:</span> {line.instructions}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {label && (
        <footer className="p-5 pt-0">
          <button type="button" className={actionButton} onClick={advance} disabled={busy} aria-describedby={error ? `${headingId}-error` : undefined}>
            {busy ? "Saving…" : label}
          </button>
          {error && (
            <p id={`${headingId}-error`} role="alert" className="mt-3 rounded border-2 border-status-late bg-paper px-3 py-2 text-lg font-semibold text-status-late">
              {error}
            </p>
          )}
        </footer>
      )}
    </article>
  );
}
