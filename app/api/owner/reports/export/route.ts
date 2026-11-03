import { readOwnerReports } from "@/lib/owner-reports";
import { reportCsv } from "@/lib/owner-report-model";
import { ApiError, errorResponse } from "@/lib/errors";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind") ?? "daily";
    if (kind !== "daily" && kind !== "items" && kind !== "hourly")
      throw new ApiError(
        400,
        "invalid_report",
        "Choose daily, items or hourly.",
      );
    const raw = Object.fromEntries(
      ["start", "end"]
        .filter((k) => params.has(k))
        .map((k) => [k, params.get(k)]),
    );
    const result = await readOwnerReports(request, raw);
    return new Response("\uFEFF" + reportCsv(result.data, kind), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="online_orders_${kind}_${result.start}_${result.end}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
