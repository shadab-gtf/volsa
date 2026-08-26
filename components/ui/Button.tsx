import React, { type ReactNode, type AnchorHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: never;
  };

type ButtonAsLink = ButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-forest text-white hover:bg-brand-dark shadow-lg shadow-brand-forest/20 hover:shadow-brand-forest/40",
  secondary:
    "bg-brand-lime/50 text-brand-forest hover:bg-brand-lime border border-brand-leaf/20",
  outline:
    "bg-transparent text-brand-forest border-2 border-brand-forest/30 hover:border-brand-forest hover:bg-brand-forest/5",
  ghost:
    "bg-transparent text-brand-forest hover:bg-brand-forest/10",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm rounded-none",
  md: "h-12 px-6 text-base rounded-none",
  lg: "h-14 px-8 text-lg rounded-none",
};

/**
 * Reusable Button component.
 * Renders as `<a>` when `href` is provided, `<button>` otherwise.
 * Supports variant, size, and all native props.
 */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 font-heading font-semibold transition-all duration-300 cursor-pointer select-none ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

  if ("href" in props && props.href) {
    return (
      <a className={classes} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
