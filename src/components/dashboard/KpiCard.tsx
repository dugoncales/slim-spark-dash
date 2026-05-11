import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function KpiCard({ icon: Icon, label, value, unit, accent = "primary" }: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  accent?: "primary" | "accent" | "muted";
}) {
  const bg = accent === "accent" ? "bg-accent text-accent-foreground" : accent === "muted" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground";
  return (
    <Card className="p-4 flex items-center gap-4 shadow-sm">
      <div className={`h-14 w-14 rounded-lg flex items-center justify-center ${bg}`}>
        <Icon className="h-7 w-7" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold text-foreground leading-tight">
          {value}{unit && <span className="text-sm font-semibold text-muted-foreground ml-1">{unit}</span>}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Média do grupo</p>
      </div>
    </Card>
  );
}
