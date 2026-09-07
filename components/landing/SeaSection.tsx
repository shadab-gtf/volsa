"use client";

import React from "react";
import dynamic from "next/dynamic";
import { SECTION_IDS } from "@/constants/landing.constants";

/**
 * WebGL, loaded on demand.
 *
 * The scene pulls in GLTFLoader and an 0.89 MB model, and it sits at the very bottom of
 * the page — most visitors never reach it, and none of them should pay for it in the
 * main bundle. `ssr: false` because it is a canvas: there is nothing for the server to
 * render, and the loader touches `document` on construction.
 */
const UnderwaterScene = dynamic(
  () => import("./sea/UnderwaterScene").then((m) => m.UnderwaterScene),
  { ssr: false }
);

/**
 * The sea. One koi, swimming, immediately before the footer.
 *
 * Deliberately wordless: it is a held breath at the end of a long page, and copy would
 * make it an argument instead. If a line is ever wanted here, it belongs over the
 * canvas as a sibling of the scene, not inside it.
 */
export function SeaSection() {
  return (
    <section
      id={SECTION_IDS.sea}
      aria-label="Koi swimming underwater"
      className="relative isolate h-[78svh] min-h-[420px] w-full overflow-hidden"
    >
      <UnderwaterScene />
      {/* Seams. The page above this is light and the footer below it is dark, so the
          water is feathered into both rather than butting against them — an abrupt
          horizontal edge is what makes an embedded 3D scene look pasted in. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-surface to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-surface-deepest to-transparent"
      />
    </section>
  );
}

export default SeaSection;
