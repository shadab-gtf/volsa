"use client";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="grid min-h-svh place-content-center gap-6 bg-surface px-6 text-center">
      <h1 className="text-3xl font-medium">This page could not be loaded.</h1>
      <p>Please try again.</p>
      <button type="button" onClick={retry} className="mx-auto rounded-full border border-current px-6 py-3 focus-visible:outline-2 focus-visible:outline-offset-4">
        Try again
      </button>
    </main>
  );
}
