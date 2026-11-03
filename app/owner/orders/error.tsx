"use client";

import Link from "next/link";
import { btnPrimary, btnSecondary } from "@/lib/ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-3xl p-6 text-lg leading-relaxed text-ink sm:p-10">
    <h1 className="text-3xl font-bold text-brand-blue">Could not load orders</h1>
    <p role="alert" className="mt-4">Please try again. If the problem continues, contact the project lead.</p>
    <div className="mt-6 flex flex-wrap items-center gap-6">
      <button onClick={reset} className={btnPrimary}>Try again</button>
      <Link href="/owner/orders" className={btnSecondary}>Return to order history</Link>
    </div>
  </main>;
}
