import { requireRole, type AuthRequest } from "./auth";
import { createClient } from "./supabase/server";
import { usingStub } from "./data/mode";
import { store } from "./data";
import { ApiError } from "./errors";
import {
  completeReport,
  centralDay,
  reportRange,
  reportSchema,
  type ReportData,
} from "./owner-report-model";

export async function readOwnerReports(request: AuthRequest, raw: unknown) {
  await requireRole(request, ["owner"]);
  let range;
  try {
    range = reportRange(raw);
  } catch {
    throw new ApiError(
      400,
      "invalid_dates",
      "Choose valid start and end dates, in order, covering no more than 366 days.",
    );
  }
  let report: ReportData;
  if (usingStub()) {
    report = {
      summary: { orders: 0, sales: 0, tax: 0, collected: 0 },
      daily: [],
      items: [],
      hourly: [],
    };
    // Explicit local fixture mode still exercises every page of the same paid-order store.
    for (let page = 1; ; page++) {
      const batch = await store.listOrders({
        from: range.from,
        to: range.to,
        page,
        pageSize: 100,
      });
      for (const order of batch.orders) {
        if (
          order.paymentStatus !== "paid" ||
          order.ticketStatus === "cancelled" ||
          !order.paidAt
        )
          continue;
        report.summary.orders++;
        report.summary.sales += order.subtotalCents;
        report.summary.tax += order.taxCents;
        report.summary.collected += order.totalCents;
        const day = centralDay(new Date(order.paidAt));
        let daily = report.daily.find((d) => d.day === day);
        if (!daily) {
          daily = { day, orders: 0, sales: 0, tax: 0, collected: 0 };
          report.daily.push(daily);
        }
        daily.orders++;
        daily.sales += order.subtotalCents;
        daily.tax += order.taxCents;
        daily.collected += order.totalCents;
        const hour = Number(
          new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Chicago",
            hour: "2-digit",
            hourCycle: "h23",
          }).format(new Date(order.paidAt)),
        );
        const hourly = report.hourly.find((h) => h.hour === hour);
        if (hourly) hourly.orders++;
        else report.hourly.push({ hour, orders: 1 });
        for (const line of order.lines) {
          const item = report.items.find((i) => i.code === line.itemCode);
          if (item) {
            item.quantity += line.quantity;
            item.revenue += line.quantity * line.unitPriceCents;
          } else
            report.items.push({
              code: line.itemCode,
              name: line.nameSnapshot,
              quantity: line.quantity,
              revenue: line.quantity * line.unitPriceCents,
            });
        }
      }
      if (page * 100 >= batch.total) break;
    }
  } else {
    const db = await createClient();
    const { data, error } = await db.rpc("owner_operational_reports", {
      p_start: range.start,
      p_end: range.end,
    });
    if (error)
      throw new ApiError(
        503,
        "reports_unavailable",
        "Reports are temporarily unavailable. Please try again.",
      );
    const parsed = reportSchema.safeParse(data);
    if (!parsed.success)
      throw new ApiError(
        503,
        "reports_unavailable",
        "Reports are temporarily unavailable. Please try again.",
      );
    report = parsed.data;
  }
  return { ...range, data: completeReport(report, range.start, range.end) };
}
