import type { Metadata } from "next";
import { KitchenBoard } from "./kitchen-board";

// Kitchen and counter board (SCRUM-71, SCRUM-75). Staff and owner roles. The page itself holds no
// data: the board loads tickets from GET /api/staff/tickets, which checks the role on every request,
// and sends anyone signed out or without access to /login.
export const metadata: Metadata = { title: "Kitchen", robots: { index: false, follow: false } };

export default function Page() {
  return <KitchenBoard />;
}
