import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  id,
  title,
  subtitle,
  icon: Icon,
  defaultOpen = true,
  actions,
  children,
  contentClassName,
  forceOpen,
  hideChrome = false,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  // When defined, overrides user state (used by export mode). true = expanded.
  forceOpen?: boolean;
  // When true, hide the header chrome (toggle/title bar). Used in export mode
  // so the screenshot doesn't include collapsible UI.
  hideChrome?: boolean;
}) {
  const storageKey = `dashboard:section:${id}`;
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const v = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (v !== null) setOpen(v === "1");
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (hydrated && forceOpen === undefined) {
      // Only persist user-driven toggles, not export-mode overrides.
      window.localStorage.setItem(storageKey, open ? "1" : "0");
    }
  }, [hydrated, open, storageKey, forceOpen]);

  const effectiveOpen = forceOpen ?? open;

  return (
    <Card data-section={id} data-section-open={effectiveOpen} className="overflow-hidden">
      {!hideChrome && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b bg-card">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={effectiveOpen}
            aria-controls={`section-content-${id}`}
            className="flex items-center gap-2 flex-1 text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-muted/40 transition-colors"
          >
            {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-foreground truncate">{title}</span>
              {subtitle && (
                <span className="text-[11px] text-muted-foreground truncate">{subtitle}</span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform ml-auto shrink-0",
                effectiveOpen ? "" : "-rotate-90",
              )}
            />
          </button>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {hideChrome && (
        <div className="px-5 pt-4 pb-1">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
            <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          </div>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      )}
      {effectiveOpen && (
        <div id={`section-content-${id}`} className={cn("p-5", contentClassName)}>
          {children}
        </div>
      )}
    </Card>
  );
}
