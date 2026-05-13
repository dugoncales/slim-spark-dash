import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  accent = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  accent?: "primary" | "accent" | "muted";
}) {
  const tint =
    accent === "accent"
      ? "bg-accent/15 text-accent-foreground"
      : accent === "muted"
        ? "bg-muted text-muted-foreground"
        : "bg-primary/10 text-primary";
  return (
    <Card className="p-5 flex items-center gap-4 shadow-sm border-border/60">
      <div className={`h-14 w-14 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
        <Icon className="h-7 w-7" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-3xl font-bold text-foreground leading-tight mt-0.5">
          {value}
          {unit && <span className="text-sm font-semibold text-muted-foreground ml-1">{unit}</span>}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">Média do grupo</p>
      </div>
    </Card>
  );
}
