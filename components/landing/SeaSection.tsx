import { Suspense } from "react";
import { SECTION_IDS } from "@/constants/landing.constants";
import { SeaSceneLoader } from "./sea/SeaSceneLoader";
import { SeaSceneSkeleton } from "./sea/SeaSceneSkeleton";

export function SeaSection() {
  return (
    <section
      id={SECTION_IDS.sea}
      aria-label="Koi leaping above the ocean and diving beneath the surface"
      className="relative isolate w-full motion-reduce:!h-svh"
      style={{ height: "300svh" }}
    >
      <div className="sticky top-0 h-svh min-h-[420px] w-full overflow-hidden">
        <Suspense fallback={<SeaSceneSkeleton />}>
          <SeaSceneLoader />
        </Suspense>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-surface/30 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface-deepest/60 to-transparent"
        />
      </div>
    </section>
  );
}

export default SeaSection;
