import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { listOwnerOrders } from "@/lib/owner-orders";
import { historyHref, type HistorySearchParams } from "@/lib/owner-order-query";
import { formatCents } from "@/lib/money";
import { btnPrimary } from "@/lib/ui";
import { fieldStyle, OrderTime, ownerLink, ownerPageError, statusLabels, TicketBadge } from "./order-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order history", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<HistorySearchParams> }) {
  const raw = await searchParams;
  let result;
  try {
    result = await listOwnerOrders({ headers: await headers() }, raw, true);
  } catch (error) { return ownerPageError(error); }
  const { orders, total, page, pageSize } = result;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const value = (key: string) => typeof raw[key] === "string" ? raw[key] : "";
  const returnQuery = historyHref(raw).split("?")[1];
  const outOfRange = page > pages;
  return <main className="mx-auto max-w-7xl px-4 py-6 text-lg leading-relaxed text-ink sm:px-8 sm:py-10">
    <Link href="/owner" className={ownerLink}>← Owner dashboard</Link>
    <header className="mt-5 border-b-2 border-ink pb-6">
      <p className="font-bold text-brand-blue">Menciu&apos;s Chopstix · Owner</p>
      <h1 className="mt-2 text-4xl font-black sm:text-5xl">Order history</h1>
      <p className="mt-3">Online paid orders, including cancelled tickets. All times are Central.</p>
    </header>
    <form action="/owner/orders" method="get" className="my-8 grid gap-6 rounded-card border-2 border-ink bg-paper p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
      <label className="min-w-0 font-bold">Customer or order number
        <input type="search" name="q" maxLength={100} defaultValue={value("q")} placeholder="Name or #0042" className={fieldStyle} />
      </label>
      <label className="min-w-0 font-bold">Payment date from
        <input type="date" name="start" min="1000-01-01" max="9998-12-31" defaultValue={value("start")} className={fieldStyle} />
      </label>
      <label className="min-w-0 font-bold">Payment date through
        <input type="date" name="end" min="1000-01-01" max="9998-12-31" defaultValue={value("end")} className={fieldStyle} />
      </label>
      <label className="min-w-0 font-bold">Ticket status
        <select name="status" defaultValue={value("status")} className={fieldStyle}>
          <option value="">All statuses</option>
          {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2 xl:col-span-4">
        <button type="submit" className={btnPrimary}>Apply filters</button>
        <Link href="/owner/orders" className={ownerLink}>Clear filters</Link>
        <p className="text-lg">Dates include the whole selected day in Central time.</p>
      </div>
    </form>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-2xl font-bold">{total} {total === 1 ? "order" : "orders"} found</p>
      {!outOfRange && total > 0 && <p className="text-lg">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}</p>}
    </div>
    {outOfRange ? <section className="rounded-card border-2 border-ink bg-paper p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-brand-blue">This page has no orders</h2>
      <Link href={historyHref(raw, 1)} className={`${ownerLink} mt-3`}>Go to the first page</Link>
    </section> : orders.length === 0 ? <section className="rounded-card border-2 border-ink bg-paper p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-brand-blue">No orders match these filters</h2>
      <p className="mt-2">Try another customer name, widen the payment dates, or clear the filters.</p>
      <Link href="/owner/orders" className={`${ownerLink} mt-3`}>View all paid orders</Link>
    </section> : <>
      <ul aria-label="Online paid orders, newest payment first" className="grid gap-5 md:grid-cols-2 xl:hidden">
        {orders.map((order) => <li key={order.id} className="anim-rise min-w-0 rounded-card border-2 border-ink bg-paper p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link className={`${ownerLink} tabular`} href={`/owner/orders/${order.id}${returnQuery ? `?${returnQuery}` : ""}`}>#{order.orderNumber}</Link>
            <TicketBadge status={order.ticketStatus} />
          </div>
          <h2 className="mt-5 break-words font-sans text-2xl font-bold">{order.customerName}</h2>
          <dl className="mt-4 space-y-3">
            <div><dt className="font-bold">Paid · Central</dt><dd className="tabular"><OrderTime value={order.paidAt} /></dd></div>
            <div className="flex justify-between gap-4"><dt>Items</dt><dd className="tabular font-bold">{order.itemCount}</dd></div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3"><dt className="font-bold">Total</dt><dd className="tabular text-right text-2xl font-bold text-brand-blue">{formatCents(order.totalCents)}</dd></div>
          </dl>
        </li>)}
      </ul>
      <div className="anim-rise hidden rounded-card border-2 border-ink bg-paper xl:block">
      <table className="w-full table-fixed text-left">
        <caption className="sr-only">Online paid orders, newest payment first. Select an order number to view details. Dates and times are Central.</caption>
        <colgroup><col className="w-[14%]" /><col className="w-[22%]" /><col className="w-[22%]" /><col className="w-[8%]" /><col className="w-[14%]" /><col className="w-[20%]" /></colgroup>
        <thead className="border-b-2 border-ink bg-tile text-lg">
          <tr>{["Order", "Paid · Central", "Customer", "Items", "Total", "Ticket status"].map((label) => <th key={label} scope="col" className={`px-4 py-5 ${label === "Total" ? "text-right" : ""}`}>{label}</th>)}</tr>
        </thead>
        <tbody>{orders.map((order) => <tr key={order.id} className="border-b border-line last:border-0 hover:bg-cream focus-within:bg-cream">
          <th scope="row" className="px-4 py-5"><Link className={`${ownerLink} tabular`} href={`/owner/orders/${order.id}${returnQuery ? `?${returnQuery}` : ""}`}>#{order.orderNumber}</Link></th>
          <td className="px-4 py-5 text-lg tabular"><OrderTime value={order.paidAt} /></td>
          <td className="break-words px-4 py-5 text-xl font-bold">{order.customerName}</td>
          <td className="px-4 py-5 tabular">{order.itemCount}</td>
          <td className="px-4 py-5 text-right text-2xl font-bold text-brand-blue tabular">{formatCents(order.totalCents)}</td>
          <td className="px-4 py-5"><TicketBadge status={order.ticketStatus} /></td>
        </tr>)}</tbody>
      </table>
    </div></>}
    {!outOfRange && <nav aria-label="Order history pages" className="mt-8 flex flex-wrap items-center justify-between gap-4">
      {page > 1 ? <Link href={historyHref(raw, page - 1)} className={ownerLink} rel="prev">← Previous</Link> : <span className="px-2 text-muted" aria-disabled="true">← Previous</span>}
      <p className="order-first w-full text-center text-lg tabular sm:order-none sm:w-auto">Page {page} of {pages} · 25 per page</p>
      {page < pages ? <Link href={historyHref(raw, page + 1)} className={ownerLink} rel="next">Next →</Link> : <span className="px-2 text-muted" aria-disabled="true">Next →</span>}
    </nav>}
  </main>;
}
