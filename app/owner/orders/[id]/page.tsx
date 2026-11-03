import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getOwnerOrder } from "@/lib/owner-orders";
import { historyHref, type HistorySearchParams } from "@/lib/owner-order-query";
import { formatCents } from "@/lib/money";
import { OrderTime, ownerLink, ownerPageError, TicketBadge } from "../order-ui";
import CancelOrderButton from "./cancel-order-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order details", robots: { index: false, follow: false } };

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<HistorySearchParams>;
}) {
  const { id } = await params;
  let order;
  try { order = await getOwnerOrder({ headers: await headers() }, id); }
  catch (error) { return ownerPageError(error); }
  return <main className="mx-auto max-w-5xl px-4 py-6 text-lg leading-relaxed text-ink sm:px-8 sm:py-10">
    <Link href={historyHref(await searchParams)} className={ownerLink}>← Back to order history</Link>
    <header className="mt-6 flex flex-wrap items-start justify-between gap-5 border-b-2 border-ink pb-7">
      <div className="min-w-0"><p className="font-bold text-brand-blue">Online order · Paid</p>
        <h1 className="mt-2 break-words text-4xl font-black sm:text-5xl">Order #{order.orderNumber}</h1>
        <p className="mt-3">Paid <OrderTime value={order.paidAt} /> · Central</p></div>
      <TicketBadge status={order.ticketStatus} />
    </header>
    <dl className="my-8 grid gap-5 sm:grid-cols-2">
      <div className="min-w-0 rounded-card border-2 border-ink bg-paper p-5 sm:p-6"><dt className="font-bold text-brand-blue">Customer</dt><dd className="mt-2 break-words text-3xl font-bold">{order.customerName}</dd></div>
      <div className="min-w-0 rounded-card border-2 border-ink bg-tile-yellow p-5 sm:p-6"><dt className="font-bold text-tile-yellow-ink">Pickup · Central</dt><dd className="mt-2 text-2xl font-bold text-brand-blue tabular"><OrderTime value={order.pickupTime} /></dd></div>
      <div className="min-w-0 rounded-xl border border-line bg-paper p-5"><dt className="font-bold">Email</dt><dd className="mt-1 break-all">{order.customerEmail}</dd></div>
      <div className="min-w-0 rounded-xl border border-line bg-paper p-5"><dt className="font-bold">Phone</dt><dd className="mt-1 break-words">{order.customerPhone || "Not provided"}</dd></div>
    </dl>
    <section aria-labelledby="items-title" className="py-2">
      <h2 id="items-title" className="text-3xl font-bold text-brand-blue">Items <span className="text-lg font-normal text-ink">({order.itemCount})</span></h2>
      <ul className="mt-5 divide-y divide-line rounded-card border-2 border-ink bg-paper px-5 sm:px-6">
        {order.lines.map((line, index) => <li key={index} className="anim-rise py-6">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 sm:flex-nowrap">
            <div className="min-w-0 flex-1 basis-full break-words sm:basis-auto"><h3 className="font-sans text-xl font-bold">{line.quantity} × {line.name}</h3>
              <p className="mt-2 text-lg">Size: {line.sizeName} · {formatCents(line.unitPriceCents)} each</p>
              <p className="mt-2 text-lg">{line.spicy ? "Spicy requested" : "No spicy request"}</p>
              {line.components.length > 0 && <p className="mt-1 text-lg">Combo selections: {line.components.join(" + ")}</p>}
              {line.instructions && <p className="mt-2 max-w-prose whitespace-pre-wrap break-words text-lg"><span className="font-bold">Instructions: </span>{line.instructions}</p>}
            </div>
            <p className="ml-auto shrink-0 text-right text-2xl font-bold text-brand-blue tabular">{formatCents(line.unitPriceCents * line.quantity)}</p>
          </div>
        </li>)}
      </ul>
    </section>
    <dl className="ml-auto mt-7 max-w-md space-y-4 rounded-card border-2 border-ink bg-paper p-5 tabular sm:p-6">
      <div className="flex justify-between gap-4"><dt>Subtotal</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
      <div className="flex justify-between gap-4"><dt>Tax</dt><dd>{formatCents(order.taxCents)}</dd></div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t-2 border-ink pt-4 text-2xl font-bold"><dt>Total paid</dt><dd className="ml-auto text-right text-3xl text-brand-blue">{formatCents(order.totalCents)}</dd></div>
    </dl>
    <section className="mt-8 rounded-card border border-line bg-paper p-5 sm:p-6" aria-labelledby="payment-title">
      <h2 id="payment-title" className="text-2xl font-bold text-brand-blue">Payment reference</h2>
      <p className="mt-3 text-lg">Stripe Checkout session</p>
      <p className="mt-2 break-all font-mono text-lg">{order.stripeSessionId || "Not recorded"}</p>
      <p className="mt-4 text-lg">Refunds are handled in the Stripe dashboard. Cancelled tickets keep their original payment record.</p>
    </section>
    {order.ticketStatus !== null && order.ticketStatus !== "cancelled" && <CancelOrderButton orderId={order.id} orderNumber={order.orderNumber} />}
  </main>;
}
