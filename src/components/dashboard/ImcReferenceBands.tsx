import { ReferenceArea } from "recharts";

export type ImcBand = {
  id: string;
  label: string;
  min: number;
  max: number; // Infinity para a última faixa
  color: string;
};

export const IMC_BANDS: ImcBand[] = [
  { id: "abaixo", label: "Abaixo do peso (< 18,5)", min: 0, max: 18.5, color: "#93c5fd" },
  { id: "normal", label: "Peso normal (18,5–24,9)", min: 18.5, max: 24.9, color: "#86efac" },
  { id: "sobrepeso", label: "Sobrepeso (25,0–29,9)", min: 24.9, max: 29.9, color: "#fcd34d" },
  { id: "ob1", label: "Obesidade I (30,0–34,9)", min: 29.9, max: 34.9, color: "#fdba74" },
  { id: "ob2", label: "Obesidade II (35,0–39,9)", min: 34.9, max: 39.9, color: "#fb923c" },
  { id: "ob3", label: "Obesidade III (≥ 40,0)", min: 39.9, max: 100, color: "#fca5a5" },
];

/**
 * Renderiza as faixas IMC como filhos de um Recharts chart.
 * `yAxisId` é necessário quando o gráfico tem múltiplos eixos Y.
 */
export function ImcReferenceBands({ yAxisId }: { yAxisId?: string }) {
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
