import React from "react";
import { cn } from "@/lib/utils";

interface HeroBannerProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function HeroBanner({
  title,
  subtitle,
  imageUrl,
  badge,
  children,
  className,
  size = "md",
}: HeroBannerProps) {
  const heights = { sm: "h-24 sm:h-28", md: "h-32 sm:h-40 md:h-48", lg: "h-40 sm:h-52 md:h-64" };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        heights[size],
        className
      )}
    >
      {/* Background */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/90 via-foreground/70 to-primary/60" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-5 md:p-6">
        {badge && <div className="mb-2">{badge}</div>}
        <h1
          className="text-xl md:text-2xl font-bold text-white tracking-tight leading-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-white/70 text-sm mt-1 max-w-md">{subtitle}</p>
        )}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
