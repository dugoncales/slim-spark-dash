import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileText, Image as ImageIcon } from "lucide-react";

export type ExportSection = { id: string; label: string };

export const EXPORT_SECTIONS: ExportSection[] = [
  { id: "kpis", label: "Indicadores principais (KPIs)" },
  { id: "marcos", label: "Marcos clínicos" },
  { id: "tabela", label: "Tabela de participantes" },
  { id: "comparacao", label: "Gráficos de barras (Peso e IMC)" },
  { id: "evolucao", label: "Evolução do grupo" },
  { id: "insights", label: "Insights do período" },
  { id: "top", label: "Top evolução do mês" },
  { id: "resumo", label: "Resumo do grupo" },
  { id: "extras", label: "Circunferência / Tratamento / Acompanhamento" },
];

const STORAGE_KEY = "dashboard:export:sections";

function readStoredSelection(): Set<string> {
  if (typeof window === "undefined") return new Set(EXPORT_SECTIONS.map((s) => s.id));
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set(EXPORT_SECTIONS.map((s) => s.id));
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set(EXPORT_SECTIONS.map((s) => s.id));
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set(EXPORT_SECTIONS.map((s) => s.id));
  }
}

export function ExportSectionsDialog({
  open,
  format,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  format: "pdf" | "png" | null;
  onCancel: () => void;
  onConfirm: (selected: string[]) => void;
}) {
  const [selection, setSelection] = useState<Set<string>>(() => readStoredSelection());

  // Refresh selection from storage each time the dialog opens, so changes from
  // another tab/window are reflected.
  useEffect(() => {
    if (open) setSelection(readStoredSelection());
  }, [open]);

  function toggle(id: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelection(new Set(EXPORT_SECTIONS.map((s) => s.id)));
  }
  function selectNone() {
    setSelection(new Set());
  }

  function confirm() {
    const arr = EXPORT_SECTIONS.map((s) => s.id).filter((id) => selection.has(id));
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {
      // ignore quota / disabled storage
    }
    onConfirm(arr);
  }

  const formatLabel = format === "pdf" ? "PDF" : format === "png" ? "PNG" : "";
  const FormatIcon = format === "pdf" ? FileText : ImageIcon;
  const noneSelected = selection.size === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FormatIcon className="h-5 w-5 text-primary" />
            Exportar {formatLabel}
          </DialogTitle>
          <DialogDescription>
            Selecione as seções que deseja incluir. A escolha é lembrada para a próxima exportação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between -mt-1 mb-1">
          <span className="text-xs text-muted-foreground">
            {selection.size} de {EXPORT_SECTIONS.length} selecionada(s)
          </span>
          <div className="flex gap-1 text-xs">
            <button type="button" onClick={selectAll} className="text-primary hover:underline px-1">
              Selecionar todas
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              onClick={selectNone}
              className="text-muted-foreground hover:underline px-1"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="max-h-[340px] overflow-y-auto rounded-md border bg-muted/20 p-2 space-y-1">
          {EXPORT_SECTIONS.map((s) => {
            const checked = selection.has(s.id);
            return (
              <Label
                key={s.id}
                htmlFor={`export-sec-${s.id}`}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-background cursor-pointer text-sm font-normal"
              >
                <Checkbox
                  id={`export-sec-${s.id}`}
                  checked={checked}
                  onCheckedChange={() => toggle(s.id)}
                />
                <span className={checked ? "text-foreground" : "text-muted-foreground"}>
                  {s.label}
                </span>
              </Label>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={noneSelected} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar selecionados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
