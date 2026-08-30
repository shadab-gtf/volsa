import React, { type ReactNode } from "react";

type HeadingLevel = "h1" | "h2" | "h3";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  as?: HeadingLevel;
  align?: "left" | "center";
  dark?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Reusable section heading with title and subtitle.
 * Used across every section for consistent typography and spacing.
 */
export function SectionHeading({
  title,
  subtitle,
  as: Tag = "h2",
  align = "center",
  dark = false,
  className = "",
  children,
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";
  const titleClass = dark ? "text-white" : "text-foreground";
  const subtitleClass = dark ? "text-white/70" : "text-foreground/80";

  return (
    <div className={`max-w-3xl ${alignClass} ${className}`}>
      <Tag
        className={`font-heading leading-tight tracking-tight mb-4 text-3xl sm:text-4xl lg:text-5xl ${titleClass}`}
      >
        {title}
      </Tag>
      {subtitle && (
        <p
          className={`text-base sm:text-lg leading-relaxed max-w-2xl ${align === "center" ? "mx-auto" : ""} ${subtitleClass}`}
        >
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
