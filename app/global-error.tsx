"use client";

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#071916", color: "#f2f6f3", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100svh", display: "grid", placeContent: "center", padding: "24px", textAlign: "center" }}>
          <h1>VOLSA could not be loaded.</h1>
          <p>Please try again.</p>
          <button type="button" onClick={retry} style={{ margin: "16px auto", padding: "12px 24px", cursor: "pointer", font: "inherit" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
