import { optionalUser, requireUser, type AuthRequest } from "./auth";
import { customerAccountsEnabled } from "./customer-accounts";
import { store } from "./data";
import { ApiError } from "./errors";
import { toPublicOrder } from "./public-order";

/** "My orders": the signed-in customer's paid orders, in the same reduced shape as the guest order page. */
export async function listMyOrders(request: AuthRequest) {
  // Same switch as the pages: with accounts off, this route does not exist.
  if (!customerAccountsEnabled()) throw new ApiError(404, "not_found", "Not found.");
  const userId = await requireUser(request);
  const orders = await store.listCustomerOrders(userId);
  // The store already filters by account and paid status; checking again means a store bug cannot show another
  // customer's order, because this route reads with the service role.
  return { orders: orders.filter((o) => o.customerUserId === userId && o.paymentStatus === "paid").map(toPublicOrder) };
}

/**
 * Best effort: link a just-created order to the signed-in customer. A guest, or any failure here, simply leaves
 * an ordinary guest order, so this never blocks checkout or reaches the payment step. The id comes from the session.
 */
export async function linkOrderToSignedInCustomer(request: AuthRequest, orderId: string): Promise<void> {
  // With accounts off, nothing is linked: staff and owner sessions already exist, and an order placed from a
  // browser where one is signed in must not be stamped with their account.
  if (!customerAccountsEnabled()) return;
  try {
    const userId = await optionalUser(request);
    if (userId) await store.setOrderCustomer(orderId, userId);
  } catch (err) {
    console.error("Could not link the order to the customer account", { orderId, code: err instanceof ApiError ? err.code : "unknown" });
  }
}
