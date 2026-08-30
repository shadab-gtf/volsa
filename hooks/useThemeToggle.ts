"use client";

import { useState } from "react";

/** Keep this key identical to the inline script in app/layout.tsx. */
const STORAGE_KEY = "volsa-theme";

function applyTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try {
    localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  } catch {
    // Private browsing / storage disabled — theme just won't persist.
  }
}

/**
 * Manual light/dark toggle for the header switch, persisted across visits.
 *
 * The initial value is read lazily (not in an effect): the inline script in
 * app/layout.tsx already applies a saved dark theme before this component
 * hydrates, so reading `data-theme` straight from the DOM on first render
 * gives the correct value immediately instead of flashing "light" for one
 * frame. The server has no DOM, so it always renders `false` — expected, and
 * the toggle button carries `suppressHydrationWarning` for that mismatch.
 */
export function useThemeToggle() {
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-theme") === "dark"
  );

  function toggle() {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next);
      return next;
    });
  }

  return { isDark, toggle };
}
