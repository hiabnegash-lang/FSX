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
  "kitchen-ticket-action sticker flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-ink px-4 py-3 text-2xl font-bold text-paper focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand-blue disabled:cursor-wait disabled:shadow-none";

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
    <div className={status === "ready" ? "kitchen-ticket-ready" : isNew ? "kitchen-ticket-enter" : ""}>
    <article
      aria-labelledby={headingId}
      className={`flex flex-col overflow-hidden rounded-2xl border-ink bg-paper text-ink ${
        late ? "anim-late border-4 border-status-late" : "border-2"
      }`}
    >
      <header
        className={`flex items-center gap-3 px-5 py-4 text-xl font-bold text-white ${
          late ? "bg-status-late" : isBoardStatus(status) ? HEADER[status] : "bg-ink"
        }`}
      >
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 shrink-0">
          <path d={late ? "m12 3 10 18H2L12 3Zm0 6v5m0 3h.01" : status === "ready" ? "m5 12 4 4L19 6M4 21h16" : status === "in_progress" ? "M8 3h8M8 21h8M9 3v5l6 8v5M15 3v5l-6 8v5" : "M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"} />
        </svg>
        {late ? `Late · ${statusLabel(status)}` : statusLabel(status)}
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-4">
          <h3 id={headingId} className="min-w-0 max-w-full">
            <span className="tabular block break-words font-sans text-5xl font-black leading-none">#{ticket.orderNumber}</span>
            <span className="mt-3 block break-words font-sans text-2xl font-bold">{ticket.customerName}</span>
          </h3>
          <p className={`text-right ${late ? "text-status-late" : ""}`}>
            <span className="block text-lg font-bold text-ink">Since paid</span>
            <span className="tabular block text-3xl font-bold" aria-hidden="true">
              {elapsedText(ticket.paidAt, nowMs)}
            </span>
            <span className="sr-only">Paid {elapsedSpoken(ticket.paidAt, nowMs)} ago</span>
          </p>
        </div>

        <p className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-xl border-2 px-4 py-3 text-xl ${late ? "border-status-late bg-paper text-status-late" : "border-line bg-cream"}`}>
          <span className="font-bold">Pickup</span> <time dateTime={ticket.pickupTime} className="tabular ml-auto text-right text-2xl font-bold">{pickupTimeText(ticket.pickupTime)}</time>
        </p>

        <ul className="flex flex-col gap-3 border-t-2 border-line pt-4">
          {ticket.lines.map((line, index) => {
            const size = sizeText(line.sizeName);
            return (
              <li key={index} className="break-words text-xl leading-snug">
                <p>
                  <span className="tabular font-bold">{line.quantity}×</span> <span className="font-semibold">{line.name}</span>
                  {size && <span> · {size}</span>}
                  {line.spicy && (
                    <span className="ml-2 inline-block rounded border-2 border-status-late px-2 text-lg font-bold text-status-late">
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
          <button type="button" className={actionButton} onClick={advance} disabled={busy} aria-busy={busy} aria-describedby={error ? `${headingId}-error` : undefined}>
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 shrink-0 ${busy ? "kitchen-saving-mark" : ""}`}>
              <path d={busy ? "M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" : status === "ready" ? "m5 12 4 4L19 6" : "M4 12h16m-6-6 6 6-6 6"} />
            </svg>
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
    </div>
  );
}
