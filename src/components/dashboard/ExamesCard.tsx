import { useState } from "react";
import { FlaskConical, TrendingDown, TrendingUp, Minus, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Sexo } from "@/lib/dashboard-data";
import {
  CATEGORIA_LABEL,
  EXAMES_META,
  type ExameCategoria,
  type ExameResultado,
  type ExamesParticipante,
  type ExameMeta,
} from "@/lib/exames";

const numFmt = (v: number | null, d = 1) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

function Sparkline({ serie }: { serie: Array<{ mes: string; valor: number }> }) {
  if (serie.length < 2) return null;
  const vals = serie.map((s) => s.valor);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = serie
    .map((s, i) => {
      const x = (i / (serie.length - 1)) * w;
      const y = h - ((s.valor - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="text-primary/70 shrink-0" aria-hidden="true">
      <polyline fill="none" stroke="currentColor" strokeWidth={1.5} points={points} />
    </svg>
  );
}

function ExameLinha({
  meta,
  resultado,
}: {
  meta: ExameMeta;
  resultado: ExameResultado;
}) {
  const { inicial, atual, delta, deltaPct, statusAtual, melhora, serie } = resultado;

  const melhoraColor =
    melhora === "melhorou"
      ? "text-success"
      : melhora === "piorou"
        ? "text-destructive"
        : "text-muted-foreground";
  const MelhoraIcon =
    melhora === "melhorou" ? TrendingDown : melhora === "piorou" ? TrendingUp : Minus;

  const deltaLabel = (() => {
    if (delta == null) return null;
    const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
    const abs = Math.abs(delta);
    if (meta.key === "hba1c") return `${sign}${abs.toFixed(1)} pp`;
    if (meta.key === "colesterol_total" || meta.key === "ldl" || meta.key === "triglicerideos") {
      if (deltaPct != null) {
        return `${sign}${Math.abs(deltaPct * 100).toFixed(1)}%`;
      }
    }
    return `${sign}${numFmt(abs, meta.step < 1 ? 1 : 0)} ${meta.unidade}`;
  })();

  const statusBadge = statusAtual
    ? statusAtual === "alterado"
      ? (
        <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive text-[10px] px-1.5 py-0">
          Alterado
        </Badge>
      )
      : (
        <Badge variant="outline" className="border-success/40 bg-success/10 text-success text-[10px] px-1.5 py-0">
          Normal
        </Badge>
      )
    : null;

  const melhoraBadge = melhora ? (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] px-1.5 py-0 border-0 gap-1",
        melhora === "melhorou" && "bg-success/15 text-success",
        melhora === "piorou" && "bg-destructive/15 text-destructive",
        melhora === "estavel" && "bg-muted text-muted-foreground",
      )}
    >
      <MelhoraIcon className="h-2.5 w-2.5" />
      {melhora === "melhorou" ? "Melhorou" : melhora === "piorou" ? "Piorou" : "Estável"}
    </Badge>
  ) : null;

  return (
    <div className="rounded-md border bg-card p-3 flex flex-col gap-1.5" title={meta.descricaoMelhora}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground truncate">{meta.label}</span>
        {statusBadge}
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-xl font-bold leading-none">{numFmt(atual, meta.step < 1 ? 1 : 0)}</span>
        <span className="text-[11px] text-muted-foreground">{meta.unidade}</span>
        {inicial != null && atual != null && (
          <span className="text-[11px] text-muted-foreground">
            de {numFmt(inicial, meta.step < 1 ? 1 : 0)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <div className={cn("flex items-center gap-1 text-[11px] font-medium", melhoraColor)}>
          {deltaLabel && (
            <>
              <MelhoraIcon className="h-3 w-3" />
              <span>{deltaLabel}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {melhoraBadge}
          <Sparkline serie={serie} />
        </div>
      </div>
    </div>
  );
}

export function ExamesCard({
  exames,
  sexo,
  defaultOpen = false,
}: {
  exames: ExamesParticipante;
  sexo: Sexo | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const categorias: ExameCategoria[] = ["glicemico", "lipidico", "pressao"];

  const melhoraramCount = categorias.reduce((acc, c) => {
    const melhorouAlgum = EXAMES_META.filter((m) => m.categoria === c).some(
      (m) => exames.porExame[m.key].melhora === "melhorou",
    );
    return acc + (melhorouAlgum ? 1 : 0);
  }, 0);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-3 border-b hover:bg-muted/40 transition-colors text-left"
      >
        <FlaskConical className="h-4 w-4 text-primary shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-semibold text-sm">Exames laboratoriais</span>
          <span className="text-[11px] text-muted-foreground truncate">
            {exames.temAlgum
              ? `Indicadores secundários · ${melhoraramCount} categoria(s) com melhora`
              : "Nenhum exame registrado ainda"}
            {sexo == null && " · sexo não informado (afeta faixa do HDL)"}
          </span>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open ? "" : "-rotate-90")}
        />
      </button>

      {open && (
        <div className="p-5 space-y-5">
          {!exames.temAlgum && (
            <p className="text-sm text-muted-foreground">
              Registre glicemia, HbA1c, perfil lipídico ou pressão arterial no acompanhamento mensal
              (aba Gestão → Acompanhamento → botão <strong>Exames</strong>) para acompanhar a evolução desses
              indicadores.
            </p>
          )}
          {categorias.map((cat) => {
            const examesDaCat = EXAMES_META.filter((m) => m.categoria === cat);
            const temNaCat = examesDaCat.some((m) => exames.porExame[m.key].serie.length > 0);
            if (!temNaCat) return null;
            return (
              <div key={cat}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {CATEGORIA_LABEL[cat]}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {examesDaCat.map((meta) => {
                    const r = exames.porExame[meta.key];
                    if (r.serie.length === 0) return null;
                    return <ExameLinha key={meta.key} meta={meta} resultado={r} />;
                  })}
                </div>
              </div>
            );
          })}
          {exames.temAlgum && (
            <p className="text-[10px] text-muted-foreground leading-relaxed border-t pt-3">
              Critério de melhora (combinado): saída de faixa alterada <strong>OU</strong> redução clinicamente
              relevante — Glicemia −10 mg/dL · HbA1c −0,5 pp · Colesterol/LDL −10% · Triglicerídeos −15% ·
              HDL +5 mg/dL · PA −5 mmHg. Faixas: Glicemia ≥100 · HbA1c ≥5,7% · CT ≥200 · LDL ≥130 · HDL &lt;40 (H) / &lt;50 (M) · TG ≥150 · PAS ≥130 · PAD ≥85.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
