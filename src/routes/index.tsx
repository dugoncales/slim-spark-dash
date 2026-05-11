import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Scale, TrendingUp, ArrowDownToLine, Lightbulb, Trophy, Users, UploadCloud, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { fetchAll, formatMes, nomeOuNumero, type Participante, type Medicao } from "@/lib/dashboard-data";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ComparisonChart } from "@/components/dashboard/ComparisonChart";
import { UploadDialog } from "@/components/dashboard/UploadDialog";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function fmt(n: number, d = 1) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function Dashboard() {
  const { session, loading, signOut, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  const [mostrarNomes, setMostrarNomes] = useState(false);
  const [mesSel, setMesSel] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    setMostrarNomes(localStorage.getItem("mostrarNomes") === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("mostrarNomes", mostrarNomes ? "1" : "0");
  }, [mostrarNomes]);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchAll,
    enabled: !!session,
  });

  const meses = useMemo(() => {
    if (!data) return [];
    const s = new Set(data.medicoes.map(m => m.mes_referencia));
    return Array.from(s).sort();
  }, [data]);

  useEffect(() => {
    if (meses.length && !mesSel) setMesSel(meses[meses.length - 1]);
  }, [meses, mesSel]);

  if (loading || isLoading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  const participantes = data?.participantes ?? [];
  const medicoesDoMes = (data?.medicoes ?? []).filter(m => m.mes_referencia === mesSel);
  const byPart = new Map(medicoesDoMes.map(m => [m.participante_id, m]));

  const rows = participantes
    .filter(p => byPart.has(p.id))
    .map(p => {
      const m = byPart.get(p.id)!;
      const perdaKg = (m.peso ?? 0) - p.peso_inicial;
      const perdaPct = p.peso_inicial ? (perdaKg / p.peso_inicial) * 100 : 0;
      return { p, m, perdaKg, perdaPct };
    });

  const n = rows.length || 1;
  const sum = (f: (r: typeof rows[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  const kpis = {
    pesoIniMed: sum(r => r.p.peso_inicial) / n,
    pesoMesMed: sum(r => r.m.peso ?? 0) / n,
    imcIniMed: sum(r => r.p.imc_inicial) / n,
    imcMesMed: sum(r => r.m.imc ?? 0) / n,
    perdaMedPct: sum(r => r.perdaPct) / n,
    perdaTotalKg: -sum(r => r.perdaKg),
    pesoIniTotal: sum(r => r.p.peso_inicial),
    pesoMesTotal: sum(r => r.m.peso ?? 0),
  };

  const reduziramPeso = rows.filter(r => r.perdaKg < 0).length;
  const reduziramImc = rows.filter(r => (r.m.imc ?? 0) < r.p.imc_inicial).length;

  const top3 = [...rows].sort((a, b) => a.perdaPct - b.perdaPct).slice(0, 3);

  const chartData = rows.map((r, i) => ({
    label: mostrarNomes ? r.p.nome.split(" ")[0] : String(i + 1),
    pesoIni: r.p.peso_inicial,
    pesoMes: r.m.peso ?? 0,
    imcIni: r.p.imc_inicial,
    imcMes: r.m.imc ?? 0,
    circIni: r.p.circunferencia_inicial ?? 0,
    circMes: r.m.circunferencia ?? 0,
  }));

  return (
    <div className="min-h-screen bg-background">
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onSuccess={refetch} />

      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-[1500px] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">H</div>
            <div>
              <h1 className="text-lg font-bold text-primary tracking-tight">HEALTHBIT</h1>
              <p className="text-[10px] text-muted-foreground -mt-1">uma empresa RDsaúde</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden md:inline">{user?.email}</span>
            <Link to="/admin"><Button variant="ghost" size="sm"><Settings className="h-4 w-4 mr-1" />Admin</Button></Link>
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate({ to: "/login" }))}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-6 space-y-6">
        {/* Title bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Acompanhamento de IMC e Peso</h2>
            <p className="text-sm text-muted-foreground">Visão geral inicial e por mês</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs bg-card border rounded-md px-3 py-2">
              {mostrarNomes ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              <span>Mostrar nomes</span>
              <Switch checked={mostrarNomes} onCheckedChange={setMostrarNomes} />
            </div>
            <Select value={mesSel ?? undefined} onValueChange={setMesSel}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
              <SelectContent>
                {meses.map(m => <SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => setUploadOpen(true)} className="gap-2"><UploadCloud className="h-4 w-4" />Importar planilha</Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <Card className="p-12 text-center">
            <h3 className="text-lg font-semibold">Nenhum dado para o mês selecionado</h3>
            <p className="text-sm text-muted-foreground mt-2">Importe a planilha mensal para começar.</p>
            <Button className="mt-4" onClick={() => setUploadOpen(true)}><UploadCloud className="h-4 w-4 mr-2" />Importar planilha</Button>
          </Card>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiCard icon={Scale} label="Peso Inicial Médio" value={fmt(kpis.pesoIniMed)} unit="kg" />
              <KpiCard icon={Scale} label={`Peso ${formatMes(mesSel!).split("/")[0]} Médio`} value={fmt(kpis.pesoMesMed)} unit="kg" accent="accent" />
              <KpiCard icon={TrendingUp} label="IMC Inicial Médio" value={fmt(kpis.imcIniMed)} unit="kg/m²" />
              <KpiCard icon={TrendingUp} label="IMC do Mês Médio" value={fmt(kpis.imcMesMed)} unit="kg/m²" accent="accent" />
              <KpiCard icon={ArrowDownToLine} label="Perda Média de Peso" value={`${fmt(Math.abs(kpis.perdaMedPct), 1)}%`} accent="accent" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
              <div className="space-y-6">
                {/* Table */}
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr className="text-left">
                          <th className="px-4 py-3 font-medium">Pessoa</th>
                          <th className="px-4 py-3 font-medium">IMC Inicial</th>
                          <th className="px-4 py-3 font-medium">Peso Inicial (kg)</th>
                          <th className="px-4 py-3 font-medium">Peso Mês (kg)</th>
                          <th className="px-4 py-3 font-medium">IMC Mês</th>
                          <th className="px-4 py-3 font-medium">Perda (kg)</th>
                          <th className="px-4 py-3 font-medium">Perda (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(r => (
                          <tr key={r.p.id} className="border-t hover:bg-muted/30">
                            <td className="px-4 py-2.5 font-medium">{nomeOuNumero(r.p, mostrarNomes)}</td>
                            <td className="px-4 py-2.5">{fmt(r.p.imc_inicial)}</td>
                            <td className="px-4 py-2.5">{fmt(r.p.peso_inicial)}</td>
                            <td className="px-4 py-2.5">{fmt(r.m.peso ?? 0)}</td>
                            <td className="px-4 py-2.5">{fmt(r.m.imc ?? 0, 2)}</td>
                            <td className={`px-4 py-2.5 font-semibold ${r.perdaKg < 0 ? "text-success" : "text-destructive"}`}>{fmt(r.perdaKg, 1)}</td>
                            <td className={`px-4 py-2.5 font-semibold ${r.perdaPct < 0 ? "text-success" : "text-destructive"}`}>{fmt(r.perdaPct, 2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <ComparisonChart title="Peso Inicial vs Mês (kg)" data={chartData} keyA="pesoIni" keyB="pesoMes" labelA="Peso Inicial (kg)" labelB="Peso Mês (kg)" unit="Peso (kg)" />
                  <ComparisonChart title="IMC Inicial vs Mês (kg/m²)" data={chartData} keyA="imcIni" keyB="imcMes" labelA="IMC Inicial" labelB="IMC Mês" unit="IMC (kg/m²)" />
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-3 text-primary"><Lightbulb className="h-5 w-5" /><h3 className="font-semibold text-foreground">Insights do período</h3></div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span>{reduziramPeso === rows.length ? "Todos apresentaram redução de peso." : `${reduziramPeso} de ${rows.length} reduziram peso.`}</li>
                    <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span>{reduziramImc === rows.length ? "Todos reduziram seu IMC." : `${reduziramImc} de ${rows.length} reduziram IMC.`}</li>
                    <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span>Peso médio reduziu {fmt(kpis.pesoIniMed - kpis.pesoMesMed, 1)} kg.</li>
                    <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span>IMC médio reduziu {fmt(kpis.imcIniMed - kpis.imcMesMed, 1)} kg/m².</li>
                  </ul>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-3 text-primary"><Trophy className="h-5 w-5" /><h3 className="font-semibold text-foreground">Top evolução do mês</h3></div>
                  <ol className="space-y-2 text-sm">
                    {top3.map((r, i) => (
                      <li key={r.p.id} className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><span className="font-bold text-primary w-5">{i + 1}º</span>{nomeOuNumero(r.p, mostrarNomes)}</span>
                        <span className="font-semibold text-success">{fmt(r.perdaPct, 2)}%</span>
                      </li>
                    ))}
                  </ol>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-3 text-primary"><Users className="h-5 w-5" /><h3 className="font-semibold text-foreground">Resumo do grupo</h3></div>
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><dt className="text-muted-foreground">Peso inicial total</dt><dd className="font-semibold">{fmt(kpis.pesoIniTotal)} kg</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Peso após 1 mês total</dt><dd className="font-semibold">{fmt(kpis.pesoMesTotal)} kg</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Perda total de peso</dt><dd className="font-semibold text-success">{fmt(kpis.perdaTotalKg)} kg</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Perda média</dt><dd className="font-semibold text-success">{fmt(Math.abs(kpis.perdaMedPct), 1)}%</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">IMC inicial médio</dt><dd className="font-semibold">{fmt(kpis.imcIniMed)} kg/m²</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">IMC mês médio</dt><dd className="font-semibold">{fmt(kpis.imcMesMed)} kg/m²</dd></div>
                  </dl>
                </Card>
              </div>
            </div>

            {/* Tabs adicionais */}
            <Tabs defaultValue="circ" className="w-full">
              <TabsList>
                <TabsTrigger value="circ">Circunferência abdominal</TabsTrigger>
                <TabsTrigger value="trat">Tratamento</TabsTrigger>
                <TabsTrigger value="cons">Acompanhamento multidisciplinar</TabsTrigger>
              </TabsList>
              <TabsContent value="circ">
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr className="text-left"><th className="px-4 py-3">Pessoa</th><th className="px-4 py-3">Circ. Inicial (cm)</th><th className="px-4 py-3">Circ. Mês (cm)</th><th className="px-4 py-3">Variação</th></tr>
                      </thead>
                      <tbody>
                        {rows.map(r => {
                          const ci = r.p.circunferencia_inicial;
                          const cm = r.m.circunferencia;
                          const diff = ci != null && cm != null ? cm - ci : null;
                          return (
                            <tr key={r.p.id} className="border-t hover:bg-muted/30">
                              <td className="px-4 py-2.5 font-medium">{nomeOuNumero(r.p, mostrarNomes)}</td>
                              <td className="px-4 py-2.5">{ci != null ? fmt(ci, 1) : "—"}</td>
                              <td className="px-4 py-2.5">{cm != null ? fmt(cm, 1) : "Não mensurada"}</td>
                              <td className={`px-4 py-2.5 font-semibold ${diff != null ? (diff < 0 ? "text-success" : "text-destructive") : ""}`}>{diff != null ? fmt(diff, 1) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>
              <TabsContent value="trat">
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr className="text-left"><th className="px-4 py-3">Pessoa</th><th className="px-4 py-3">Medicamento</th><th className="px-4 py-3">Dose</th><th className="px-4 py-3">Observação</th></tr>
                      </thead>
                      <tbody>
                        {rows.map(r => (
                          <tr key={r.p.id} className="border-t hover:bg-muted/30">
                            <td className="px-4 py-2.5 font-medium">{nomeOuNumero(r.p, mostrarNomes)}</td>
                            <td className="px-4 py-2.5">{r.m.medicamento ?? "—"}</td>
                            <td className="px-4 py-2.5">{r.m.dose ?? "—"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{r.m.observacao ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>
              <TabsContent value="cons">
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr className="text-left"><th className="px-4 py-3">Pessoa</th><th className="px-4 py-3 text-center">Endócrino</th><th className="px-4 py-3 text-center">Nutricionista</th><th className="px-4 py-3 text-center">Psicologia</th><th className="px-4 py-3 text-center">Ed. Física</th><th className="px-4 py-3 text-center">Total</th></tr>
                      </thead>
                      <tbody>
                        {rows.map(r => {
                          const total = (r.m.consultas_endocrino ?? 0) + (r.m.consultas_nutri ?? 0) + (r.m.consultas_psico ?? 0) + (r.m.consultas_edfisica ?? 0);
                          return (
                            <tr key={r.p.id} className="border-t hover:bg-muted/30">
                              <td className="px-4 py-2.5 font-medium">{nomeOuNumero(r.p, mostrarNomes)}</td>
                              <td className="px-4 py-2.5 text-center">{r.m.consultas_endocrino ?? 0}</td>
                              <td className="px-4 py-2.5 text-center">{r.m.consultas_nutri ?? 0}</td>
                              <td className="px-4 py-2.5 text-center">{r.m.consultas_psico ?? 0}</td>
                              <td className="px-4 py-2.5 text-center">{r.m.consultas_edfisica ?? 0}</td>
                              <td className="px-4 py-2.5 text-center font-semibold text-primary">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        <p className="text-xs text-muted-foreground border-t pt-4">ℹ️ Dados referentes apenas ao período selecionado.</p>
      </main>
    </div>
  );
}
