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
