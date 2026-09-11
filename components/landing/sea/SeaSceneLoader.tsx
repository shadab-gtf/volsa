"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { SeaSceneSkeleton } from "./SeaSceneSkeleton";

const UnderwaterScene = dynamic(
  () => import("./UnderwaterScene").then((module) => module.UnderwaterScene),
  { ssr: false, loading: SeaSceneSkeleton },
);

class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <SeaSceneSkeleton /> : this.props.children;
  }
}

/** Download WebGL and the fish only when the sea is approaching the viewport. */
export function SeaSceneLoader() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin: "700px 0px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0">
      <SeaSceneSkeleton />
      {ready && (
        <SceneBoundary>
          <UnderwaterScene />
        </SceneBoundary>
      )}
    </div>
  );
}
