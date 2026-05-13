import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { rotuloMesRelativo } from "@/lib/dashboard-data";
import { imcReferenceAreas, ImcBandsLegend } from "./ImcReferenceBands";

export type MultiMonthRow = {
  label: string;
  /** values[i] = valor no i-ésimo mês relativo (0 = inicial). undefined = sem medição. */
  values: Array<number | null>;
};

type Props = {
  title: string;
  rows: MultiMonthRow[];
  metric: "peso" | "imc";
  unit: string;
  height?: number;
  onBarClick?: (rowIndex: number) => void;
};

/**
 * Gradiente verde de #14532d (escuro = mês inicial) até #bbf7d0 (claro = mês mais recente).
 */
function greenShade(i: number, n: number): string {
  if (n <= 1) return "#15803d";
  const t = i / (n - 1);
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  const r = lerp(0x14, 0xbb);
  const g = lerp(0x53, 0xf7);
  const b = lerp(0x2d, 0xd0);
  return `rgb(${r}, ${g}, ${b})`;
}

export function MultiMonthBarChart({ title, rows, metric, unit, height = 420, onBarClick }: Props) {
  const maxN = rows.reduce((acc, r) => Math.max(acc, r.values.length), 0);
  const monthIdxs = Array.from({ length: maxN }, (_, i) => i);

  const data = rows.map((r) => {
    const obj: Record<string, string | number | null> = { label: r.label };
    monthIdxs.forEach((i) => {
      obj[`m${i}`] = r.values[i] ?? null;
    });
    return obj;
  });

  const legendName = (i: number) => {
    const base = rotuloMesRelativo(i);
    return metric === "peso" ? `Peso ${base} (kg)` : `IMC ${base}`;
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 24, right: 12, left: -4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          {metric === "imc" && imcReferenceAreas()}
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            label={{
              value: unit,
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11, fill: "var(--muted-foreground)" },
            }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number | string) =>
              typeof value === "number" ? value.toLocaleString("pt-BR") : value
            }
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {monthIdxs.map((i) => (
            <Bar
              key={`m${i}`}
              dataKey={`m${i}`}
              name={legendName(i)}
              fill={greenShade(i, maxN)}
              radius={[3, 3, 0, 0]}
              onClick={onBarClick ? (_: unknown, idx: number) => onBarClick(idx) : undefined}
              style={onBarClick ? { cursor: "pointer" } : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      {metric === "imc" && <ImcBandsLegend className="mt-2" />}
    </div>
  );
}
