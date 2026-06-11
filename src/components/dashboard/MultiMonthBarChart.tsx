import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  rotuloMesRelativo,
  doseColor,
  doseLabel,
  DOSE_VALUES_MG,
  DOSE_COLORS,
} from "@/lib/dashboard-data";
import { imcReferenceAreas, ImcBandsLegend } from "./ImcReferenceBands";

export type MultiMonthRow = {
  label: string;
  /** values[i] = valor no i-ésimo mês relativo (0 = inicial). undefined = sem medição. */
  values: Array<number | null>;
  /** doses[i] = dose em mg (Mounjaro) no i-ésimo mês relativo. null/ausente = sem dose. */
  doses?: Array<number | null>;
};

type Props = {
  title: string;
  rows: MultiMonthRow[];
  metric: "peso" | "imc";
  unit: string;
  height?: number;
  onBarClick?: (rowIndex: number) => void;
  /** Quando true, sobrepõe badge com a dose do Mounjaro acima de cada barra. */
  showDoses?: boolean;
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

export function MultiMonthBarChart({
  title,
  rows,
  metric,
  unit,
  height = 420,
  onBarClick,
  showDoses = false,
}: Props) {
  const maxN = rows.reduce((acc, r) => Math.max(acc, r.values.length), 0);
  const monthIdxs = Array.from({ length: maxN }, (_, i) => i);

  const data = rows.map((r) => {
    const obj: Record<string, string | number | null> = { label: r.label };
    monthIdxs.forEach((i) => {
      obj[`m${i}`] = r.values[i] ?? null;
      if (showDoses) obj[`d${i}`] = r.doses?.[i] ?? null;
    });
    return obj;
  });

  const legendName = (i: number) => {
    const base = rotuloMesRelativo(i);
    return metric === "peso" ? `Peso ${base} (kg)` : `IMC ${base}`;
  };

  // Quais doses aparecem nos dados (para legenda dinâmica)
  const dosesUsadas = new Set<number>();
  if (showDoses) {
    rows.forEach((r) =>
      r.doses?.forEach((d) => {
        if (d != null) {
          // arredonda para o valor padrão mais próximo
          let best = DOSE_VALUES_MG[0] as number;
          let bd = Math.abs(d - best);
          for (const v of DOSE_VALUES_MG) {
            const x = Math.abs(d - v);
            if (x < bd) {
              best = v;
              bd = x;
            }
          }
          dosesUsadas.add(best);
        }
      }),
    );
  }
  const dosesLegenda = Array.from(dosesUsadas).sort((a, b) => a - b);

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
            formatter={(value: number | string, name: string, item) => {
              if (typeof value !== "number") return value;
              const formatted = value.toLocaleString("pt-BR");
              if (showDoses) {
                const payload = (item as { payload?: Record<string, unknown> })?.payload ?? {};
                // name vem como o legendName: extrair índice via dataKey do item
                const dataKey = (item as { dataKey?: string })?.dataKey;
                if (typeof dataKey === "string" && dataKey.startsWith("m")) {
                  const idx = dataKey.slice(1);
                  const dose = payload[`d${idx}`];
                  if (typeof dose === "number") {
                    return [`${formatted}  ·  Mounjaro ${doseLabel(dose)}`, name];
                  }
                }
              }
              return formatted;
            }}
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
            >
              {showDoses && (
                <LabelList
                  dataKey={`d${i}`}
                  position="top"
                  content={(props: {
                    x?: number | string;
                    y?: number | string;
                    width?: number | string;
                    value?: number | string;
                  }) => {
                    const { x, y, width, value } = props;
                    if (value == null || value === "") return null;
                    const mg = typeof value === "number" ? value : parseFloat(String(value));
                    if (!Number.isFinite(mg)) return null;
                    const cx = Number(x) + Number(width) / 2;
                    const cy = Number(y) - 6;
                    const color = doseColor(mg);
                    const text = mg % 1 === 0 ? String(mg) : mg.toString().replace(".", ",");
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={7} fill={color} stroke="var(--card)" strokeWidth={1} />
                        <text
                          x={cx}
                          y={cy}
                          textAnchor="middle"
                          dominantBaseline="central"
                          style={{ fontSize: 8, fontWeight: 600, fill: mg >= 7.5 ? "#fff" : "#1e1b4b" }}
                        >
                          {text}
                        </text>
                      </g>
                    );
                  }}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      {metric === "imc" && <ImcBandsLegend className="mt-2" />}
      {showDoses && dosesLegenda.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-medium">Mounjaro:</span>
          {dosesLegenda.map((d) => (
            <span key={d} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 rounded-full border border-card"
                style={{ background: DOSE_COLORS[d] }}
              />
              {doseLabel(d)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
