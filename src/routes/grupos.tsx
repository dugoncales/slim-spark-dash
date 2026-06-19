import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers, ArrowRight, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchAll,
  formatMes,
  mesesDistintosInicio,
  calcMarcos,
  calcEvolucaoGrupo,
  calcEvolucaoAderenciaConsultas,
  aplicarFiltroGrupos,
  SEM_GRUPO,
  type Grupo,
} from "@/lib/dashboard-data";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";

export const Route = createFileRoute("/grupos")({
  component: GruposExecutivo,
});

function fmt(n: number | null | undefined, d = 1) {
  if (n == null || !isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function GruposExecutivo() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [coorte, setCoorte] = useState<string>("__all__");

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchAll,
    enabled: !!session,
  });

  if (loading || isLoading || !session) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  const participantes = data?.participantes ?? [];
  const medicoes = data?.medicoes ?? [];
  const grupos = data?.grupos ?? [];
  const coorteAtiva = coorte !== "__all__" ? coorte : null;
  const coortesDisponiveis = mesesDistintosInicio(participantes);

  // Cards: one per active group + a synthetic "Sem grupo" card if any participant lacks group.
  const semGrupoCount = participantes.filter((p) => p.grupo_id == null).length;
  const cardsBase: Array<{ id: string; nome: string; cor: string; isSemGrupo: boolean }> = [
    ...grupos
      .filter((g) => g.ativo)
      .map((g: Grupo) => ({ id: g.id, nome: g.nome, cor: g.cor ?? "#3b82f6", isSemGrupo: false })),
  ];
  if (semGrupoCount > 0) {
    cardsBase.push({ id: SEM_GRUPO, nome: "Sem grupo", cor: "#94a3b8", isSemGrupo: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-[1600px] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Layers className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Dashboard executivo por grupo</h1>
              <p className="text-xs text-muted-foreground">
                Visão consolidada por grupo de análise (empresas, unidades, etc.)
              </p>
            </div>
          </div>
          {coortesDisponiveis.length > 1 && (
            <Select value={coorte} onValueChange={setCoorte}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Coorte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as coortes</SelectItem>
                {coortesDisponiveis.map((m) => (
                  <SelectItem key={m} value={m}>
                    Iniciaram em {formatMes(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {cardsBase.length === 0 ? (
          <Card className="p-12 text-center">
            <h3 className="text-lg font-semibold">Nenhum grupo cadastrado</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Peça a um administrador para criar grupos na página de Administração.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cardsBase.map((c) => (
              <GrupoCard
                key={c.id}
                grupo={c}
                participantes={participantes}
                medicoes={medicoes}
                coorte={coorteAtiva}
                onAbrir={() => {
                  try {
                    window.localStorage.setItem("grupoSel", JSON.stringify([c.id]));
                  } catch { /* ignore */ }
                  navigate({ to: "/" });
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function GrupoCard({
  grupo,
  participantes,
  medicoes,
  coorte,
  onAbrir,
}: {
  grupo: { id: string; nome: string; cor: string; isSemGrupo: boolean };
  participantes: import("@/lib/dashboard-data").Participante[];
  medicoes: import("@/lib/dashboard-data").Medicao[];
  coorte: string | null;
  onAbrir: () => void;
}) {
  const grupoIds = [grupo.id];
  const partsDoGrupo = aplicarFiltroGrupos(
    coorte ? participantes.filter((p) => p.mes_inicio === coorte) : participantes,
    grupoIds,
  ).filter((p) => p.ativo);

  const marcos = calcMarcos(participantes, medicoes, coorte, grupoIds);
  const evolucao = calcEvolucaoGrupo(participantes, medicoes, coorte, grupoIds);
  const aderencia = calcEvolucaoAderenciaConsultas(participantes, medicoes, coorte, grupoIds);
  const aderMedias = aderencia.map((a) => a.media).filter((v): v is number => v != null);
  const aderMedia = aderMedias.length ? aderMedias.reduce((a, b) => a + b, 0) / aderMedias.length : null;

  const pct5 = marcos.total ? (marcos.atingiram5 / marcos.total) * 100 : 0;
  const pesoIni = evolucao[0]?.pesoMedio ?? null;
  const pesoFim = [...evolucao].reverse().find((e) => e.pesoMedio != null)?.pesoMedio ?? null;
  const deltaPeso = pesoIni != null && pesoFim != null ? pesoFim - pesoIni : null;

  const sparkData = evolucao.map((e) => ({ peso: e.pesoMedio }));

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-block w-3 h-3 rounded-sm shrink-0"
            style={{ background: grupo.cor }}
          />
          <h3 className="font-semibold truncate">{grupo.nome}</h3>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
          <Users className="h-3 w-3" />
          {partsDoGrupo.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric label="Atingiram ≥5%" value={`${fmt(pct5, 0)}%`} sub={`${marcos.atingiram5}/${marcos.total}`} />
        <Metric
          label="Δ Peso médio"
          value={deltaPeso != null ? `${fmt(deltaPeso, 1)} kg` : "—"}
          tone={deltaPeso != null && deltaPeso < 0 ? "success" : undefined}
        />
        <Metric
          label="Perda média acum."
          value={`${fmt(Math.abs(marcos.perdaMediaAcumPct), 1)}%`}
          tone="success"
        />
        <Metric
          label="Adesão média"
          value={aderMedia != null ? `${fmt(aderMedia, 0)}%` : "—"}
        />
      </div>

      {sparkData.length > 1 && (
        <div className="h-12 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
              <Line
                type="monotone"
                dataKey="peso"
                stroke={grupo.cor}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <Button variant="outline" size="sm" className="gap-2 mt-auto" onClick={onAbrir}>
        Ver no dashboard <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </Card>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "destructive";
}) {
  const colorClass =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-md border bg-muted/30 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${colorClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
