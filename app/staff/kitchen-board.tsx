"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchOpenTickets, KitchenError } from "@/lib/kitchen-api";
import { boardColumns, clockOffsetMs, newTicketIds } from "@/lib/kitchen-board";
import type { KitchenTicket } from "@/lib/views";
import { createChime, type Chime } from "./new-order-sound";
import { TicketCard } from "./ticket-card";

// Polls GET /api/staff/tickets every 2 s (paid orders must show within 5 s, RTM F15). The server
// checks the role on every request; this component only reacts to what it answers.

const POLL_MS = 2_000;
const TICK_MS = 5_000; // the timers show whole minutes, so a 5 s tick is plenty

type LoadState = "loading" | "ready" | "error";

export function KitchenBoard() {
  const router = useRouter();
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [connectionLost, setConnectionLost] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [offsetMs, setOffsetMs] = useState(0);
  const [localNow, setLocalNow] = useState(() => Date.now());
  const [soundOn, setSoundOn] = useState(false);
  const [soundError, setSoundError] = useState(false);

  // Read inside poll() without re-creating it, so toggling sound does not restart polling.
  const chime = useRef<Chime | null>(null);
  const soundOnRef = useRef(false);
  const seenIds = useRef<Set<string> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const stopped = useRef(false);

  const leave = useCallback(() => {
    stopped.current = true;
    router.replace("/login");
  }, [router]);

  /** One fetch, then schedule the next one. A newer call cancels an older one, so polls never pile up. */
  const poll = useCallback(async () => {
    if (stopped.current) return;
    if (timer.current) clearTimeout(timer.current);
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const mine = ++generation.current;

    try {
      const result = await fetchOpenTickets(controller.signal);
      if (mine !== generation.current) return;
      const fresh = newTicketIds(seenIds.current, result.tickets);
      if (fresh.size > 0 && soundOnRef.current) chime.current?.play();
      setTickets(result.tickets);
      setFreshIds(fresh);
      seenIds.current = new Set(result.tickets.map((t) => t.id));
      setOffsetMs(clockOffsetMs(result.serverDate, Date.now()));
      setLocalNow(Date.now());
      setLoadState("ready");
      setConnectionLost(false);
    } catch (err) {
      if (controller.signal.aborted || mine !== generation.current) return;
      if (err instanceof KitchenError && (err.kind === "signed_out" || err.kind === "forbidden")) {
        leave();
        return;
      }
      // Keep the last good tickets on screen; only the first load shows a full error.
      if (seenIds.current === null) setLoadState("error");
      else setConnectionLost(true);
    }

    if (mine === generation.current && !stopped.current && document.visibilityState === "visible") {
      timer.current = setTimeout(poll, POLL_MS);
    }
  }, [leave]);

  // Start polling, pause while the tab is hidden, and fetch straight away when it comes back.
  useEffect(() => {
    stopped.current = false;
    function pause() {
      if (timer.current) clearTimeout(timer.current);
      inFlight.current?.abort();
      generation.current += 1;
    }
    function onVisibility() {
      if (document.visibilityState === "visible") void poll();
      else pause();
    }
    if (document.visibilityState === "visible") void poll();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped.current = true;
      document.removeEventListener("visibilitychange", onVisibility);
      pause();
    };
  }, [poll]);

  // Move the timers and the late check along between polls.
  useEffect(() => {
    const id = setInterval(() => setLocalNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const nowMs = localNow + offsetMs;
  const refresh = () => void poll();

  async function toggleSound() {
    if (soundOn) {
      soundOnRef.current = false;
      setSoundOn(false);
      return;
    }
    chime.current ??= createChime();
    const works = await chime.current.enable(); // this tap is the interaction browsers require
    soundOnRef.current = works;
    setSoundOn(works);
    setSoundError(!works);
  }

  const soundToggle = (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        aria-pressed={soundOn}
        onClick={toggleSound}
        className="sticker inline-flex min-h-12 items-center justify-center rounded-full bg-paper px-5 text-lg font-bold text-ink focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-mustard"
      >
        New-order sound: {soundOn ? "On" : "Off"}
      </button>
      {soundError && <p role="alert" className="rounded-lg bg-paper px-3 py-2 text-lg font-semibold text-status-late">Sound is not available on this device.</p>}
    </div>
  );

  if (loadState === "loading") {
    return (
      <BoardShell>
        <p role="status" className="py-20 text-center text-2xl font-semibold text-muted">
          Loading open orders…
        </p>
      </BoardShell>
    );
  }

  if (loadState === "error") {
    return (
      <BoardShell>
        <section role="alert" className="mx-auto max-w-xl py-16 text-center">
          <h2 className="text-3xl font-bold">Could not load orders</h2>
          <p className="mt-3 text-xl">Check the tablet&apos;s connection. The board keeps trying on its own.</p>
          <button
            type="button"
            onClick={() => {
              setLoadState("loading");
              refresh();
            }}
            className="sticker mt-6 inline-flex min-h-16 items-center justify-center rounded-xl bg-ink px-8 text-2xl font-bold text-paper focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand-blue"
          >
            Try again
          </button>
        </section>
      </BoardShell>
    );
  }

  const { cooking, ready } = boardColumns(tickets);
  const card = (t: KitchenTicket) => (
    <li key={t.id} className="min-w-0">
      <TicketCard
        ticket={t}
        nowMs={nowMs}
        isNew={freshIds.has(t.id)}
        onAdvanced={refresh}
        onStale={refresh}
        onSignedOut={leave}
      />
    </li>
  );

  return (
    <BoardShell counts={{ cooking: cooking.length, ready: ready.length }} actions={soundToggle}>
      {connectionLost && (
        <p role="status" className="mb-6 rounded-xl border-4 border-status-late bg-paper px-5 py-3 text-xl font-bold text-status-late">
          Connection lost, retrying… The orders below may be out of date.
        </p>
      )}

      {tickets.length === 0 ? (
        <section className="py-20 text-center">
          <h2 className="text-4xl font-bold">No open orders</h2>
          <p className="mt-3 text-xl text-muted">New paid orders appear here automatically.</p>
        </section>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <section aria-labelledby="col-cooking" className="min-w-0 lg:col-span-2">
            <ColumnHeading id="col-cooking" title="Cooking" count={cooking.length} />
            {cooking.length === 0 ? (
              <p className="py-8 text-xl text-muted">Nothing to cook right now.</p>
            ) : (
              <ul className="grid gap-6 sm:grid-cols-2">{cooking.map(card)}</ul>
            )}
          </section>
          <section aria-labelledby="col-ready" className="min-w-0">
            <ColumnHeading id="col-ready" title="Ready for pickup" count={ready.length} />
            {ready.length === 0 ? (
              <p className="py-8 text-xl text-muted">Nothing waiting for pickup.</p>
            ) : (
              <ul className="grid gap-6">{ready.map(card)}</ul>
            )}
          </section>
        </div>
      )}
    </BoardShell>
  );
}

function BoardShell({
  children,
  counts,
  actions,
}: {
  children: React.ReactNode;
  counts?: { cooking: number; ready: number };
  actions?: React.ReactNode;
}) {
  return (
    <main className="kitchen-board min-h-screen bg-cream px-4 py-6 text-ink sm:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-6 rounded-2xl border-2 border-ink bg-ink p-5 text-paper sm:p-7">
        <div className="min-w-0">
          <p className="text-lg font-bold text-cream">Menciu&apos;s Chopstix</p>
          <h1 className="mt-2 font-heading text-4xl font-black lg:text-5xl">Kitchen &amp; Counter</h1>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          {counts && (
            <p className="tabular flex flex-wrap gap-3 text-xl font-bold">
              <span className="rounded-xl bg-paper px-4 py-2 text-ink">{counts.cooking} cooking</span>
              <span className="rounded-xl bg-open px-4 py-2 text-open-ink">{counts.ready} ready</span>
            </p>
          )}
          {actions}
        </div>
      </header>
      {children}
    </main>
  );
}

function ColumnHeading({ id, title, count }: { id: string; title: string; count: number }) {
  return (
    <h2 id={id} className={`mb-5 flex items-center justify-between gap-3 rounded-xl px-5 py-4 text-2xl font-bold text-paper ${id === "col-ready" ? "bg-status-ready" : "bg-brand-blue"}`}>
      <span>{title}</span> <span className="tabular flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border-2 border-paper px-2" aria-label={`${count} orders`}>{count}</span>
    </h2>
  );
}
