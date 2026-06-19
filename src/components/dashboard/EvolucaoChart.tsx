import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Legend } from "recharts";
import { imcReferenceAreas, ImcBandsLegend } from "./ImcReferenceBands";

export type EvolucaoPoint = {
  mesLabel: string;
  pesoMedio: number | null;
  imcMedio: number | null;
  circMedia: number | null;
  n: number;
};

export type EvolucaoSerie = {
  grupoId: string;
  nome: string;
  cor: string;
  dados: EvolucaoPoint[];
};

/**
 * Renders the evolution chart. If `series` is provided (2+ groups), draws one
 * line per group (peso médio) instead of the default peso+imc+circ trio.
 */
export function EvolucaoChart({
  data,
  series,
}: {
  data: EvolucaoPoint[];
  series?: EvolucaoSerie[];
}) {
  if (series && series.length >= 2) {
    return <MultiSerieChart series={series} />;
  }

  const config = {
    pesoMedio: { label: "Peso médio (kg)", color: "var(--chart-1)" },
    imcMedio: { label: "IMC médio (kg/m²)", color: "var(--chart-2)" },
    circMedia: { label: "Circunferência média (cm)", color: "var(--chart-3)" },
  } as const;

  return (
    <div>
      <ChartContainer config={config} className="h-[380px] w-full">
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 50]} />
          {imcReferenceAreas({ yAxisId: "right" })}
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label, payload) => {
                  const n = payload?.[0]?.payload?.n;
                  return `${label}${n != null ? ` · n=${n}` : ""}`;
                }}
              />
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="left" type="monotone" dataKey="pesoMedio" stroke="var(--color-pesoMedio)" strokeWidth={2} dot={{ r: 3 }} name="Peso médio (kg)" connectNulls />
          <Line yAxisId="right" type="monotone" dataKey="imcMedio" stroke="var(--color-imcMedio)" strokeWidth={2} dot={{ r: 3 }} name="IMC médio (kg/m²)" connectNulls />
          <Line yAxisId="left" type="monotone" dataKey="circMedia" stroke="var(--color-circMedia)" strokeWidth={2} dot={{ r: 3 }} name="Circunferência média (cm)" connectNulls />
        </LineChart>
      </ChartContainer>
      <ImcBandsLegend className="mt-2" />
    </div>
  );
}

/** One line per group, comparing peso médio across all months. */
function MultiSerieChart({ series }: { series: EvolucaoSerie[] }) {
  // Build a merged dataset: { mesLabel, [grupoId]: pesoMedio }
  const mesesSet = new Set<string>();
  series.forEach((s) => s.dados.forEach((d) => mesesSet.add(d.mesLabel)));
  const meses = Array.from(mesesSet);
  const data = meses.map((mes) => {
    const row: Record<string, number | string | null> = { mesLabel: mes };
    series.forEach((s) => {
      const p = s.dados.find((d) => d.mesLabel === mes);
      row[s.grupoId] = p?.pesoMedio ?? null;
    });
    return row;
  });

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        Comparação de peso médio (kg) entre {series.length} grupos.
      </p>
      <ChartContainer config={{}} className="h-[380px] w-full">
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s) => (
            <Line
              key={s.grupoId}
              type="monotone"
              dataKey={s.grupoId}
              stroke={s.cor}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={s.nome}
              connectNulls
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
}
