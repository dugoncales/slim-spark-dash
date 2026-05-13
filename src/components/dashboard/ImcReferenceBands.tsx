import { ReferenceArea } from "recharts";

export type ImcBand = {
  id: string;
  /** Texto longo usado na legenda fora do gráfico. */
  label: string;
  /** Texto curto usado dentro da faixa quando `showLabels`. */
  short: string;
  min: number;
  max: number;
  color: string;
  /** Cor escura da mesma família para o label dentro da faixa. */
  textColor: string;
};

export const IMC_BANDS: ImcBand[] = [
  {
    id: "abaixo",
    label: "Abaixo do peso (< 18,5)",
    short: "Abaixo do peso",
    min: 0,
    max: 18.5,
    color: "#93c5fd",
    textColor: "#1d4ed8",
  },
  {
    id: "normal",
    label: "Normal (18,5–24,9)",
    short: "Normal",
    min: 18.5,
    max: 24.9,
    color: "#86efac",
    textColor: "#15803d",
  },
  {
    id: "sobrepeso",
    label: "Sobrepeso (25,0–29,9)",
    short: "Sobrepeso",
    min: 24.9,
    max: 29.9,
    color: "#fde047",
    textColor: "#a16207",
  },
  {
    id: "ob1",
    label: "Obesidade I (30,0–34,9)",
    short: "Obesidade I",
    min: 29.9,
    max: 34.9,
    color: "#fb923c",
    textColor: "#9a3412",
  },
  {
    id: "ob2",
    label: "Obesidade II (35,0–39,9)",
    short: "Obesidade II",
    min: 34.9,
    max: 39.9,
    color: "#f97316",
    textColor: "#7c2d12",
  },
  {
    id: "ob3",
    label: "Obesidade III (≥ 40,0)",
    short: "Obesidade III",
    min: 39.9,
    max: 100,
    color: "#ef4444",
    textColor: "#991b1b",
  },
];

/**
 * Renderiza as faixas IMC como filhos de um Recharts chart.
 * `yAxisId` é necessário quando o gráfico tem múltiplos eixos Y.
 * `showLabels` desenha o nome da faixa dentro de cada área (útil quando a
 * faixa é o foco visual do gráfico).
 */
export function ImcReferenceBands({
  yAxisId,
  showLabels = false,
}: {
  yAxisId?: string;
  showLabels?: boolean;
}) {
  return (
    <>
      {IMC_BANDS.map((b) => (
        <ReferenceArea
          key={b.id}
          yAxisId={yAxisId}
          y1={b.min}
          y2={b.max}
          fill={b.color}
          fillOpacity={0.15}
          stroke="none"
          ifOverflow="extendDomain"
          label={
            showLabels
              ? {
                  value: b.short,
                  position: "insideLeft",
                  fontSize: 10,
                  fill: b.textColor,
                  style: { fontWeight: 600 },
                }
              : undefined
          }
        />
      ))}
    </>
  );
}

export function ImcBandsLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] ${className}`}>
      {IMC_BANDS.map((b) => (
        <div key={b.id} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm border"
            style={{ background: b.color, opacity: 0.4, borderColor: b.color }}
          />
          <span className="text-muted-foreground">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
