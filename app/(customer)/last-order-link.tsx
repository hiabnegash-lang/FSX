"use client";

import Link from "next/link";
import { orderStage, shortcutLabel } from "@/lib/order-shortcut";
import { orderStatusLink } from "@/lib/ui";
import { useOrderShortcut } from "./order-shortcut-provider";
import { OrderStageArt } from "./order-stage-art";

/** The current step is readable without opening the full receipt. */
export function LastOrderLink({ className = "" }: { className?: string }) {
  const { order, status, unavailable, motionPaused, toggleMotion } = useOrderShortcut();
  if (!order) return null;
  const stage = status && !unavailable ? orderStage(status) : null;
  const label = unavailable ? "Status unavailable" : status ? shortcutLabel(status) : "Checking status…";
  return (
    <div className={`${orderStatusLink} ${className}`}>
      {stage ? <button type="button" onClick={toggleMotion}
        aria-label={motionPaused ? "Play order animation" : "Pause order animation"}
        title={motionPaused ? "Play order animation" : "Pause order animation"}
        className="relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
        <OrderStageArt key={stage} stage={stage} compact />
        <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-paper text-[10px] font-bold">{motionPaused ? "▶" : "Ⅱ"}</span>
      </button> : (
        <svg aria-hidden="true" viewBox="0 0 32 32" className="h-8 w-8 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 4h16v24l-4-2-4 2-4-2-4 2V4Z" strokeLinejoin="round" />
          <path d="M12 11h8m-8 5h8" strokeLinecap="round" />
        </svg>
      )}
      <Link href={`/order/${order.id}`} className="flex min-h-11 min-w-0 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
      <span className="min-w-0 text-left">
        <span className="block text-xs font-medium text-muted">Your order #{order.orderNumber}</span>
        <span className="block text-sm font-bold leading-snug">{label}</span>
      </span>
      <span aria-hidden="true" className="ml-1 hidden text-lg sm:block">→</span>
      </Link>
    </div>
  );
}
