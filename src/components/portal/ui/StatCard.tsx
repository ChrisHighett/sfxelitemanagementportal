import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export default function StatCard({ label, value, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3 sm:p-4 flex items-center gap-3 sm:flex-col sm:items-start sm:gap-0 sm:space-y-2",
        className
      )}
    >
      <div className="flex items-center gap-2 shrink-0">
        {icon && (
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {icon}
          </div>
        )}
        <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
      </div>
      <div className="text-sm font-semibold flex-1 min-w-0" style={{ fontFamily: "var(--font-heading)" }}>
        {value}
      </div>
    </div>
  );
}
