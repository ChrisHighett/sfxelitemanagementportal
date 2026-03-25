import React from "react";
import { cn } from "@/lib/utils";

interface ContentSectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export default function ContentSection({
  title,
  subtitle,
  children,
  className,
  action,
}: ContentSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-4 px-1">
          <div>
            {title && (
              <h2
                className="text-base font-bold tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
