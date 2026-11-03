"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LAST_ORDER_CHANGED, msUntilExpiry, readLastOrder, type LastOrder } from "@/lib/last-order";
import { btnSecondary } from "@/lib/ui";

/** "Your order #0042" shortcut back to the order page, shown only on a device that has a recent order. */
export function LastOrderLink({ className = "" }: { className?: string }) {
  // Read after load: storage doesn't exist on the server, and the server and browser must render the same.
  const [order, setOrder] = useState<LastOrder | null>(null);
  // Stay in step with storage: this page saving or clearing the order (event), another tab doing so
  // (storage event), and the 12-hour expiry (timer) all update the link without a page change.
  useEffect(() => {
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      if (expiry) clearTimeout(expiry);
      const current = readLastOrder();
      setOrder(current);
      if (current) expiry = setTimeout(sync, msUntilExpiry(current, Date.now()));
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(LAST_ORDER_CHANGED, sync);
    return () => {
      if (expiry) clearTimeout(expiry);
      window.removeEventListener("storage", sync);
      window.removeEventListener(LAST_ORDER_CHANGED, sync);
    };
  }, []);
  if (!order) return null;
  return (
    <Link
      href={`/order/${order.id}`}
      className={`${btnSecondary} text-sm ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-4 w-4 shrink-0"
      >
        <path
          d="M7 3h10v18l-2.5-2-2.5 2-2.5-2L7 21V3Z"
          strokeLinejoin="round"
        />
        <path d="M10 8h4m-4 4h4" strokeLinecap="round" />
      </svg>
      Your order #{order.orderNumber}
    </Link>
  );
}
