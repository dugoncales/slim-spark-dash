import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Scale,
  TrendingUp,
  TrendingDown,
  Ruler,
  CalendarDays,
  Activity,
  Stethoscope,
  Apple,
  Brain,
  Dumbbell,
  Target,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import {
  fetchAll,
  serieParticipante,
  calcPesoIdealRange,
  formatMes,
  nomeOuNumero,
} from "@/lib/dashboard-data";
import { imcReferenceAreas, ImcBandsLegend } from "@/components/dashboard/ImcReferenceBands";

export const Route = createFileRoute("/paciente/$id")({
  component: PacientePage,
});

function fmt(n: number | null | undefined, d = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function PacientePage() {
  const { id } = Route.useParams();
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, isGestorSaude, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/login" });
  }, [authLoading, session, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchAll,
    enabled: !!session,
  });

  // gestor (não-gestor_saude / não-admin) vê dados clínicos mas com nome anonimizado.
  const mostrarNome = isAdmin || isGestorSaude;

  const participante = useMemo(
    () => data?.participantes.find((p) => p.id === id) ?? null,
    [data, id],
  );

  const serie = useMemo(() => {
    if (!data || !participante) return [];
    return serieParticipante(participante, data.medicoes);
  }, [data, participante]);

  const medicoesOrdenadas = useMemo(() => {
    if (!data || !participante) return [];
    return data.medicoes
      .filter((m) => m.participante_id === participante.id)
      .sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia));
  }, [data, participante]);

  if (authLoading || rolesLoading || isLoading || !session) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!participante) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao dashboard
          </Link>
        </Button>
      </div>
    );
  }

  const nomeExibido = nomeOuNumero(participante, mostrarNome);
  const pesoInicial = serie[0]?.peso ?? participante.peso_inicial;
  const ultimo = serie[serie.length - 1];
  const pesoAtual = ultimo?.peso ?? null;
  const imcInicial = serie[0]?.imc ?? participante.imc_inicial;
  const imcAtual = ultimo?.imc ?? null;
  const perdaKg = pesoAtual != null && pesoInicial != null ? pesoAtual - pesoInicial : null;
  const perdaPct = perdaKg != null && pesoInicial ? (perdaKg / pesoInicial) * 100 : null;

  const idealRange = calcPesoIdealRange(participante.altura);

  const totals = medicoesOrdenadas.reduce(
    (acc, m) => {
      acc.endo += m.consultas_endocrino ?? 0;
      acc.nutri += m.consultas_nutri ?? 0;
      acc.psico += m.consultas_psico ?? 0;
      acc.edf += m.consultas_edfisica ?? 0;
      return acc;
    },
    { endo: 0, nutri: 0, psico: 0, edf: 0 },
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao dashboard
              </Link>
            </Button>
            <img src="/logo.webp" alt="HEALTHBIT" className="h-9 w-auto object-contain" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold">{nomeExibido}</h2>
                <Badge variant="outline">Nº {participante.numero}</Badge>
                {participante.ativo ? (
                  <Badge className="bg-success/15 text-success border-success/30">Ativo</Badge>
                ) : (
                  <Badge variant="secondary">Inativo</Badge>
                )}
              </div>
              <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Altura</dt>
                  <dd className="font-medium">
                    {participante.altura ? `${fmt(participante.altura, 2)} m` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Mês de início</dt>
                  <dd className="font-medium">
                    {participante.mes_inicio ? formatMes(participante.mes_inicio) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Meses acompanhados</dt>
                  <dd className="font-medium">{serie.length}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Peso saudável (IMC 18,5–24,9)</dt>
                  <dd className="font-medium">
                    {idealRange ? `${fmt(idealRange.min, 1)} – ${fmt(idealRange.max, 1)} kg` : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Card>

        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiBox icon={Scale} label="Peso inicial" value={fmt(pesoInicial)} unit="kg" />
          <KpiBox icon={Scale} label="Peso atual" value={fmt(pesoAtual)} unit="kg" accent />
          <KpiBox
            icon={perdaKg != null && perdaKg < 0 ? TrendingDown : TrendingUp}
            label="Perda total"
            value={perdaKg != null ? fmt(Math.abs(perdaKg)) : "—"}
            unit="kg"
            sub={
              perdaPct != null
                ? `${perdaPct < 0 ? "-" : "+"}${fmt(Math.abs(perdaPct), 2)}%`
                : undefined
            }
            tone={
              perdaKg == null
                ? undefined
                : perdaKg < 0
                  ? "success"
                  : perdaKg > 0
                    ? "destructive"
                    : undefined
            }
          />
          <KpiBox icon={TrendingUp} label="IMC inicial" value={fmt(imcInicial, 2)} unit="kg/m²" />
          <KpiBox
            icon={TrendingUp}
            label="IMC atual"
            value={fmt(imcAtual, 2)}
            unit="kg/m²"
            accent
          />
        </section>

        <Card className="p-5">
          <header className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Evolução mensal</h3>
          </header>
          {serie.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              Apenas um ponto registrado — sem evolução para plotar.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SeriePeso serie={serie} idealRange={idealRange} />
                <SerieImc serie={serie} />
              </div>
              {serie.some((s) => s.circunferencia != null) && (
                <div className="mt-4">
                  <SerieCirc serie={serie} />
                </div>
              )}
            </>
          )}
        </Card>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ConsultaCard icon={Stethoscope} label="Endocrinologia" value={totals.endo} />
          <ConsultaCard icon={Apple} label="Nutrição" value={totals.nutri} />
          <ConsultaCard icon={Brain} label="Psicologia" value={totals.psico} />
          <ConsultaCard icon={Dumbbell} label="Educação Física" value={totals.edf} />
        </section>

        <Card className="overflow-hidden">
          <header className="flex items-center gap-2 px-5 py-3 border-b">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Histórico mensal</h3>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-4 py-2.5 font-medium">Mês</th>
                  <th className="px-4 py-2.5 font-medium">Peso (kg)</th>
                  <th className="px-4 py-2.5 font-medium">IMC</th>
                  <th className="px-4 py-2.5 font-medium">Circ. (cm)</th>
                  <th className="px-4 py-2.5 font-medium">Medicamento</th>
                  <th className="px-4 py-2.5 font-medium">Dose</th>
                  <th className="px-4 py-2.5 font-medium text-center" title="Endocrinologia">
                    Endo
                  </th>
                  <th className="px-4 py-2.5 font-medium text-center" title="Nutrição">
                    Nutri
                  </th>
                  <th className="px-4 py-2.5 font-medium text-center" title="Psicologia">
                    Psico
                  </th>
                  <th className="px-4 py-2.5 font-medium text-center" title="Educação Física">
                    Ed.Fís
                  </th>
                  <th className="px-4 py-2.5 font-medium">Observação</th>
                </tr>
              </thead>
              <tbody>
                {medicoesOrdenadas.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-6 text-center text-muted-foreground">
                      Sem medições registradas.
                    </td>
                  </tr>
                ) : (
                  medicoesOrdenadas.map((m) => (
                    <tr key={m.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium">{formatMes(m.mes_referencia)}</td>
                      <td className="px-4 py-2.5">{fmt(m.peso)}</td>
                      <td className="px-4 py-2.5">{fmt(m.imc, 2)}</td>
                      <td className="px-4 py-2.5">{fmt(m.circunferencia)}</td>
                      <td className="px-4 py-2.5">{m.medicamento ?? "—"}</td>
                      <td className="px-4 py-2.5">{m.dose ?? "—"}</td>
                      <td className="px-4 py-2.5 text-center">{m.consultas_endocrino ?? 0}</td>
                      <td className="px-4 py-2.5 text-center">{m.consultas_nutri ?? 0}</td>
                      <td className="px-4 py-2.5 text-center">{m.consultas_psico ?? 0}</td>
                      <td className="px-4 py-2.5 text-center">{m.consultas_edfisica ?? 0}</td>
                      <td className="px-4 py-2.5 text-muted-foreground max-w-[280px] truncate">
                        {m.observacao ?? ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}

function KpiBox({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  accent,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  accent?: boolean;
  tone?: "success" | "destructive";
}) {
  const valueColor =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "";
  return (
    <Card className="p-4 flex items-start gap-3">
      <div
        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
          accent ? "bg-accent/15 text-accent-foreground" : "bg-primary/10 text-primary"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className={`text-xl font-bold leading-tight ${valueColor}`}>
          {value}
          {unit && <span className="text-xs font-semibold ml-1 text-muted-foreground">{unit}</span>}
        </p>
        {sub && (
          <p className={`text-[11px] mt-0.5 ${valueColor || "text-muted-foreground"}`}>{sub}</p>
        )}
      </div>
    </Card>
  );
}

function ConsultaCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground">consultas acumuladas</p>
      </div>
    </Card>
  );
}

type SerieRow = ReturnType<typeof serieParticipante>[number];

function SeriePeso({
  serie,
  idealRange,
}: {
  serie: SerieRow[];
  idealRange: { min: number; max: number } | null;
}) {
  // Domínio explícito que inclui a faixa saudável + o peso do paciente.
  // Sem isso, a ReferenceArea pode cair fora do viewport mesmo com extendDomain.
  const weights = serie.map((s) => s.peso).filter((w): w is number => w != null);
  const dataMin = weights.length ? Math.min(...weights) : 0;
  const dataMax = weights.length ? Math.max(...weights) : 100;
  const yMin = Math.floor(Math.min(dataMin, idealRange?.min ?? dataMin) - 5);
  const yMax = Math.ceil(Math.max(dataMax, idealRange?.max ?? dataMax) + 5);
  return (
    <div>
      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
        <Scale className="h-3.5 w-3.5 text-primary" />
        Peso (kg)
      </h4>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={serie} margin={{ top: 8, right: 12, left: -4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          {idealRange && (
            <ReferenceArea
              y1={idealRange.min}
              y2={idealRange.max}
              fill="#22c55e"
              fillOpacity={0.15}
              stroke="#16a34a"
              strokeDasharray="3 3"
              label={{
                value: "Faixa saudável",
                position: "insideRight",
                fontSize: 10,
                fill: "#15803d",
                style: { fontWeight: 600 },
              }}
            />
          )}
          <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" domain={[yMin, yMax]} />
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
          <Line
            type="monotone"
            dataKey="peso"
            stroke="#15803d"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#15803d" }}
            activeDot={{ r: 6 }}
            name="Peso (kg)"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      {idealRange && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Faixa saudável calculada a partir da altura ({fmt(idealRange.min, 1)} –{" "}
          {fmt(idealRange.max, 1)} kg, IMC 18,5–24,9).
        </p>
      )}
    </div>
  );
}

function SerieImc({ serie }: { serie: SerieRow[] }) {
  const imcMax = Math.max(0, ...serie.map((s) => s.imc ?? 0));
  // Cobre todas as 6 faixas (até IMC 40+) mesmo quando o paciente tem IMC baixo.
  const yMax = Math.max(50, imcMax + 5);
  return (
    <div>
      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
        <Target className="h-3.5 w-3.5 text-primary" />
        IMC (kg/m²)
      </h4>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={serie} margin={{ top: 8, right: 12, left: -4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          {imcReferenceAreas({ showLabels: true })}
          <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            domain={[0, yMax]}
            allowDataOverflow={false}
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
          <Line
            type="monotone"
            dataKey="imc"
            stroke="#0f766e"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#0f766e" }}
            activeDot={{ r: 6 }}
            name="IMC"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <ImcBandsLegend className="mt-2" />
    </div>
  );
}

function SerieCirc({ serie }: { serie: SerieRow[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
        <Ruler className="h-3.5 w-3.5 text-primary" />
        Circunferência (cm)
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={serie} margin={{ top: 8, right: 12, left: -4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            domain={["auto", "auto"]}
          />
          <ReferenceLine
            y={88}
            stroke="#f97316"
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
            label={{
              value: "Risco cardiovascular ♀ (>88cm)",
              fontSize: 10,
              fill: "#f97316",
              position: "insideTopRight",
            }}
          />
          <ReferenceLine
            y={102}
            stroke="#ef4444"
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
            label={{
              value: "Risco elevado ♀ (>102cm)",
              fontSize: 10,
              fill: "#ef4444",
              position: "insideTopRight",
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
          <Line
            type="monotone"
            dataKey="circunferencia"
            stroke="#7c3aed"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#7c3aed" }}
            activeDot={{ r: 6 }}
            name="Circunferência (cm)"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
