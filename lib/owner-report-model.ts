import { z } from "zod";
import { centralMidnight } from "./owner-order-query";

export function centralDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function shiftDay(day: string, amount: number) {
  const value = new Date(`${day}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
export function reportRange(raw: unknown, now = new Date()) {
  const end = centralDay(now);
  return z
    .object({
      start: z.iso.date().default(shiftDay(end, -29)),
      end: z.iso.date().default(end),
    })
    .refine(
      (v) =>
        v.start >= "2000-01-01" &&
        v.end <= "9998-12-31" &&
        v.start <= v.end &&
        Date.parse(v.end) - Date.parse(v.start) < 366 * 86400000,
      "Choose dates in order, covering no more than 366 days.",
    )
    .transform((v) => ({
      ...v,
      from: centralMidnight(v.start),
      to: centralMidnight(v.end, true),
    }))
    .parse(raw);
}
const cents = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const reportSchema = z.object({
  summary: z.object({
    orders: cents,
    sales: cents,
    tax: cents,
    collected: cents,
  }),
  daily: z.array(
    z.object({
      day: z.iso.date(),
      orders: cents,
      sales: cents,
      tax: cents,
      collected: cents,
    }),
  ),
  items: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      quantity: cents,
      revenue: cents,
    }),
  ),
  hourly: z.array(
    z.object({ hour: z.number().int().min(0).max(23), orders: cents }),
  ),
});
export type ReportData = z.output<typeof reportSchema>;
export function completeReport(
  data: ReportData,
  start: string,
  end: string,
): ReportData {
  const daily = new Map(data.daily.map((d) => [d.day, d]));
  const days: ReportData["daily"] = [];
  for (let day = start; day <= end; day = shiftDay(day, 1))
    days.push(
      daily.get(day) ?? { day, orders: 0, sales: 0, tax: 0, collected: 0 },
    );
  return {
    ...data,
    daily: days,
    hourly: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      orders: data.hourly.find((h) => h.hour === hour)?.orders ?? 0,
    })),
  };
}
export function topItems(data: ReportData, by: "quantity" | "revenue") {
  return [...data.items]
    .sort((a, b) => b[by] - a[by] || a.code.localeCompare(b.code))
    .slice(0, 10);
}
// CSV is spreadsheet-safe as item names are owner-controlled text.
export function csvCell(value: string | number) {
  const text = String(value);
  const safe =
    typeof value === "string" && /^[\s]*[=+@\-\t\r\n]/.test(text)
      ? `'${text}`
      : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function reportCsv(
  data: ReportData,
  kind: "daily" | "items" | "hourly",
) {
  const dollars = (v: number) => (v / 100).toFixed(2);
  const rows: (string | number)[][] =
    kind === "daily"
      ? [
          [
            "Day (Central)",
            "Paid orders",
            "Sales USD (excl tax)",
            "Tax USD",
            "Collected USD",
          ],
          ...data.daily.map((d) => [
            d.day,
            d.orders,
            dollars(d.sales),
            dollars(d.tax),
            dollars(d.collected),
          ]),
        ]
      : kind === "items"
        ? [
            [
              "Item code",
              "Historical item name",
              "Quantity",
              "Sales USD (excl tax)",
            ],
            ...data.items.map((i) => [
              i.code,
              i.name,
              i.quantity,
              dollars(i.revenue),
            ]),
          ]
        : [
            ["Hour (Central)", "Paid orders"],
            ...data.hourly.map((h) => [h.hour, h.orders]),
          ];
  return (
    [
      [
        "Online orders only · paid, non-cancelled · payment date · America/Chicago · USD",
      ],
      ...rows,
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n") + "\r\n"
  );
}
