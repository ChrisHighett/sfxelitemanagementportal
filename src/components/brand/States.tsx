import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

/**
 * In-voice state primitives — token only, no hard-coded colors.
 * EmptyState: an invitation, never an apology.
 * ErrorState: surfaces what failed + a Retry, never a raw stack.
 */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, hint, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-12"} px-4 ${className || ""}`}
      style={{ color: "var(--muted-fg)" }}
    >
      {icon && (
        <div
          className="mb-3 inline-flex items-center justify-center rounded-full"
          style={{
            width: 44,
            height: 44,
            background: "var(--brand-base-soft)",
            color: "var(--brand-accent)",
          }}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>
        {title}
      </p>
      {hint && <p className="text-xs mt-1 max-w-sm">{hint}</p>}
      {action && (
        <Button size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  detail?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Couldn't load that just now",
  detail,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-10 px-4 ${className || ""}`}
    >
      <p className="text-sm font-medium" style={{ color: "var(--fg)" }}>
        {title}
      </p>
      {detail && (
        <p className="text-xs mt-1 max-w-md" style={{ color: "var(--muted-fg)" }}>
          {detail}
        </p>
      )}
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={onRetry}>
          <RefreshCcw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}
