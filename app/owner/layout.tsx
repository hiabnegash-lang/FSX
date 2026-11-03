import { SignOutButton } from "@/components/sign-out-button";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header
        aria-label="Owner session"
        className="border-b-2 border-ink bg-paper text-ink"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <p className="text-lg font-bold text-brand-blue">Owner area</p>
          <SignOutButton />
        </div>
      </header>
      {children}
    </>
  );
}
