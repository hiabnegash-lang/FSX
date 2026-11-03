"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { clearLastOrder, LAST_ORDER_CHANGED, msUntilExpiry, readLastOrder, type LastOrder } from "@/lib/last-order";
import { parseShortcutStatus, type ShortcutStatus } from "@/lib/order-shortcut";

type Snapshot = ShortcutStatus & { orderNumber: string };
const ShortcutContext = createContext<{
  order: (LastOrder | Snapshot) | null;
  status: ShortcutStatus | null;
  unavailable: boolean;
  motionPaused: boolean;
  toggleMotion: () => void;
  publish: (order: Snapshot, unavailable?: boolean) => void;
} | null>(null);

/** One refresh owner for both responsive header links. The order page owns its existing polling. */
export function OrderShortcutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [saved, setSaved] = useState<LastOrder | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const toggleMotion = useCallback(() => setMotionPaused((paused) => !paused), []);
  const publish = useCallback((order: Snapshot, unavailable = false) => { setSnapshot(order); setUnavailable(unavailable); }, []);
  const onOrderPage = pathname.startsWith("/order/");

  useEffect(() => {
    const syncMotion = () => {
      document.documentElement.dataset.orderMotionPaused = String(document.hidden || motionPaused);
    };
    syncMotion();
    document.addEventListener("visibilitychange", syncMotion);
    return () => {
      document.removeEventListener("visibilitychange", syncMotion);
      delete document.documentElement.dataset.orderMotionPaused;
    };
  }, [motionPaused]);

  useEffect(() => {
    let expiry: ReturnType<typeof setTimeout>;
    const sync = () => {
      clearTimeout(expiry);
      const current = readLastOrder();
      setSaved(current);
      if (current) expiry = setTimeout(sync, msUntilExpiry(current, Date.now()));
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(LAST_ORDER_CHANGED, sync);
    return () => { clearTimeout(expiry); window.removeEventListener("storage", sync); window.removeEventListener(LAST_ORDER_CHANGED, sync); };
  }, []);

  const id = saved?.id;
  const orderNumber = saved?.orderNumber;
  useEffect(() => {
    if (!id || !orderNumber || onOrderPage) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let request: AbortController | undefined;
    const refresh = async () => {
      if (document.hidden || stopped) return;
      const controller = new AbortController();
      request = controller;
      let delay = 10_000;
      try {
        const response = await fetch(`/api/orders/${id}`, { cache: "no-store", signal: controller.signal });
        const status = response.ok ? parseShortcutStatus(await response.json(), id) : null;
        if (stopped || controller.signal.aborted) return;
        if (!status) throw new Error("Order status unavailable");
        publish({ ...status, orderNumber });
        if (status.paymentStatus === "expired" || status.ticketStatus === "cancelled" || status.ticketStatus === "completed") {
          stopped = true;
          clearLastOrder(id);
          return;
        }
        if (status.paymentStatus === "pending_payment") delay = 3_000;
      } catch {
        if (stopped || controller.signal.aborted) return;
        setUnavailable(true);
      }
      if (!document.hidden && !stopped) timer = setTimeout(refresh, delay);
    };
    const visibility = () => {
      clearTimeout(timer);
      request?.abort();
      if (!document.hidden) void refresh();
    };
    void refresh();
    document.addEventListener("visibilitychange", visibility);
    return () => { stopped = true; clearTimeout(timer); request?.abort(); document.removeEventListener("visibilitychange", visibility); };
  }, [id, orderNumber, onOrderPage, publish]);

  const pageSnapshot = onOrderPage && snapshot && pathname === `/order/${snapshot.id}` ? snapshot : null;
  const order = pageSnapshot ?? saved;
  const status = order && snapshot?.id === order.id ? snapshot : null;
  return <ShortcutContext.Provider value={{ order, status, unavailable, publish, motionPaused, toggleMotion }}>{children}</ShortcutContext.Provider>;
}

export function useOrderShortcut() {
  const context = useContext(ShortcutContext);
  if (!context) throw new Error("OrderShortcutProvider is required");
  return context;
}
