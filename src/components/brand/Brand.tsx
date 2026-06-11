/**
 * Brand primitives — the visual layer of the Eleva platform theme.
 *
 * Default brand = Eleva. Client themes (e.g. TGI) override the brand tokens
 * in src/index.css and the logo URLs only; component code stays untouched.
 * Never hard-code a brand colour, font, or logo path in a component.
 */
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Logo / wordmark                                                            */
/* -------------------------------------------------------------------------- */

interface BrandMarkProps {
  /**
   * - "wordmark" = horizontal lockup (rail / top bar / tight slots)
   * - "icon"     = mark only (favicon, app icon, avatars under ~24px)
   * - "crest"    = vertical crest with "est. 1996" (login, hero, decks)
   */
  variant?: "wordmark" | "icon" | "crest";
  /** Pixel height; width auto-scales. */
  height?: number;
  /** Use light-on-dark variants (for ink backgrounds). */
  light?: boolean;
  className?: string;
  /** Accessible label. */
  alt?: string;
}

export function BrandMark({
  variant = "wordmark",
  height = 28,
  light = false,
  className,
  alt = "Eleva",
}: BrandMarkProps) {
  // CSS-var driven so a theme swap re-skins instantly.
  const tokenVar =
    variant === "icon"
      ? "--brand-mark"
      : variant === "crest"
        ? light
          ? "--brand-logo-crest-light"
          : "--brand-logo-crest"
        : light
          ? "--brand-logo-row-light"
          : "--brand-logo-row";

  const aspect = variant === "icon" ? 1 : variant === "crest" ? 220 / 260 : 320 / 92;

  return (
    <span
      role="img"
      aria-label={alt}
      className={cn("inline-block shrink-0 bg-center bg-no-repeat bg-contain", className)}
      style={{
        height,
        width: height * aspect,
        backgroundImage: `var(${tokenVar})`,
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Legacy gradient defs — kept so any in-flight SVGs referencing              */
/* stroke="url(#brandArc)" still render. In Eleva, gradient = solid gold.     */
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
          <stop offset="0%" stopColor="var(--brand-accent)" />
          <stop offset="100%" stopColor="var(--brand-accent)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* ArcLoader — Eleva's signature bars-rising loader. Replaces every spinner.  */
/* (Name kept for API compatibility with existing imports.)                   */
/* -------------------------------------------------------------------------- */

interface ArcLoaderProps {
  size?: number;
  className?: string;
  label?: string;
}

export function ArcLoader({ size = 26, className, label = "Loading" }: ArcLoaderProps) {
  // Four bars rising in sequence — echoes the mark (1·9·9·6).
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-end justify-center gap-[2px]", className)}
      style={{ width: size, height: size }}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="bars-load__bar"
          style={{
            width: Math.max(2, Math.round(size * 0.14)),
            background: "var(--brand-accent)",
            borderRadius: 2,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* ArcProgress — circular gold progress ring. Solid gold (no gradient).       */
/* -------------------------------------------------------------------------- */

interface ArcProgressProps {
  value: number;
  size?: number;
  stroke?: number;
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
  const visible = c * 0.86;
  const dash = (pct / 100) * visible;
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
          stroke="var(--brand-accent)"
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
/* ArcBar — horizontal completion bar (solid gold fill).                      */
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
          background: "var(--brand-accent)",
          transition: "width 400ms ease-out",
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* RisingBars — four-bar progress widget rhyming with the mark.               */
/* Use for profile completeness, planner completion, etc.                     */
/* -------------------------------------------------------------------------- */

interface RisingBarsProps {
  /** 0–100 */
  value: number;
  size?: number;
  className?: string;
}

export function RisingBars({ value, size = 48, className }: RisingBarsProps) {
  const pct = Math.max(0, Math.min(100, value));
  // Bars fill in sequence as pct rises (25 / 50 / 75 / 100 thresholds).
  const fills = [pct >= 25, pct >= 50, pct >= 75, pct >= 100];
  const heights = [0.25, 0.7, 0.7, 0.5];
  const barW = Math.max(3, Math.round(size * 0.14));
  const gap = Math.max(2, Math.round(size * 0.06));
  return (
    <div
      role="img"
      aria-label={`${pct} percent`}
      className={cn("inline-flex items-end", className)}
      style={{ height: size, gap }}
    >
      {heights.map((h, i) => (
        <span
          key={i}
          style={{
            width: barW,
            height: size * h,
            borderRadius: 2,
            background: fills[i] ? "var(--brand-accent)" : "var(--border-strong)",
            transition: "background 300ms ease-out",
          }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ArcBackdrop — large faint mark used behind login / empty heroes.           */
/* -------------------------------------------------------------------------- */

export function ArcBackdrop({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 600"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    >
      <g transform="translate(180 180) scale(2.6)" opacity="0.07">
        <rect x="10" y="64" width="13" height="9"  rx="2.5" fill="var(--brand-accent)"/>
        <rect x="29" y="32" width="13" height="41" rx="2.5" fill="var(--brand-accent)"/>
        <rect x="48" y="32" width="13" height="41" rx="2.5" fill="var(--brand-accent)"/>
        <rect x="67" y="46" width="13" height="27" rx="2.5" fill="var(--brand-accent)"/>
      </g>
    </svg>
  );
}
