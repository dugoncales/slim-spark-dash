import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Legend } from "recharts";

export type EvolucaoPoint = {
  mesLabel: string;
  pesoMedio: number | null;
  imcMedio: number | null;
  circMedia: number | null;
  n: number;
};

export function EvolucaoChart({ data }: { data: EvolucaoPoint[] }) {
  const config = {
    pesoMedio: { label: "Peso médio (kg)", color: "hsl(var(--primary))" },
    imcMedio: { label: "IMC médio (kg/m²)", color: "hsl(var(--accent-foreground))" },
    circMedia: { label: "Circunferência média (cm)", color: "hsl(var(--destructive))" },
  } as const;

  return (
    <Card className="p-4">
      <div className="mb-2">
        <h3 className="font-semibold text-foreground">Evolução do grupo ao longo dos meses</h3>
        <p className="text-xs text-muted-foreground">Médias por mês — apenas pacientes já iniciados</p>
      </div>
      <ChartContainer config={config} className="h-[280px] w-full">
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
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
    </Card>
  );
}
