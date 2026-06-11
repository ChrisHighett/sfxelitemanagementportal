/**
 * Brand primitives — the visual layer of the white-label theme.
 *
 * Every brand-coloured visual element in the app should come from this file.
 * To re-skin: change CSS tokens in src/index.css and swap /public/brand/*.
 * No component file should ever hard-code a brand colour or logo path.
 */
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Logo / wordmark                                                            */
/* -------------------------------------------------------------------------- */

interface BrandMarkProps {
  /** "wordmark" = full logo; "icon" = arc-only square mark. */
  variant?: "wordmark" | "icon";
  /** Pixel height; width auto-scales. */
  height?: number;
  className?: string;
  /** Accessible label. Defaults to the brand name. */
  alt?: string;
}

export function BrandMark({
  variant = "wordmark",
  height = 28,
  className,
  alt = "TGI Sport",
}: BrandMarkProps) {
  // Driven by --brand-logo / --brand-icon so a token swap re-skins instantly.
  const cls = variant === "icon" ? "brand-icon" : "brand-logo";
  const widthClass = variant === "icon" ? "" : "w-auto";
  return (
    <span
      role="img"
      aria-label={alt}
      className={cn(cls, "inline-block shrink-0", widthClass, className)}
      style={{
        height,
        width: variant === "icon" ? height : undefined,
        minWidth: variant === "wordmark" ? height * 2.2 : undefined,
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Arc gradient defs — mounted once at app root so any SVG can use            */
/* stroke="url(#brandArc)" or fill="url(#brandArc)".                          */
/* -------------------------------------------------------------------------- */

export function BrandGradientDefs() {
  return (
    <svg
      aria-hidden
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <linearGradient id="brandArc" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--brand-spectrum-from)" />
          <stop offset="100%" stopColor="var(--brand-spectrum-to)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Arc loader — replaces every generic spinner in the app.                    */
/* -------------------------------------------------------------------------- */

interface ArcLoaderProps {
  size?: number;
  className?: string;
  label?: string;
}

export function ArcLoader({ size = 26, className, label = "Loading" }: ArcLoaderProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("arc-load", className)}
      style={{ width: size, height: size }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* ArcProgress — circular progress ring with the brand cyan→blue stroke.      */
/* Echoes the logo's incomplete ring; gap at top, rounded cap.                */
/* -------------------------------------------------------------------------- */

interface ArcProgressProps {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  /** Centre label (defaults to "{value}%"). Pass null to hide. */
  label?: React.ReactNode;
  className?: string;
}

export function ArcProgress({
  value,
  size = 80,
  stroke = 8,
  label,
  className,
}: ArcProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // 86% of the full circumference becomes the "track" — leaves a top gap like the logo.
  const visible = c * 0.86;
  const dash = (pct / 100) * visible;
  // Rotate so the gap sits at the top.
  const rotation = -90 - (1 - 0.86) * 180;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${pct} percent`}
    >
      <svg width={size} height={size} style={{ transform: `rotate(${rotation}deg)` }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--border-strong)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${visible} ${c}`}
          opacity={0.4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#brandArc)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 400ms ease-out" }}
        />
      </svg>
      {label !== null && (
        <div
          className="absolute inset-0 flex items-center justify-center font-mono text-sm font-medium"
          style={{ color: "var(--text)" }}
        >
          {label ?? `${pct}%`}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ArcBar — horizontal completion bar with the brand gradient fill.           */
/* -------------------------------------------------------------------------- */

interface ArcBarProps {
  value: number;
  className?: string;
  height?: number;
}

export function ArcBar({ value, className, height = 6 }: ArcBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full", className)}
      style={{ height, background: "var(--border-strong)" }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: "var(--brand-gradient)",
          transition: "width 400ms ease-out",
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ArcBackdrop — large faint arc used behind the login screen / empty hero.   */
/* -------------------------------------------------------------------------- */

export function ArcBackdrop({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 600"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    >
      <circle
        cx="300"
        cy="300"
        r="220"
        stroke="url(#brandArc)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="1180 1500"
        transform="rotate(-110 300 300)"
        opacity="0.55"
      />
    </svg>
  );
}
