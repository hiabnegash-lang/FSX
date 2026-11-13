import { store } from "./data";
import {
  buildReadyEmail,
  cleanSiteUrl,
  sendEmail,
  type SendOptions,
} from "./ready-email";

export type NotifyResult = "sent" | "not_configured" | "not_needed" | "failed";

/**
 * Called after a ticket has moved to Ready. Sends the customer one order-ready email (RTM F31 / BR-28).
 *
 * It never throws and never changes the ticket, so the kitchen is never blocked by email trouble.
 * `orders.email_sent_at` records a successful dispatch: an order that already has it gets nothing more,
 * and Resend's idempotency key covers a repeat within 24 hours. A failed send is logged with the order id
 * only (no name or address) and is not retried automatically.
 */
export async function notifyOrderReady(
  orderId: string,
  options: SendOptions = {},
): Promise<NotifyResult> {
  try {
    const env = options.env ?? process.env;
    if (!env.RESEND_API_KEY) return "not_configured";

    const target = await store.getReadyEmailTarget(orderId);
    if (!target) return "not_needed"; // not Ready, not found, or already emailed

    const message = buildReadyEmail(
      {
        orderId: target.orderId,
        orderNumber: target.orderNumber,
        customerName: target.customerName,
        pickupTime: target.pickupTime,
      },
      cleanSiteUrl(env.NEXT_PUBLIC_SITE_URL),
    );
    const result = await sendEmail(
      {
        ...message,
        to: target.customerEmail,
        idempotencyKey: `order-ready/${target.orderId}`,
      },
      options,
    );
    if (result !== "sent") {
      console.error("Order-ready email was not sent; no automatic retry", {
        orderId,
        result,
      });
      return "failed";
    }
    try {
      await store.markReadyEmailSent(orderId);
    } catch {
      // The email went out; Resend's idempotency key stops a duplicate. Flag it so the log can be reconciled.
      console.error("Order-ready email sent but email_sent_at was not saved", {
        orderId,
      });
    }
    return "sent";
  } catch {
    console.error("Order-ready email step failed", { orderId });
    return "failed";
  }
}
