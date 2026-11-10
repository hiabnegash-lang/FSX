import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { KitchenBoard } from "./kitchen-board";

export const dynamic = "force-dynamic";

// Kitchen and counter board (SCRUM-71, SCRUM-75). Staff and owner roles. The page itself holds no
// data: the board loads tickets from GET /api/staff/tickets, which checks the role on every request.
// The page also checks the role before it renders, so a signed-out visitor never sees the board frame
// and is sent to /login by the server. If the role check is unavailable (not a 401 or 403) the board
// still renders; the API stays the real gate and the board shows its own connection message.
export const metadata: Metadata = { title: "Kitchen", robots: { index: false, follow: false } };

export default async function Page() {
  try {
    await requireRole({ headers: await headers() }, ["staff", "owner"]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) redirect("/login");
    if (!(error instanceof ApiError)) throw error;
  }
  return <KitchenBoard />;
}
