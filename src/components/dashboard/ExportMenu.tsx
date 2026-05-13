import { Download, FileText, Image as ImageIcon, FileSpreadsheet, FileType2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export type ExportRow = {
  nome: string;
  pesoInicial: number;
  pesoMes: number | null;
  imcInicial: number;
  imcMes: number | null;
  circunferencia: number | null;
  perdaKg: number;
  perdaPct: number;
  medicamento: string | null;
  dose: string | null;
  consultasEndocrino: number;
  consultasNutri: number;
  consultasPsico: number;
  consultasEdFisica: number;
  observacao: string | null;
};

export type ExportSummary = {
  mesLabel: string;
  pesoIniMed: number;
  pesoMesMed: number;
  imcIniMed: number;
  imcMesMed: number;
  perdaMedPct: number;
  atingiram5: number;
  atingiram10: number;
  total: number;
};

export const H2C_OPTIONS = {
  backgroundColor: "#ffffff",
  scale: 2,
  useCORS: true,
  logging: false,
} as const;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function safeMonthSlug(label: string) {
  return label.replace(/\//g, "-").replace(/[^\w-]/g, "");
}

export function ExportMenu({
  rows,
  summary,
  busy,
  onRequestPdf,
  onRequestPng,
}: {
  rows: ExportRow[];
  summary: ExportSummary;
  busy: null | "pdf" | "png";
  onRequestPdf: () => void;
  onRequestPng: () => void;
}) {
  const monthSlug = safeMonthSlug(summary.mesLabel);

  function exportCsv() {
    const headers = [
      "Nome",
      "Peso Inicial",
      "Peso Mês",
      "IMC Inicial",
      "IMC Mês",
      "Circunferência",
      "Perda (kg)",
      "Perda (%)",
      "Medicamento",
      "Dose",
      "Consultas Endócrino",
      "Consultas Nutri",
      "Consultas Psico",
      "Consultas Ed.Física",
      "Observação",
    ];
    const lines = rows.map((r) => [
      r.nome,
      r.pesoInicial,
      r.pesoMes ?? "",
      r.imcInicial,
      r.imcMes ?? "",
      r.circunferencia ?? "",
      r.perdaKg.toFixed(2),
      r.perdaPct.toFixed(2),
      r.medicamento ?? "",
      r.dose ?? "",
      r.consultasEndocrino,
      r.consultasNutri,
      r.consultasPsico,
      r.consultasEdFisica,
      r.observacao ?? "",
    ]);
    const csv = [headers, ...lines].map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `participantes-${monthSlug}.csv`);
    toast.success("CSV exportado.");
  }

  async function exportXlsx() {
    try {
      const XLSX = await import("xlsx");
      const fmt1 = (n: number) => Number(n.toFixed(1));
      const pct5 = summary.total ? (summary.atingiram5 / summary.total) * 100 : 0;
      const pct10 = summary.total ? (summary.atingiram10 / summary.total) * 100 : 0;
      const resumoAoa: (string | number)[][] = [
        ["Métrica", "Valor"],
        ["Mês de referência", summary.mesLabel],
        ["Peso Inicial Médio (kg)", fmt1(summary.pesoIniMed)],
        ["Peso do Mês Médio (kg)", fmt1(summary.pesoMesMed)],
        ["IMC Inicial Médio", fmt1(summary.imcIniMed)],
        ["IMC do Mês Médio", fmt1(summary.imcMesMed)],
        ["Perda Média (%)", fmt1(Math.abs(summary.perdaMedPct))],
        ["Atingiram ≥ 5% de perda", `${summary.atingiram5}/${summary.total} (${pct5.toFixed(0)}%)`],
        [
          "Atingiram ≥ 10% de perda",
          `${summary.atingiram10}/${summary.total} (${pct10.toFixed(0)}%)`,
        ],
      ];
      const wsResumo = XLSX.utils.aoa_to_sheet(resumoAoa);
      wsResumo["!cols"] = [{ wch: 32 }, { wch: 28 }];

      const partRows = rows.map((r) => ({
        Nome: r.nome,
        "Peso Inicial (kg)": r.pesoInicial,
        "Peso Mês (kg)": r.pesoMes ?? "",
        "IMC Inicial": r.imcInicial,
        "IMC Mês": r.imcMes ?? "",
        "Circunferência (cm)": r.circunferencia ?? "",
        "Perda (kg)": Number(r.perdaKg.toFixed(2)),
        "Perda (%)": Number(r.perdaPct.toFixed(2)),
        Medicamento: r.medicamento ?? "",
        Dose: r.dose ?? "",
        "Consultas Endócrino": r.consultasEndocrino,
        "Consultas Nutri": r.consultasNutri,
        "Consultas Psico": r.consultasPsico,
        "Consultas Ed.Física": r.consultasEdFisica,
        Observação: r.observacao ?? "",
      }));
      const wsPart = XLSX.utils.json_to_sheet(partRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");
      XLSX.utils.book_append_sheet(wb, wsPart, "Participantes");
      XLSX.writeFile(wb, `dashboard-${monthSlug}.xlsx`);
      toast.success("Excel exportado.");
    } catch (err) {
      toast.error("Erro ao exportar Excel: " + (err as Error).message);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={!!busy}>
          <Download className="h-4 w-4" />
          {busy === "pdf" ? "Gerando PDF..." : busy === "png" ? "Gerando PNG..." : "Exportar"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Exportar dashboard</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onRequestPdf()}>
          <FileType2 className="h-4 w-4 mr-2 text-destructive" />
          <div className="flex flex-col">
            <span>PDF completo</span>
            <span className="text-[10px] text-muted-foreground">Escolha as seções</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onRequestPng()}>
          <ImageIcon className="h-4 w-4 mr-2 text-primary" />
          <div className="flex flex-col">
            <span>PNG (imagem)</span>
            <span className="text-[10px] text-muted-foreground">Escolha as seções</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Dados do mês</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => exportCsv()}>
          <FileText className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>CSV de participantes</span>
            <span className="text-[10px] text-muted-foreground">Todas as colunas</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportXlsx()}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-success" />
          <div className="flex flex-col">
            <span>Excel (Resumo + Participantes)</span>
            <span className="text-[10px] text-muted-foreground">Duas abas</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
