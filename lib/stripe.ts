import Stripe from "stripe";

// SERVER-ONLY. Never import in a client component.
if (typeof window !== "undefined") {
  throw new Error("lib/stripe must never be imported client-side.");
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return new Stripe(key);
}

/**
 * Identifies which environment created a Checkout session (stored in session metadata).
 * Everyone shares one Stripe test account, so set STRIPE_SITE_TAG locally (e.g. "local-jose")
 * to keep your webhook from acting on teammates' sessions.
 */
export function siteTag(): string {
  return (
    process.env.STRIPE_SITE_TAG ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  );
}
