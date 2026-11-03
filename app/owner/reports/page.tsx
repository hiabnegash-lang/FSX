import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readOwnerReports } from "@/lib/owner-reports";
import { centralDay, shiftDay, topItems } from "@/lib/owner-report-model";
import { ApiError } from "@/lib/errors";
import { formatCents } from "@/lib/money";
import { SalesChart, ItemBars } from "./report-charts";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Operational reports",
  robots: { index: false, follow: false },
};
const button =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-paper px-4 py-2 font-semibold text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";
const field =
  "mt-1 block min-h-11 w-full rounded-md border border-muted bg-paper px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";
const panel = "rounded-lg border border-line bg-paper p-5 sm:p-6";
const cell = "px-4 py-3 tabular";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let result;
  try {
    result = await readOwnerReports(
      { headers: await headers() },
      await searchParams,
    );
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 401) redirect("/login");
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-3xl font-bold">
          {error.status === 403
            ? "Owner access required"
            : error.status === 400
              ? "Check report dates"
              : "Reports unavailable"}
        </h1>
        <p className="my-4" role="alert">
          {error.message}
        </p>
        <Link
          href={error.status === 403 ? "/staff" : "/owner/reports"}
          className={button}
        >
          {error.status === 403 ? "Go to kitchen" : "Reset reports"}
        </Link>
      </main>
    );
  }
  const { data, start, end } = result;
  const today = centralDay();
  const params = new URLSearchParams({ start, end }).toString();
  const exportLink = (kind: string) =>
    `/api/owner/reports/export?${params}&kind=${kind}`;
  const average = data.summary.orders
    ? Math.round(data.summary.sales / data.summary.orders)
    : 0;
  const hourlyMax = Math.max(1, ...data.hourly.map((h) => h.orders));
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <nav
        aria-label="Owner navigation"
        className="mb-6 flex flex-wrap gap-3 text-sm"
      >
        <Link href="/owner" className={button}>
          Dashboard
        </Link>
        <Link href="/owner/orders" className={button}>
          Orders
        </Link>
        <Link href="/owner/menu" className={button}>
          Menu & prices
        </Link>
        <Link
          href="/owner/reports"
          aria-current="page"
          className={`${button} border-brand-blue`}
        >
          Reports
        </Link>
      </nav>
      <header className="border-b-2 border-ink pb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-blue">
          Menciu&apos;s Chopstix · Owner
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
          Operational reports
        </h1>
        <p className="mt-2 font-semibold text-brand-blue">Online orders only</p>
        <p className="mt-1 text-sm text-muted">
          Paid orders, excluding cancelled tickets. Based on payment date in
          Central time.
        </p>
      </header>
      <section aria-label="Report dates" className={`${panel} my-6`}>
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ["Today", 0],
            ["Last 7 days", 6],
            ["Last 30 days", 29],
          ].map(([label, days]) => (
            <Link
              key={label}
              className={button}
              href={`/owner/reports?start=${shiftDay(today, -Number(days))}&end=${today}`}
            >
              {label}
            </Link>
          ))}
        </div>
        <form
          method="get"
          action="/owner/reports"
          className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <label className="text-sm font-semibold">
            Payment date from
            <input
              className={field}
              name="start"
              type="date"
              required
              min="2000-01-01"
              max="9998-12-31"
              defaultValue={start}
            />
          </label>
          <label className="text-sm font-semibold">
            Payment date through
            <input
              className={field}
              name="end"
              type="date"
              required
              min="2000-01-01"
              max="9998-12-31"
              defaultValue={end}
            />
          </label>
          <button
            className={`${button} border-brand-blue bg-brand-blue text-white`}
          >
            Apply dates
          </button>
        </form>
        <p className="mt-3 text-xs text-muted">
          Both dates are included. Choose up to 366 days. Refresh or apply dates
          to load the latest payments.
        </p>
      </section>
      <dl className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Sales", formatCents(data.summary.sales), "Excluding tax"],
          ["Paid orders", data.summary.orders, "Cancelled orders excluded"],
          [
            "Average order value",
            formatCents(average),
            "Sales ÷ paid orders, before tax",
          ],
          [
            "Collected",
            formatCents(data.summary.collected),
            `Includes ${formatCents(data.summary.tax)} tax`,
          ],
        ].map(([label, value, note]) => (
          <div className={panel} key={label}>
            <dt className="text-sm font-semibold text-muted">{label}</dt>
            <dd className="mt-2 text-3xl font-bold tabular">{value}</dd>
            <p className="mt-2 text-xs text-muted">{note}</p>
          </div>
        ))}
      </dl>
      {data.summary.orders === 0 && (
        <section className={`${panel} mb-6`}>
          <h2 className="text-xl font-bold">No paid orders in this period</h2>
          <p className="mt-2 text-muted">
            Try a wider date range. Unpaid and cancelled orders do not count
            toward these reports.
          </p>
        </section>
      )}
      <section className={`${panel} mb-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Sales over time</h2>
            <p className="mt-1 text-xs text-muted">
              Online orders only · Sales exclude tax
            </p>
          </div>
          <a className={button} href={exportLink("daily")}>
            Export daily CSV ↓
          </a>
        </div>
        <SalesChart daily={data.daily} />
        <details className="mt-4 border-t border-line pt-3">
          <summary className="min-h-11 cursor-pointer font-semibold text-brand-blue">
            View daily figures
          </summary>
          <div
            className="overflow-x-auto"
            role="region"
            aria-label="Daily sales table"
            tabIndex={0}
          >
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Online orders only, daily sales in USD by Central payment date
              </caption>
              <thead className="border-b border-line">
                <tr>
                  {[
                    "Date · Central",
                    "Orders",
                    "Sales",
                    "Tax",
                    "Collected",
                  ].map((label) => (
                    <th key={label} scope="col" className={cell}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.daily.map((d) => (
                  <tr key={d.day} className="border-b border-line">
                    <th scope="row" className={cell}>
                      {d.day}
                    </th>
                    <td className={cell}>{d.orders}</td>
                    <td className={cell}>{formatCents(d.sales)}</td>
                    <td className={cell}>{formatCents(d.tax)}</td>
                    <td className={cell}>{formatCents(d.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {(["quantity", "revenue"] as const).map((by) => (
          <section className={panel} key={by}>
            <h2 className="text-xl font-bold">
              Top 10 items by {by === "quantity" ? "quantity" : "sales"}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Online orders only · Historical sale prices, excluding tax
            </p>
            {data.items.length ? (
              <ItemBars items={topItems(data, by)} by={by} />
            ) : (
              <p className="mt-5 text-sm text-muted">
                Items will appear after a paid order.
              </p>
            )}
          </section>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap justify-end gap-3">
        <a href={exportLink("items")} className={button}>
          Export all item sales CSV ↓
        </a>
      </div>
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Orders by hour</h2>
            <p className="mt-1 text-xs text-muted">
              Online orders only · Payment hour, Central time · Counts across
              all selected days
            </p>
          </div>
          <a className={button} href={exportLink("hourly")}>
            Export hourly CSV ↓
          </a>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.hourly.map((h) => (
            <div key={h.hour} className="flex items-center gap-3 text-sm">
              <span className="w-12 shrink-0 tabular">
                {String(h.hour).padStart(2, "0")}:00
              </span>
              <div className="h-2 flex-1 rounded bg-tile" aria-hidden="true">
                <div
                  className="h-full rounded bg-brand-blue"
                  style={{ width: `${(h.orders / hourlyMax) * 100}%` }}
                />
              </div>
              <span
                className="w-8 text-right tabular"
                aria-label={`${h.orders} orders`}
              >
                {h.orders}
              </span>
            </div>
          ))}
        </div>
      </section>
      <p className="mt-6 text-sm text-muted">
        Figures use the names and prices recorded at sale. Walk-in sales and
        refunds issued directly in Stripe are outside this report. Cancel the
        corresponding ticket to exclude it.
      </p>
    </main>
  );
}
