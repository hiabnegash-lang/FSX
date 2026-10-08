import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { store } from "@/lib/data";
import { ApiError, errorResponse } from "@/lib/errors";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !process.env.STRIPE_SECRET_KEY) {
      throw new ApiError(
        503,
        "stripe_not_configured",
        "Webhook is not configured.",
      );
    }

    // Signature verification needs the raw, unparsed body.
    const raw = await request.text();
    const signature = request.headers.get("stripe-signature");
    let event: Stripe.Event;
    try {
      if (!signature) throw new Error("missing signature");
      event = getStripe().webhooks.constructEvent(raw, signature, secret);
    } catch {
      throw new ApiError(400, "invalid_signature", "Invalid signature.");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.client_reference_id;
      const order = orderId ? await store.getOrder(orderId) : null;

      if (!order) {
        console.error("Webhook for unknown order", { orderId });
      } else if (session.payment_status !== "paid") {
        // Delayed payment methods: wait for a later event.
      } else if (session.amount_total !== order.totalCents) {
        console.error("Webhook amount mismatch; not marking paid", {
          orderId,
          expected: order.totalCents,
          got: session.amount_total,
        });
      } else {
        // Idempotent: a repeated delivery for the same session returns false and changes nothing.
        await store.markPaid(order.id, session.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return errorResponse(err);
  }
}
