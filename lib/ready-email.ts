import { pickupLabel } from "./customer-accounts";

/**
 * Order-ready email (RTM F31, BR-28). Pure message building plus one HTTP call to Resend.
 *
 * - No npm dependency: Resend's REST API is a single POST, so we use fetch.
 * - Off until RESEND_API_KEY is set, so merging this is safe before the vendor approval.
 * - Never throws: a failed email must never block the kitchen from marking a ticket Ready.
 * - Never logs the customer's address or name.
 */

export const RESTAURANT_NAME = "Menciu's Chopstix";
/** Same text as the site footer. */
export const RESTAURANT_ADDRESS = "6755 Hillcroft St, Houston";
/** Verified sending domain in Resend (chopstixhouston.com). Override with EMAIL_FROM. */
export const DEFAULT_FROM = `${RESTAURANT_NAME} <no-reply@chopstixhouston.com>`;
export const RESEND_URL = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 5000;

export interface ReadyEmailInput {
  orderId: string;
  orderNumber: string;
  customerName: string;
  /** ISO time the customer chose. */
  pickupTime: string;
}

export interface BuiltEmail {
  subject: string;
  text: string;
  html: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only an http(s) address with no trailing slash, so a bad setting can never produce a strange link. */
export function cleanSiteUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function buildReadyEmail(
  input: ReadyEmailInput,
  siteUrl?: string | null,
): BuiltEmail {
  const name = input.customerName.trim() || "there";
  const pickup = pickupLabel(input.pickupTime);
  const link = siteUrl
    ? `${siteUrl}/order/${encodeURIComponent(input.orderId)}`
    : null;
  // The database stores 0042; every page shows it as #0042, so the email does too.
  const number = `#${input.orderNumber}`;
  const subject = `Your order ${number} is ready for pickup`;

  const text = [
    `Hi ${name},`,
    "",
    `Your order ${number} at ${RESTAURANT_NAME} is ready for pickup.`,
    "",
    `Pickup time you chose: ${pickup} (Houston time)`,
    `Pickup at: ${RESTAURANT_ADDRESS}`,
    ...(link ? ["", `View your order: ${link}`] : []),
    "",
    `Thank you for ordering from ${RESTAURANT_NAME}.`,
    "",
    "You are getting this one email because you placed a pickup order. Please do not reply to this message.",
  ].join("\n");

  const safeName = escapeHtml(name);
  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#fbf6ec;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f;">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border:2px solid #1d1d1f;border-radius:12px;">
<tr><td style="padding:24px;">
<p style="margin:0 0 4px;font-weight:bold;color:#1a3a8f;">${escapeHtml(RESTAURANT_NAME)}</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;">Your order ${escapeHtml(number)} is ready for pickup</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hi ${safeName},</p>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Your order is ready now.</p>
<p style="margin:0 0 4px;font-size:16px;line-height:1.5;"><strong>Pickup time you chose:</strong> ${escapeHtml(pickup)} (Houston time)</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;"><strong>Pickup at:</strong> ${escapeHtml(RESTAURANT_ADDRESS)}</p>
${link ? `<p style="margin:0 0 16px;font-size:16px;"><a href="${escapeHtml(link)}" style="color:#b3261e;font-weight:bold;">View your order</a></p>` : ""}
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Thank you for ordering from ${escapeHtml(RESTAURANT_NAME)}.</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#5b6068;">You are getting this one email because you placed a pickup order. Please do not reply to this message.</p>
</td></tr></table>
</body></html>`;

  return { subject, text, html };
}

export type SendResult = "sent" | "not_configured" | "failed";

export interface SendOptions {
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
}

/**
 * Sends one email through Resend. The Idempotency-Key header makes Resend ignore a repeat of the same key
 * for 24 hours, so a retry can never produce a second email.
 */
export async function sendEmail(
  message: BuiltEmail & { to: string; idempotencyKey: string },
  options: SendOptions = {},
): Promise<SendResult> {
  const env = options.env ?? process.env;
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return "not_configured";
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? SEND_TIMEOUT_MS,
  );
  try {
    const response = await doFetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || DEFAULT_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: controller.signal,
    });
    if (response.ok) return "sent";
    // Log the status only. Resend's error text can quote request fields, which would include the address.
    console.error("Resend refused the order-ready email", {
      status: response.status,
    });
    return "failed";
  } catch (error) {
    // Compare the name rather than using instanceof, which is unreliable across JavaScript realms.
    const name =
      typeof error === "object" && error !== null
        ? String((error as { name?: unknown }).name)
        : "";
    console.error("Order-ready email request failed", {
      reason: name === "AbortError" ? "timeout" : "network_error",
    });
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}
