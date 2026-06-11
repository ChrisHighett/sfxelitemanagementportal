import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

/**
 * White-label proof — toggles `data-theme` on <html>. Eleva is the default
 * platform theme; the other entries are client skins that override the
 * brand tokens in index.css. Re-skinning is zero-component-edit.
 */
const THEMES = [
  { id: "default", label: "Eleva" },
  { id: "tgi", label: "TGI" },
  { id: "aurora", label: "Aurora" },
  { id: "ember", label: "Ember" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];
const KEY = "brand-theme";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "default";
    return (localStorage.getItem(KEY) as ThemeId) || "default";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "default") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return (
    <div
      className="rounded-[12px] p-2 text-[11px]"
      style={{
        background: "var(--brand-base-soft)",
        border: "1px solid var(--brand-base-line)",
        color: "rgba(255,255,255,0.62)",
      }}
    >
      <div className="flex items-center gap-1.5 px-1 pb-1.5">
        <Palette className="h-3 w-3" />
        <span className="font-medium uppercase tracking-wider">Theme</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {THEMES.map((t) => {
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="rounded-[8px] px-2 py-1 transition-colors"
              style={{
                background: active ? "var(--brand-accent)" : "transparent",
                color: active ? "var(--brand-base)" : "rgba(255,255,255,0.7)",
                border: active ? "none" : "1px solid var(--brand-base-line)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
