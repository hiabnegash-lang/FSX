import Link from "next/link";

/** Payment happens at Stripe; only a completed earlier step is a navigation link. */
export function CheckoutSteps({ current }: { current: "cart" | "pickup" }) {
  const steps = [
    { key: "cart", label: "Cart" },
    { key: "pickup", label: "Pickup details" },
    { key: "payment", label: "Payment" },
  ] as const;

  return (
    <nav aria-label="Checkout steps" className="mt-6 sm:mt-8">
      <ol className="grid grid-cols-3 gap-2 rounded-2xl border-2 border-ink bg-paper p-2">
        {steps.map((step, index) => {
          const active = step.key === current;
          const look = `flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2 text-center text-sm font-bold sm:text-base ${active ? "bg-brand-blue text-paper" : "text-muted"}`;
          const content = (
            <>
              <span aria-hidden="true" className="tabular hidden sm:inline">
                {index + 1}.
              </span>
              <span>{step.label}</span>
            </>
          );
          return (
            <li key={step.key} className="min-w-0">
              {current === "pickup" && step.key === "cart" ? (
                <Link
                  href="/cart"
                  className={`${look} hover:bg-tile-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue`}
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-current={active ? "step" : undefined}
                  className={look}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
