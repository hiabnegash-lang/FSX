import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { readOwnerMenu } from "@/lib/owner-menu";
import { ApiError } from "@/lib/errors";
import MenuManager from "./menu-manager";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Menu & prices",
  robots: { index: false, follow: false },
};
export default async function Page() {
  let data;
  try {
    data = await readOwnerMenu({ headers: await headers() });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 401) redirect("/login");
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-3xl font-bold">
          {error.status === 403 ? "Owner access required" : "Menu unavailable"}
        </h1>
        <p role="alert" className="my-4">
          {error.message}
        </p>
        <Link href="/owner" className="text-brand-blue underline">
          Return to dashboard
        </Link>
      </main>
    );
  }
  return <MenuManager {...data} />;
}
