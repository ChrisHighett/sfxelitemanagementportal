import React, { useEffect, useMemo, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Compass, ArrowRight } from "lucide-react";

export interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  icon?: React.ElementType;
  group?: string;
  run: () => void;
  keywords?: string;
}

interface Props {
  commands: PaletteCommand[];
}

/**
 * Global ⌘K / Ctrl+K palette. Token-only styling (inherits shadcn theme tokens).
 * Commands are supplied by the host (nav items, athlete jumps, etc).
 */
export function CommandPalette({ commands }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteCommand[]>();
    for (const c of commands) {
      const g = c.group ?? "Navigate";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    }
    return Array.from(map.entries());
  }, [commands]);

  const run = (fn: () => void) => {
    setOpen(false);
    setTimeout(fn, 10);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to anything — athletes, screens, actions…" />
      <CommandList>
        <CommandEmpty>No matches. Try a name or screen.</CommandEmpty>
        {grouped.map(([group, items], i) => (
          <React.Fragment key={group}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((c) => {
                const Icon = c.icon ?? ArrowRight;
                return (
                  <CommandItem
                    key={c.id}
                    value={`${c.label} ${c.keywords ?? ""}`}
                    onSelect={() => run(c.run)}
                  >
                    <Icon className="mr-2 h-4 w-4 opacity-70" />
                    <span>{c.label}</span>
                    {c.hint && (
                      <span className="ml-auto text-xs text-muted-foreground">{c.hint}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </React.Fragment>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Session">
          <CommandItem value="sign out logout" onSelect={() => run(async () => { await signOut(); navigate("/login"); })}>
            <LogOut className="mr-2 h-4 w-4 opacity-70" />
            Sign out
          </CommandItem>
          <CommandItem value="install pwa" onSelect={() => run(() => navigate("/install"))}>
            <Compass className="mr-2 h-4 w-4 opacity-70" />
            Install / PWA guide
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/** Tiny hint pill shown in the rail to advertise the ⌘K shortcut. */
export function CommandHint() {
  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
  return (
    <div
      className="hidden md:flex items-center justify-between rounded-md px-2 py-1.5 text-[11px]"
      style={{
        background: "var(--brand-base-soft)",
        color: "rgba(255,255,255,0.6)",
        border: "1px solid var(--brand-base-line)",
      }}
    >
      <span>Quick jump</span>
      <kbd
        className="font-mono px-1.5 py-0.5 rounded text-[10px]"
        style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}
      >
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </div>
  );
}
