import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
} from "recharts";
import {
  ATIV_FISICA_COLOR,
  ATIV_FISICA_LABEL,
  NUTRI_FIELDS,
  type EvolucaoAderenciaConsultasMes,
  type EvolucaoAtividadeFisicaMes,
  type EvolucaoNutricaoMes,
} from "@/lib/dashboard-data";

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

const fmtPct = (v: number | string) =>
  typeof v === "number" ? `${v.toFixed(0)}%` : v;

export function AtividadeFisicaChart({ data }: { data: EvolucaoAtividadeFisicaMes[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: -4, bottom: 8 }} stackOffset="expand">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 7]}
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            label={{ value: "dias/sem.", angle: -90, position: "insideRight", fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number | string, name) => {
              if (name === "Dias/semana (média)") {
                return [typeof value === "number" ? value.toFixed(1) : value, name];
              }
              return [typeof value === "number" ? `${(value * 100).toFixed(0)}%` : value, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="left" dataKey="pctNaoPratica" stackId="a" fill={ATIV_FISICA_COLOR.nao_pratica} name={ATIV_FISICA_LABEL.nao_pratica} />
          <Bar yAxisId="left" dataKey="pctLeve" stackId="a" fill={ATIV_FISICA_COLOR.leve} name={ATIV_FISICA_LABEL.leve} />
          <Bar yAxisId="left" dataKey="pctModerada" stackId="a" fill={ATIV_FISICA_COLOR.moderada} name={ATIV_FISICA_LABEL.moderada} />
          <Bar yAxisId="left" dataKey="pctIntensa" stackId="a" fill={ATIV_FISICA_COLOR.intensa} name={ATIV_FISICA_LABEL.intensa} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="diasMedia"
            stroke="#0f172a"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Dias/semana (média)"
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-muted-foreground mt-1">
        Distribuição percentual da intensidade da atividade física por mês; linha mostra média de dias/semana.
      </p>
    </div>
  );
}

const NUTRI_COLORS = ["#15803d", "#059669", "#0891b2", "#7c3aed", "#db2777", "#ea580c"];

export function NutricaoChart({ data }: { data: EvolucaoNutricaoMes[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: -4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number | string) => (typeof v === "number" ? `${v.toFixed(0)}%` : v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {NUTRI_FIELDS.map((f, i) => (
            <Bar key={f.key} dataKey={f.key} name={f.label} fill={NUTRI_COLORS[i % NUTRI_COLORS.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-muted-foreground mt-1">
        % de pacientes que reportaram cada mudança alimentar no mês.
      </p>
    </div>
  );
}

export function AderenciaConsultasChart({ data }: { data: EvolucaoAderenciaConsultasMes[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis domain={[0, 100]} tickFormatter={fmtPct} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number | string) => (typeof v === "number" ? `${v.toFixed(0)}%` : "—")} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="endocrino" name="Endócrino" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="nutri" name="Nutricionista" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="psico" name="Psicologia" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="edfisica" name="Ed. Física" stroke="#ea580c" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="media" name="Média global" stroke="#0f172a" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 4 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-muted-foreground mt-1">
        % adesão = consultas realizadas ÷ agendadas. Linhas só aparecem em meses com consultas agendadas.
      </p>
    </div>
  );
}
