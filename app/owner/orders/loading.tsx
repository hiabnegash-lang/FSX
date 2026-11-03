export default function Loading() {
  return <main className="mx-auto max-w-7xl p-6 text-lg leading-relaxed text-ink sm:p-10" aria-busy="true">
    <h1 className="text-4xl font-bold text-brand-blue">Order history</h1>
    <p role="status" className="mt-6 rounded-card border-2 border-ink bg-paper p-6">Loading orders…</p>
  </main>;
}
