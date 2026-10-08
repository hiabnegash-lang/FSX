import type {
  BusinessHour,
  MenuCategory,
  Order,
  Settings,
  TicketStatus,
} from "../types";

/** Every route talks to this interface. Stub today, Supabase after 12 Oct. */
export interface DataStore {
  getMenu(): Promise<MenuCategory[]>;
  getSettings(): Promise<Settings>;
  getBusinessHours(): Promise<BusinessHour[]>;
  insertOrder(
    order: Omit<Order, "id" | "orderNumber" | "createdAt">,
  ): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  setStripeSession(orderId: string, sessionId: string): Promise<void>;
  cancelOrder(orderId: string): Promise<void>;
  /** Idempotent. Returns false if this Stripe session was already recorded. */
  markPaid(orderId: string, sessionId: string): Promise<boolean>;
  setTicketStatus(orderId: string, status: TicketStatus): Promise<Order>;
}
