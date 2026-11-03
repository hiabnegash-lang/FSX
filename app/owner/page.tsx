import Link from "next/link";

const destinations = [
  { href: "/owner/orders", title: "Order history", description: "Find online orders and review pickup and payment details.", icon: "M8 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6" },
  { href: "/owner/menu", title: "Menu and prices", description: "Manage the menu, item availability and prices.", icon: "M4 4h7v16H4V4Zm9 0h7v16h-7V4ZM7 8h1m-1 4h1m8-4h1m-1 4h1" },
  { href: "/owner/reports", title: "Reports", description: "Review sales reports for online orders only.", icon: "M4 3v18h17M8 16v-5m5 5V7m5 9v-3" },
  { href: "/staff", title: "Kitchen board", description: "Open the live kitchen and pickup ticket board.", icon: "M3 5h18v13H3V5Zm5 0v13m8-13v13M6 21h12" },
] as const;

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-lg leading-relaxed text-ink sm:px-8 sm:py-12">
      <header className="border-b-2 border-ink pb-7">
        <p className="font-bold text-brand-blue">Menciu&apos;s Chopstix · Owner</p>
        <h1 className="mt-2 text-4xl font-black sm:text-5xl">Owner dashboard</h1>
        <p className="mt-4 max-w-2xl">Manage the restaurant&apos;s online ordering from one place.</p>
      </header>
      <nav aria-label="Owner tools" className="mt-8 grid gap-6 md:grid-cols-2">
        {destinations.map((destination) => <Link key={destination.href} href={destination.href}
          className="sticker anim-rise flex min-h-44 min-w-0 items-start gap-4 rounded-card bg-paper p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue sm:p-7">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tile-blue text-brand-blue">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7"><path d={destination.icon} /></svg>
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-bold text-brand-blue">{destination.title} <span aria-hidden="true">→</span></span>
            <span className="mt-2 block text-lg font-normal text-ink">{destination.description}</span>
          </span>
        </Link>)}
      </nav>
    </main>
  );
}
