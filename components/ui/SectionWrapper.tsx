import React, { type ReactNode } from "react";

interface SectionWrapperProps {
  id: string;
  children: ReactNode;
  className?: string;
  /** Dark background variant */
  dark?: boolean;
  /** Remove default padding */
  flush?: boolean;
  /** Widen the content column past the default 7xl cap. */
  wide?: boolean;
}

/**
 * Reusable section wrapper providing consistent ID anchoring,
 * vertical padding, max-width, and optional dark mode background.
 */
export function SectionWrapper({
  id,
  children,
  className = "",
  dark = false,
  flush = false,
  wide = false,
}: SectionWrapperProps) {
  const bg = dark ? "bg-brand-dark text-white" : "bg-background text-foreground";
  const padding = flush ? "" : "py-24 sm:py-32 px-6 sm:px-10 lg:px-14 xl:px-16";

  return (
    <section
      id={id}
      className={`relative w-full overflow-hidden ${bg} ${padding} ${className}`}
    >
      <div className={`relative z-10 w-full mx-auto ${wide ? "max-w-[96rem]" : "max-w-7xl"}`}>
        {children}
      </div>
    </section>
  );
}
