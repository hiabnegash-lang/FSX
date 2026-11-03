import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApiError } from "@/lib/errors";
import type { TicketStatus } from "@/lib/types";
import { btnSecondary } from "@/lib/ui";

export const statusLabels: Record<TicketStatus, string> = {
  received: "Received", in_progress: "In progress", ready: "Ready",
  completed: "Completed", cancelled: "Cancelled",
};
const statusStyles: Record<TicketStatus, string> = {
  received: "bg-status-received text-white", in_progress: "bg-status-progress text-white",
  ready: "bg-status-ready text-white", completed: "bg-tile text-ink", cancelled: "bg-ink text-paper",
};
export const ownerLink = `${btnSecondary} text-lg`;
export const fieldStyle = "mt-2 block min-h-12 min-w-0 w-full max-w-full rounded-lg border-2 border-muted bg-paper px-3 py-2 text-lg font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";

const statusIcons: Record<TicketStatus, string> = {
  received: "M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  in_progress: "M8 3h8M8 21h8M9 3v5l6 8v5M15 3v5l-6 8v5",
  ready: "m5 12 4 4L19 6M4 21h16",
  completed: "m3 12 4 4L17 6m-5 9 3 3 7-8",
  cancelled: "m8 8 8 8m0-8-8 8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
};

export function TicketBadge({ status }: { status: TicketStatus | null }) {
  return <span className={`inline-flex max-w-full items-center gap-2 rounded-xl px-4 py-2 text-lg font-bold transition-colors duration-200 ${status ? statusStyles[status] : "bg-tile text-ink"}`}>
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 shrink-0">
      <path d={status ? statusIcons[status] : "M5 12h14"} />
    </svg>
    {status ? statusLabels[status] : "No ticket"}
  </span>;
}

const dateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short",
});
export function OrderTime({ value }: { value: string | null }) {
  return value ? <time dateTime={value}>{dateTime.format(new Date(value))}</time> : <>Not recorded</>;
}

/** Handle only known public errors; unexpected failures go to the safe error boundary. */
export function ownerPageError(error: unknown) {
  if (!(error instanceof ApiError)) throw error;
  if (error.status === 401) redirect("/login");
  if (error.status === 404) notFound();
  if (error.status !== 400 && error.status !== 403 && error.status !== 503) throw error;
  return <main className="mx-auto max-w-3xl p-6 text-lg leading-relaxed text-ink sm:p-10">
    <h1 className="text-3xl font-bold text-brand-blue">{error.status === 403 ? "Owner access required" : error.status === 400 ? "Check your filters" : "Orders are unavailable"}</h1>
    <p role="alert" className="mt-4">{error.status === 403 ? "This account cannot view customer order history." : error.status === 400 ? "Use valid dates with the start on or before the end, a ticket status, and a positive page number. Search is limited to 100 characters." : "We could not load orders. Please try again shortly."}</p>
    <Link href={error.status === 403 ? "/staff" : "/owner/orders"} className={`${ownerLink} mt-4`}>
      {error.status === 403 ? "Go to kitchen" : "Return to order history"}
    </Link>
  </main>;
}
