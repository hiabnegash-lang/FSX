"use client";

import Link from "next/link";
import { orderStage, shortcutLabel } from "@/lib/order-shortcut";
import { orderStatusLink } from "@/lib/ui";
import { useOrderShortcut } from "./order-shortcut-provider";
import { OrderStageArt } from "./order-stage-art";

/** The current step is readable without opening the full receipt. */
export function LastOrderLink({ className = "" }: { className?: string }) {
  const { order, status, unavailable } = useOrderShortcut();
  if (!order) return null;
  const stage = status && !unavailable ? orderStage(status) : null;
  const label = unavailable ? "Status unavailable" : status ? shortcutLabel(status) : "Checking status…";
  return (
    <Link href={`/order/${order.id}`} className={`${orderStatusLink} ${className}`}>
      {stage ? <OrderStageArt key={stage} stage={stage} compact /> : (
        <svg aria-hidden="true" viewBox="0 0 32 32" className="h-8 w-8 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 4h16v24l-4-2-4 2-4-2-4 2V4Z" strokeLinejoin="round" />
          <path d="M12 11h8m-8 5h8" strokeLinecap="round" />
        </svg>
      )}
      <span className="min-w-0 text-left">
        <span className="block text-xs font-medium text-muted">Your order #{order.orderNumber}</span>
        <span className="block text-sm font-bold leading-snug">{label}</span>
      </span>
      <span aria-hidden="true" className="ml-1 hidden text-lg sm:block">→</span>
    </Link>
  );
}
