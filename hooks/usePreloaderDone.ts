"use client";

import { useSyncExternalStore } from "react";

const DONE_EVENT = "volsa-preloader-done";

/** Module-level so every consumer shares one answer, set once per page load. */
let isDone = false;

function subscribe(notify: () => void) {
  if (isDone) return () => {};

  // No overlay in the DOM means the preloader already finished or was skipped.
  if (!document.querySelector(".volsa-preloader-overlay")) {
    isDone = true;
    notify();
    return () => {};
  }

  function handleDone() {
    isDone = true;
    notify();
  }

  window.addEventListener(DONE_EVENT, handleDone, { once: true });
  return () => window.removeEventListener(DONE_EVENT, handleDone);
}

/**
 * Custom Hook: usePreloaderDone
 * Returns `true` ONLY AFTER the preloader overlay finishes its exit animation
 * and dispatches the 'volsa-preloader-done' event.
 *
 * Backed by an external store rather than state-in-an-effect, so every consumer
 * flips on the same render pass instead of triggering its own cascade.
 */
export function usePreloaderDone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isDone,
    () => false
  );
}
