import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Scale,
  TrendingUp,
  ArrowDownToLine,
  Lightbulb,
  Trophy,
  Users,
  UploadCloud,
  Eye,
  EyeOff,
  Target,
  TrendingDown,
  BarChart3,
  LineChart as LineChartIcon,
  Table as TableIcon,
  Activity,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import {
  fetchAll,
  formatMes,
  mesesDistintosInicio,
  calcEvolucaoGrupo,
  calcMarcos,
} from "@/lib/dashboard-data";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ComparisonChart } from "@/components/dashboard/ComparisonChart";
import { UploadDialog } from "@/components/dashboard/UploadDialog";
import { EvolucaoChart } from "@/components/dashboard/EvolucaoChart";
import { CollapsibleSection } from "@/components/dashboard/CollapsibleSection";
import {
  ExportMenu,
  H2C_OPTIONS,
  safeMonthSlug,
  type ExportRow,
  type ExportSummary,
} from "@/components/dashboard/ExportMenu";
import { ExportSectionsDialog, EXPORT_SECTIONS } from "@/components/dashboard/ExportSectionsDialog";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function fmt(n: number, d = 1) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

type ExportFormat = "pdf" | "png";

function Dashboard() {
  const { session, loading, user } = useAuth();
  const { isAdmin, isGestorSaude, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  // Privacy: gestor (not gestor_saude, not admin) sees no toggle, always anonymous.
  // gestor_saude default off. admin default on.
  const canToggleNames = isAdmin || isGestorSaude;
  const [mostrarNomes, setMostrarNomes] = useState(false);
  const [namesHydrated, setNamesHydrated] = useState(false);
  const [mesSel, setMesSel] = useState<string | null>(null);
  const [coorte, setCoorte] = useState<string>("__all__");
  const [uploadOpen, setUploadOpen] = useState(false);

  // Export flow:
  // 1) User clicks PDF / PNG in ExportMenu -> setDialogFormat(format) opens dialog.
  // 2) User picks sections, clicks confirm -> setActiveExport({ format, selected }) + close dialog.
  // 3) Effect detects activeExport, waits for re-render & chart paint, runs html2canvas-pro, clears state.
  const [dialogFormat, setDialogFormat] = useState<ExportFormat | null>(null);
  const [activeExport, setActiveExport] = useState<{
    format: ExportFormat;
    selected: Set<string>;
  } | null>(null);

  useEffect(() => {
    if (rolesLoading) return;
    if (!canToggleNames) {
      setMostrarNomes(false);
      setNamesHydrated(true);
      return;
    }
    const stored = window.localStorage.getItem("mostrarNomes");
    if (stored !== null) setMostrarNomes(stored === "1");
    else setMostrarNomes(isAdmin);
    setNamesHydrated(true);
  }, [rolesLoading, canToggleNames, isAdmin]);

  useEffect(() => {
    if (namesHydrated && canToggleNames) {
      window.localStorage.setItem("mostrarNomes", mostrarNomes ? "1" : "0");
    }
  }, [mostrarNomes, namesHydrated, canToggleNames]);

  useEffect(() => {
    const c = window.localStorage.getItem("coorte");
    if (c) setCoorte(c);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("coorte", coorte);
  }, [coorte]);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchAll,
    enabled: !!session,
  });

  const meses = useMemo(() => {
    if (!data) return [];
    const s = new Set(data.medicoes.map((m) => m.mes_referencia));
    return Array.from(s).sort();
  }, [data]);

  useEffect(() => {
    if (meses.length && !mesSel) setMesSel(meses[meses.length - 1]);
  }, [meses, mesSel]);

  // Run the actual snapshot when activeExport is set. We wait long enough for
  // newly-mounted Recharts components (sections that were collapsed prior to
  // export-mode flip) to measure + paint their default 1500ms animation.
  useEffect(() => {
    if (!activeExport) return;
    let cancelled = false;
    const run = async () => {
      // Give React time to flush the export-mode tree and Recharts time to
      // mount + animate. 1700ms covers the default Recharts animation.
      await new Promise((r) => setTimeout(r, 1700));
      if (cancelled) return;
      const el = document.getElementById("dashboard-export");
      if (!el) {
        setActiveExport(null);
        return;
      }
      const slug = safeMonthSlug(mesSel ? formatMes(mesSel) : "dashboard");
      try {
        const { default: html2canvas } = await import("html2canvas-pro");
        const canvas = await html2canvas(el, H2C_OPTIONS as Parameters<typeof html2canvas>[1]);
        if (cancelled) return;
        if (activeExport.format === "pdf") {
          const { jsPDF } = await import("jspdf");
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
          const pageW = pdf.internal.pageSize.getWidth();
          const pageH = pdf.internal.pageSize.getHeight();
          const imgW = pageW;
          const imgH = (canvas.height * pageW) / canvas.width;
          let position = 0;
          let heightLeft = imgH;
          pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
          heightLeft -= pageH;
          while (heightLeft > 0) {
            position -= pageH;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
            heightLeft -= pageH;
          }
          pdf.save(`dashboard-${slug}.pdf`);
          toast.success("PDF exportado.");
        } else {
          await new Promise<void>((resolve) => {
            canvas.toBlob((b) => {
              if (!b) {
                toast.error("Falha ao gerar imagem.");
                resolve();
                return;
              }
              const url = URL.createObjectURL(b);
              const a = document.createElement("a");
              a.href = url;
              a.download = `dashboard-${slug}.png`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              toast.success("PNG exportado.");
              resolve();
            }, "image/png");
          });
        }
      } catch (err) {
        if (!cancelled) toast.error("Erro ao exportar: " + (err as Error).message);
      } finally {
        if (!cancelled) setActiveExport(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [activeExport, mesSel]);

  if (loading || isLoading || !session) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  const allParticipantes = data?.participantes ?? [];
  const allMedicoes = data?.medicoes ?? [];
  const coorteAtiva = coorte !== "__all__" ? coorte : null;
  const coortesDisponiveis = mesesDistintosInicio(allParticipantes);
  const participantes = coorteAtiva
    ? allParticipantes.filter((p) => p.mes_inicio === coorteAtiva)
    : allParticipantes;
  const medicoesDoMes = allMedicoes.filter((m) => m.mes_referencia === mesSel);
  const byPart = new Map(medicoesDoMes.map((m) => [m.participante_id, m]));

  const iniciaramNoMes = participantes.filter(
    (p) => byPart.has(p.id) && p.mes_inicio === mesSel,
  ).length;
  const rows = participantes
    .filter((p) => byPart.has(p.id) && p.mes_inicio !== mesSel)
    .map((p) => {
      const m = byPart.get(p.id)!;
      const perdaKg = (m.peso ?? 0) - p.peso_inicial;
      const perdaPct = p.peso_inicial ? (perdaKg / p.peso_inicial) * 100 : 0;
      return { p, m, perdaKg, perdaPct };
    });

  const displayName = (p: { nome: string; numero: number }, idx?: number) =>
    mostrarNomes ? p.nome : `Pessoa ${idx != null ? idx + 1 : p.numero}`;

  const n = rows.length || 1;
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  const kpis = {
    pesoIniMed: sum((r) => r.p.peso_inicial) / n,
    pesoMesMed: sum((r) => r.m.peso ?? 0) / n,
    imcIniMed: sum((r) => r.p.imc_inicial) / n,
    imcMesMed: sum((r) => r.m.imc ?? 0) / n,
    perdaMedPct: sum((r) => r.perdaPct) / n,
    perdaTotalKg: -sum((r) => r.perdaKg),
    pesoIniTotal: sum((r) => r.p.peso_inicial),
    pesoMesTotal: sum((r) => r.m.peso ?? 0),
  };

  const reduziramPeso = rows.filter((r) => r.perdaKg < 0).length;
  const reduziramImc = rows.filter((r) => (r.m.imc ?? 0) < r.p.imc_inicial).length;

  const sortedRows = [...rows].sort((a, b) => a.perdaPct - b.perdaPct);
  const top3 = sortedRows.slice(0, 3).map((r) => ({
    ...r,
    origIdx: rows.indexOf(r),
  }));

  const chartData = rows.map((r, i) => ({
    label: mostrarNomes ? r.p.nome.split(" ")[0] : String(i + 1),
    pesoIni: r.p.peso_inicial,
    pesoMes: r.m.peso ?? 0,
    imcIni: r.p.imc_inicial,
    imcMes: r.m.imc ?? 0,
    circIni: r.p.circunferencia_inicial ?? 0,
    circMes: r.m.circunferencia ?? 0,
  }));

  const evolucao = calcEvolucaoGrupo(allParticipantes, allMedicoes, coorteAtiva);
  const marcos = calcMarcos(allParticipantes, allMedicoes, coorteAtiva);
  const pct5 = marcos.total ? (marcos.atingiram5 / marcos.total) * 100 : 0;
  const pct10 = marcos.total ? (marcos.atingiram10 / marcos.total) * 100 : 0;

  const exportRows: ExportRow[] = rows.map((r, i) => ({
    nome: displayName(r.p, i),
    pesoInicial: r.p.peso_inicial,
    pesoMes: r.m.peso,
    imcInicial: r.p.imc_inicial,
    imcMes: r.m.imc,
    circunferencia: r.m.circunferencia,
    perdaKg: r.perdaKg,
    perdaPct: r.perdaPct,
    medicamento: r.m.medicamento,
    dose: r.m.dose,
    consultasEndocrino: r.m.consultas_endocrino ?? 0,
    consultasNutri: r.m.consultas_nutri ?? 0,
    consultasPsico: r.m.consultas_psico ?? 0,
    consultasEdFisica: r.m.consultas_edfisica ?? 0,
    observacao: r.m.observacao,
  }));

  const exportSummary: ExportSummary = {
    mesLabel: mesSel ? formatMes(mesSel) : "",
    pesoIniMed: kpis.pesoIniMed,
    pesoMesMed: kpis.pesoMesMed,
    imcIniMed: kpis.imcIniMed,
    imcMesMed: kpis.imcMesMed,
    perdaMedPct: kpis.perdaMedPct,
    atingiram5: marcos.atingiram5,
    atingiram10: marcos.atingiram10,
    total: marcos.total,
  };

  // Export mode: when activeExport is set, sections collapse / show / hide
  // based on the user's selection so the snapshot contains exactly the chosen
  // bits.
  const exportMode = activeExport !== null;
  const isSelected = (id: string) => activeExport!.selected.has(id);
  // In export mode, force-open chosen sections and hide their chrome.
  const sectionExportProps = exportMode
    ? { forceOpen: true as const, hideChrome: true as const }
    : {};

  // Build each section's JSX once so we can render them in different layouts
  // (live: grid; export: flat single column).
  const kpisSection = (
    <CollapsibleSection
      id="kpis"
      title="Indicadores principais"
      subtitle={`Mês de ${mesSel ? formatMes(mesSel) : ""}`}
      icon={Activity}
      {...sectionExportProps}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard icon={Scale} label="Peso Inicial Médio" value={fmt(kpis.pesoIniMed)} unit="kg" />
        <KpiCard
          icon={Scale}
          label={`Peso ${formatMes(mesSel).split("/")[0]} Médio`}
          value={fmt(kpis.pesoMesMed)}
          unit="kg"
          accent="accent"
        />
        <KpiCard
          icon={TrendingUp}
          label="IMC Inicial Médio"
          value={fmt(kpis.imcIniMed)}
          unit="kg/m²"
        />
        <KpiCard
          icon={TrendingUp}
          label="IMC do Mês Médio"
          value={fmt(kpis.imcMesMed)}
          unit="kg/m²"
          accent="accent"
        />
        <KpiCard
          icon={ArrowDownToLine}
          label="Perda Média de Peso"
          value={`${fmt(Math.abs(kpis.perdaMedPct), 1)}%`}
          accent="accent"
        />
      </div>
      {iniciaramNoMes > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          {iniciaramNoMes} paciente(s) iniciaram neste mês e foram desconsiderados na análise de
          perda de peso.
        </p>
      )}
    </CollapsibleSection>
  );

  const marcosSection =
    marcos.total > 0 ? (
      <CollapsibleSection
        id="marcos"
        title="Marcos clínicos"
        subtitle="Eficácia da intervenção"
        icon={Target}
        {...sectionExportProps}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-4 flex items-center gap-4 shadow-sm">
            <div className="h-14 w-14 rounded-lg bg-success/15 text-success flex items-center justify-center">
              <Target className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Atingiram ≥ 5% de perda</p>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {marcos.atingiram5}
                <span className="text-sm font-semibold text-muted-foreground ml-1">
                  / {marcos.total}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {fmt(pct5, 0)}% do grupo · marco clínico de eficácia
              </p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4 shadow-sm">
            <div className="h-14 w-14 rounded-lg bg-success/15 text-success flex items-center justify-center">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Atingiram ≥ 10% de perda</p>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {marcos.atingiram10}
                <span className="text-sm font-semibold text-muted-foreground ml-1">
                  / {marcos.total}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {fmt(pct10, 0)}% do grupo · impacto metabólico
              </p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4 shadow-sm">
            <div className="h-14 w-14 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <TrendingDown className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Perda média acumulada</p>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {fmt(Math.abs(marcos.perdaMediaAcumPct), 1)}
                <span className="text-sm font-semibold text-muted-foreground ml-1">%</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                desde o início de cada paciente
              </p>
            </div>
          </Card>
        </div>
      </CollapsibleSection>
    ) : null;

  const tabelaSection = (
    <CollapsibleSection
      id="tabela"
      title="Tabela de participantes"
      subtitle={`${rows.length} pessoa(s)`}
      icon={TableIcon}
      contentClassName="p-0"
      {...sectionExportProps}
    >
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
            {rows.map((r, i) => (
              <tr key={r.p.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{displayName(r.p, i)}</td>
                <td className="px-4 py-2.5">{fmt(r.p.imc_inicial)}</td>
                <td className="px-4 py-2.5">{fmt(r.p.peso_inicial)}</td>
                <td className="px-4 py-2.5">{fmt(r.m.peso ?? 0)}</td>
                <td className="px-4 py-2.5">{fmt(r.m.imc ?? 0, 2)}</td>
                <td
                  className={`px-4 py-2.5 font-semibold ${r.perdaKg < 0 ? "text-success" : "text-destructive"}`}
                >
                  {fmt(r.perdaKg, 1)}
                </td>
                <td
                  className={`px-4 py-2.5 font-semibold ${r.perdaPct < 0 ? "text-success" : "text-destructive"}`}
                >
                  {fmt(r.perdaPct, 2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );

  const insightsSection = (
    <CollapsibleSection
      id="insights"
      title="Insights do período"
      icon={Lightbulb}
      {...sectionExportProps}
    >
      <ul className="space-y-2 text-sm">
        <li className="flex items-start gap-2">
          <span className="text-success mt-0.5">✓</span>
          {reduziramPeso === rows.length
            ? "Todos apresentaram redução de peso."
            : `${reduziramPeso} de ${rows.length} reduziram peso.`}
        </li>
        <li className="flex items-start gap-2">
          <span className="text-success mt-0.5">✓</span>
          {reduziramImc === rows.length
            ? "Todos reduziram seu IMC."
            : `${reduziramImc} de ${rows.length} reduziram IMC.`}
        </li>
        <li className="flex items-start gap-2">
          <span className="text-success mt-0.5">✓</span>Peso médio reduziu{" "}
          {fmt(kpis.pesoIniMed - kpis.pesoMesMed, 1)} kg.
        </li>
        <li className="flex items-start gap-2">
          <span className="text-success mt-0.5">✓</span>IMC médio reduziu{" "}
          {fmt(kpis.imcIniMed - kpis.imcMesMed, 1)} kg/m².
        </li>
      </ul>
    </CollapsibleSection>
  );

  const topSection = (
    <CollapsibleSection
      id="top"
      title="Top evolução do mês"
      subtitle="Maiores reduções percentuais"
      icon={Trophy}
      {...sectionExportProps}
    >
      <ol className="space-y-2 text-sm">
        {top3.map((r, i) => (
          <li key={r.p.id} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="font-bold text-primary w-5">{i + 1}º</span>
              {displayName(r.p, r.origIdx)}
            </span>
            <span className="font-semibold text-success">{fmt(r.perdaPct, 2)}%</span>
          </li>
        ))}
      </ol>
    </CollapsibleSection>
  );

  const resumoSection = (
    <CollapsibleSection id="resumo" title="Resumo do grupo" icon={Users} {...sectionExportProps}>
      <dl className="grid grid-cols-1 gap-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Peso inicial total</dt>
          <dd className="font-semibold">{fmt(kpis.pesoIniTotal)} kg</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Peso após 1 mês total</dt>
          <dd className="font-semibold">{fmt(kpis.pesoMesTotal)} kg</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Perda total de peso</dt>
          <dd className="font-semibold text-success">{fmt(kpis.perdaTotalKg)} kg</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Perda média</dt>
          <dd className="font-semibold text-success">{fmt(Math.abs(kpis.perdaMedPct), 1)}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">IMC inicial médio</dt>
          <dd className="font-semibold">{fmt(kpis.imcIniMed)} kg/m²</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">IMC mês médio</dt>
          <dd className="font-semibold">{fmt(kpis.imcMesMed)} kg/m²</dd>
        </div>
      </dl>
    </CollapsibleSection>
  );

  const comparacaoSection = (
    <CollapsibleSection
      id="comparacao"
      title="Peso e IMC: inicial vs mês"
      subtitle="Comparativo por pessoa"
      icon={BarChart3}
      {...sectionExportProps}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <ComparisonChart
          title="Peso Inicial vs Mês (kg)"
          data={chartData}
          keyA="pesoIni"
          keyB="pesoMes"
          labelA="Peso Inicial (kg)"
          labelB="Peso Mês (kg)"
          unit="Peso (kg)"
          height={420}
        />
        <ComparisonChart
          title="IMC Inicial vs Mês (kg/m²)"
          data={chartData}
          keyA="imcIni"
          keyB="imcMes"
          labelA="IMC Inicial"
          labelB="IMC Mês"
          unit="IMC (kg/m²)"
          height={420}
        />
      </div>
    </CollapsibleSection>
  );

  const evolucaoSection =
    evolucao.length > 1 ? (
      <CollapsibleSection
        id="evolucao"
        title="Evolução do grupo ao longo dos meses"
        subtitle="Médias por mês — apenas pacientes já iniciados"
        icon={LineChartIcon}
        {...sectionExportProps}
      >
        <EvolucaoChart data={evolucao} />
      </CollapsibleSection>
    ) : null;

  const circTable = (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-3">Pessoa</th>
              <th className="px-4 py-3">Circ. Inicial (cm)</th>
              <th className="px-4 py-3">Circ. Mês (cm)</th>
              <th className="px-4 py-3">Variação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const ci = r.p.circunferencia_inicial;
              const cm = r.m.circunferencia;
              const diff = ci != null && cm != null ? cm - ci : null;
              return (
                <tr key={r.p.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{displayName(r.p, i)}</td>
                  <td className="px-4 py-2.5">{ci != null ? fmt(ci, 1) : "—"}</td>
                  <td className="px-4 py-2.5">{cm != null ? fmt(cm, 1) : "Não mensurada"}</td>
                  <td
                    className={`px-4 py-2.5 font-semibold ${diff != null ? (diff < 0 ? "text-success" : "text-destructive") : ""}`}
                  >
                    {diff != null ? fmt(diff, 1) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const tratTable = (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-3">Pessoa</th>
              <th className="px-4 py-3">Medicamento</th>
              <th className="px-4 py-3">Dose</th>
              <th className="px-4 py-3">Observação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.p.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{displayName(r.p, i)}</td>
                <td className="px-4 py-2.5">{r.m.medicamento ?? "—"}</td>
                <td className="px-4 py-2.5">{r.m.dose ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.m.observacao ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const consTable = (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-3">Pessoa</th>
              <th className="px-4 py-3 text-center">Endócrino</th>
              <th className="px-4 py-3 text-center">Nutricionista</th>
              <th className="px-4 py-3 text-center">Psicologia</th>
              <th className="px-4 py-3 text-center">Ed. Física</th>
              <th className="px-4 py-3 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const total =
                (r.m.consultas_endocrino ?? 0) +
                (r.m.consultas_nutri ?? 0) +
                (r.m.consultas_psico ?? 0) +
                (r.m.consultas_edfisica ?? 0);
              return (
                <tr key={r.p.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{displayName(r.p, i)}</td>
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
  );

  // The extras block. Live view shows interactive Tabs; export view stacks all
  // three tables one after another so all of them land in the snapshot.
  const extrasLive = (
    <Tabs defaultValue="circ" className="w-full">
      <TabsList>
        <TabsTrigger value="circ">Circunferência abdominal</TabsTrigger>
        <TabsTrigger value="trat">Tratamento</TabsTrigger>
        <TabsTrigger value="cons">Acompanhamento multidisciplinar</TabsTrigger>
      </TabsList>
      <TabsContent value="circ">{circTable}</TabsContent>
      <TabsContent value="trat">{tratTable}</TabsContent>
      <TabsContent value="cons">{consTable}</TabsContent>
    </Tabs>
  );

  const extrasSection = exportMode ? (
    <CollapsibleSection
      id="extras"
      title="Circunferência / Tratamento / Acompanhamento"
      icon={Layers}
      {...sectionExportProps}
    >
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">Circunferência abdominal</h4>
          {circTable}
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2">Tratamento</h4>
          {tratTable}
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2">Acompanhamento multidisciplinar</h4>
          {consTable}
        </div>
      </div>
    </CollapsibleSection>
  ) : (
    extrasLive
  );

  const sectionMap: Record<string, React.ReactNode | null> = {
    kpis: kpisSection,
    marcos: marcosSection,
    tabela: tabelaSection,
    comparacao: comparacaoSection,
    evolucao: evolucaoSection,
    insights: insightsSection,
    top: topSection,
    resumo: resumoSection,
    extras: extrasSection,
  };

  return (
    <div className="min-h-screen bg-background">
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onSuccess={refetch} />
      <ExportSectionsDialog
        open={dialogFormat !== null}
        format={dialogFormat}
        onCancel={() => setDialogFormat(null)}
        onConfirm={(selected) => {
          if (!dialogFormat || selected.length === 0) return;
          const fmt = dialogFormat;
          setDialogFormat(null);
          setActiveExport({ format: fmt, selected: new Set(selected) });
        }}
      />

      <header className="border-b bg-card">
        <div className="mx-auto max-w-[1600px] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              H
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary tracking-tight">HEALTHBIT</h1>
              <p className="text-[10px] text-muted-foreground -mt-1">uma empresa RDsaúde</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden md:inline">{user?.email}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Acompanhamento de IMC e Peso</h2>
            <p className="text-sm text-muted-foreground">Visão geral inicial e por mês</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canToggleNames && (
              <div className="flex items-center gap-2 text-xs bg-card border rounded-md px-3 py-2">
                {mostrarNomes ? (
                  <Eye className="h-4 w-4 text-primary" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <span>Mostrar nomes</span>
                <Switch checked={mostrarNomes} onCheckedChange={setMostrarNomes} />
              </div>
            )}
            <Select value={mesSel ?? undefined} onValueChange={setMesSel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m} value={m}>
                    {formatMes(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {coortesDisponiveis.length > 1 && (
              <Select value={coorte} onValueChange={setCoorte}>
                <SelectTrigger className="w-[210px]">
                  <SelectValue placeholder="Coorte de início" />
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
            <ExportMenu
              rows={exportRows}
              summary={exportSummary}
              busy={activeExport ? activeExport.format : null}
              onRequestPdf={() => setDialogFormat("pdf")}
              onRequestPng={() => setDialogFormat("png")}
            />
            <Button onClick={() => setUploadOpen(true)} className="gap-2">
              <UploadCloud className="h-4 w-4" />
              Importar planilha
            </Button>
          </div>
        </div>

        <div id="dashboard-export" className="space-y-6">
          {exportMode && (
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                H
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary leading-none">HEALTHBIT</h1>
                <p className="text-xs text-muted-foreground mt-1">
                  uma empresa RDsaúde · Acompanhamento de IMC e Peso
                  {mesSel ? ` · ${formatMes(mesSel)}` : ""}
                </p>
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <Card className="p-12 text-center">
              <h3 className="text-lg font-semibold">Nenhum dado para o mês selecionado</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Importe a planilha mensal para começar.
              </p>
              <Button className="mt-4" onClick={() => setUploadOpen(true)}>
                <UploadCloud className="h-4 w-4 mr-2" />
                Importar planilha
              </Button>
            </Card>
          ) : exportMode ? (
            // Flat single-column layout: only the user-selected sections, in
            // the canonical dashboard order.
            <div className="space-y-6">
              {EXPORT_SECTIONS.filter((s) => isSelected(s.id)).map((s) => (
                <div key={s.id}>{sectionMap[s.id]}</div>
              ))}
            </div>
          ) : (
            <>
              {kpisSection}
              {marcosSection}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-6 items-start">
                <div className="min-w-0">{tabelaSection}</div>
                <div className="space-y-6">
                  {insightsSection}
                  {topSection}
                  {resumoSection}
                </div>
              </div>
              {comparacaoSection}
              {evolucaoSection}
              {extrasSection}
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground border-t pt-4">
          ℹ️ Dados referentes apenas ao período selecionado.
        </p>
      </main>
    </div>
  );
}
