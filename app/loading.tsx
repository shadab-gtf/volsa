export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading VOLSA" className="min-h-svh bg-surface px-6 py-28">
      <div aria-hidden="true" className="mx-auto grid min-h-[70svh] max-w-7xl items-center gap-16 lg:grid-cols-2 motion-safe:animate-pulse">
        <div className="space-y-6">
          <div className="h-3 w-48 rounded bg-current/10" />
          <div className="h-16 w-full rounded bg-current/10" />
          <div className="h-16 w-4/5 rounded bg-current/10" />
          <div className="h-20 w-full rounded bg-current/5" />
          <div className="h-12 w-40 rounded-full bg-current/10" />
        </div>
        <div className="aspect-square w-full max-w-lg rounded-3xl border border-current/10 bg-current/5" />
      </div>
    </main>
  );
}
