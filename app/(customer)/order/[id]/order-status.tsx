"use client";

import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";
import type { PublicOrder } from "@/lib/public-order";
import { clearLastOrder, saveLastOrder } from "@/lib/last-order";

import { useCart } from "../../cart-provider";

const PENDING_MS = 3_000; // waiting for the Stripe webhook
const ACTIVE_MS = 10_000; // paid, ticket still moving

const TICKET_COPY = {
  received: "We have your order.",
  in_progress: "The kitchen is making your order.",
  ready: "Your order is ready for pickup.",
  completed: "Picked up. Thank you!",
} as const;

const ORDER_STEPS = [
  { status: "received", label: "Paid" },
  { status: "in_progress", label: "Being prepared" },
  { status: "ready", label: "Ready for pickup" },
  { status: "completed", label: "Picked up" },
] as const;

function OrderProgress({ status }: { status: keyof typeof TICKET_COPY }) {
  const currentStep = ORDER_STEPS.findIndex((step) => step.status === status);

  return (
    <section className="mt-8" aria-labelledby="order-progress-heading">
      <h2
        id="order-progress-heading"
        className="text-xl font-bold text-brand-blue"
      >
        Your order&apos;s journey
      </h2>
      <ol className="mt-5 sm:grid sm:grid-cols-4">
        {ORDER_STEPS.map((step, index) => {
          const complete = index < currentStep || status === "completed";
          const current = index === currentStep;
          return (
            <li
              key={step.status}
              aria-current={current ? "step" : undefined}
              className="relative flex min-w-0 gap-4 pb-7 last:pb-0 sm:flex-col sm:items-center sm:gap-3 sm:pb-0 sm:text-center"
            >
              {index < ORDER_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-[19px] top-10 w-0.5 overflow-hidden bg-line sm:bottom-auto sm:left-[calc(50%+20px)] sm:top-5 sm:h-0.5 sm:w-[calc(100%-40px)]"
                >
                  <span
                    data-complete={index < currentStep}
                    className="order-progress-fill block h-full w-full bg-brand-blue"
                  />
                </span>
              )}
              <span
                key={`${step.status}-${current}`}
                aria-hidden="true"
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold ${
                  complete
                    ? "border-brand-blue bg-brand-blue text-paper"
                    : current
                      ? "anim-pop border-brand-blue bg-brand-blue text-paper ring-4 ring-tile-blue"
                      : "border-muted bg-paper text-muted"
                }`}
              >
                {complete ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-6 w-6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      d="m5 12 4 4L19 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <div className="min-w-0 pt-0.5 sm:px-2 sm:pt-0">
                <p
                  className={`font-bold ${current ? "text-brand-blue" : "text-ink"}`}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {complete ? "Complete" : current ? "Current step" : "Up next"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function isFinal(o: PublicOrder) {
  return (
    o.paymentStatus === "expired" ||
    o.ticketStatus === "cancelled" ||
    o.ticketStatus === "completed"
  );
}

export function OrderStatus({ initial }: { initial: PublicOrder }) {
  const cart = useCart();
  const [order, setOrder] = useState(initial);
  const [lost, setLost] = useState(false);
  const [tick, setTick] = useState(0);

  // Remember this order for the "Your order" shortcut on the menu; forget it once it is finished.
  const finished = isFinal(order);
  useEffect(() => {
    if (finished) clearLastOrder(order.id);
    else saveLastOrder({ id: order.id, orderNumber: order.orderNumber });
  }, [finished, order.id, order.orderNumber]);

  useEffect(() => {
    if (cart.ready) cart.cleanupPaidOrder(order);
  }, [cart, order]);

  useEffect(() => {
    if (isFinal(order)) return;
    const delay = order.paymentStatus === "paid" ? ACTIVE_MS : PENDING_MS;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}`, {
          cache: "no-store",
        });
        if (res.ok) {
          setOrder(await res.json());
          setLost(false);
        } else {
          setLost(true);
        }
      } catch {
        setLost(true);
      }
      setTick((t) => t + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [order, tick]);

  const pickup = new Date(order.pickupTime).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  let headline: string;
  let detail: string;
  if (order.paymentStatus === "pending_payment") {
    headline = "Confirming your payment…";
    detail =
      "This usually takes a few seconds. Keep this page open. If you left checkout without paying, your order will not be sent to the kitchen.";
  } else if (order.paymentStatus === "expired") {
    headline = "This order was not completed.";
    detail =
      "It was not sent to the kitchen. If you see a charge for it, contact the restaurant and they will refund it. You can start a new order.";
  } else if (order.ticketStatus === "cancelled") {
    headline = `Order #${order.orderNumber} was cancelled.`;
    detail =
      "Contact the restaurant if you have questions. Any refund is handled by the restaurant.";
  } else {
    headline = `Order #${order.orderNumber}`;
    detail = TICKET_COPY[order.ticketStatus ?? "received"];
  }

  const ticketStatus = order.ticketStatus;
  const showProgress =
    order.paymentStatus === "paid" && ticketStatus !== "cancelled";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="rounded-card border-2 border-ink bg-paper p-5 shadow-[4px_4px_0_var(--color-ink)] sm:p-8">
        {/* One live region announces status and connection changes without repeating the receipt. */}
        <div role="status" aria-live="polite" aria-atomic="true">
          <h1 className="break-words text-3xl font-black text-brand-blue sm:text-4xl">
            {headline}
          </h1>
          <p className="mt-3 text-lg leading-relaxed">{detail}</p>
          {lost && (
            <p className="mt-3 text-base font-medium text-muted">
              Having trouble reaching the server. Still trying…
            </p>
          )}
        </div>
        {showProgress && (
          <OrderProgress status={ticketStatus ?? "received"} />
        )}
      </div>

      <section
        aria-labelledby="receipt-heading"
        className="mt-8 overflow-hidden rounded-card border-2 border-ink bg-paper"
      >
        <div className="border-b-2 border-ink bg-tile-yellow p-5 sm:px-8 sm:py-6">
          <h2 id="receipt-heading" className="text-xl font-bold">
            Your receipt
          </h2>
          <p className="mt-4 font-bold">
            {showProgress ? "Pickup time" : "Requested pickup time"}
          </p>
          <p className="tabular mt-1 text-2xl font-bold text-brand-blue sm:text-3xl">
            <time dateTime={order.pickupTime}>{pickup}</time>
          </p>
          <p className="mt-1 text-sm text-tile-yellow-ink">
            Houston time · Pickup only
          </p>
        </div>

        <div className="p-5 sm:p-8">
          <h3 className="text-xl font-bold text-brand-blue">
            What you ordered
          </h3>
          <ul className="mt-4 divide-y divide-line">
            {order.lines.map((l, i) => (
              <li key={i} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                <span
                  className="tabular flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-ink bg-cream px-1 font-bold"
                  aria-label={`Quantity ${l.quantity}`}
                >
                  {l.quantity}×
                </span>
                <div className="min-w-0 break-words leading-relaxed">
                  <p className="font-bold">
                    {l.name}
                    {l.sizeName !== "regular" && ` (${l.sizeName})`}
                  </p>
                  {l.components.length > 0 && (
                    <p className="text-muted">{l.components.join(" + ")}</p>
                  )}
                  {l.spicy && (
                    <p className="font-medium text-brand-red">Spicy</p>
                  )}
                  {l.instructions && (
                    <p className="mt-1 text-muted">Note: {l.instructions}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-3 border-t-2 border-ink pt-5">
            <div className="flex justify-between gap-4">
              <dt>Subtotal</dt>
              <dd className="tabular shrink-0">
                {formatCents(order.subtotalCents)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Tax</dt>
              <dd className="tabular shrink-0">
                {formatCents(order.taxCents)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-4 text-2xl font-bold">
              <dt>Total</dt>
              <dd className="tabular shrink-0 text-brand-red">
                {formatCents(order.totalCents)}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
