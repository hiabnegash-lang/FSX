import { formatCents } from "@/lib/money";
import type { ReportData } from "@/lib/owner-report-model";

/** Server-rendered charts with the same data available in semantic tables. No client bundle. */
export function SalesChart({ daily }: { daily: ReportData["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => d.sales));
  const x = (i: number) => 56 + (i / Math.max(1, daily.length - 1)) * 670;
  const y = (n: number) => 200 - (n / max) * 166;
  const points = daily.map((d, i) => `${x(i)},${y(d.sales)}`).join(" ");
  return (
    <figure className="mt-5">
      <svg
        viewBox="0 0 750 244"
        role="img"
        aria-label={`Daily online sales excluding tax, from ${daily[0]?.day} through ${daily.at(-1)?.day}. Exact figures in the daily table below.`}
        className="w-full text-brand-blue"
      >
        {[0, 0.5, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1="56"
              y1={y(max * fraction)}
              x2="726"
              y2={y(max * fraction)}
              className="stroke-line"
            />
            <text
              x="50"
              y={y(max * fraction) + 4}
              textAnchor="end"
              className="fill-muted text-[11px]"
            >
              {formatCents(Math.round(max * fraction))}
            </text>
          </g>
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {daily.length === 1 && (
          <circle cx={x(0)} cy={y(daily[0].sales)} r="4" fill="currentColor" />
        )}
        <text x="56" y="232" className="fill-muted text-[12px]">
          {daily[0]?.day}
        </text>
        <text
          x="726"
          y="232"
          textAnchor="end"
          className="fill-muted text-[12px]"
        >
          {daily.at(-1)?.day}
        </text>
      </svg>
      <figcaption className="text-xs text-muted">
        Payment date · Central time · USD · Online orders only
      </figcaption>
    </figure>
  );
}
export function ItemBars({
  items,
  by,
}: {
  items: ReportData["items"];
  by: "quantity" | "revenue";
}) {
  const max = Math.max(1, ...items.map((i) => i[by]));
  return (
    <ol className="mt-5 space-y-4">
      {items.map((i) => (
        <li key={i.code}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="font-semibold">
              {i.code} · {i.name}
            </span>
            <span className="shrink-0 tabular">
              {by === "revenue" ? formatCents(i.revenue) : `${i.quantity} sold`}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded bg-tile"
            aria-hidden="true"
          >
            <div
              className="h-full rounded bg-brand-blue"
              style={{ width: `${(i[by] / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
