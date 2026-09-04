import { useEffect, useState } from "react";
import { Download, FileType2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { H2C_OPTIONS } from "@/components/dashboard/ExportMenu";

export type RelatorioFormat = "pdf" | "png";

export const RELATORIO_SECTIONS = [
  { key: "resumo", label: "Resumo (peso, IMC, perda)" },
  { key: "risco", label: "Risco cardiovascular" },
  { key: "exames", label: "Exames laboratoriais" },
  { key: "graficos", label: "Gráficos de evolução" },
  { key: "consultas", label: "Acompanhamento multidisciplinar" },
  { key: "historico", label: "Histórico mês a mês" },
] as const;

export type RelatorioSectionKey = (typeof RELATORIO_SECTIONS)[number]["key"];

export const ALL_RELATORIO_SECTIONS = new Set<string>(RELATORIO_SECTIONS.map((s) => s.key));

export type RelatorioPending = { format: RelatorioFormat; selected: Set<string> };

export function RelatorioExport({
  targetId,
  filenameSlug,
  pending,
  onConfirm,
  onDone,
}: {
  targetId: string;
  filenameSlug: string;
  pending: RelatorioPending | null;
  onConfirm: (p: RelatorioPending) => void;
  onDone: () => void;
}) {
  const [dialogFormat, setDialogFormat] = useState<RelatorioFormat | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_RELATORIO_SECTIONS));

  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    const run = async () => {
      // Aguarda o React aplicar o modo de exportação e o Recharts pintar (animação padrão ~1,5s).
      await new Promise((r) => setTimeout(r, 1700));
      if (cancelled) return;
      const el = document.getElementById(targetId);
      if (!el) {
        onDone();
        return;
      }
      try {
        const { default: html2canvas } = await import("html2canvas-pro");
        const canvas = await html2canvas(el, H2C_OPTIONS as Parameters<typeof html2canvas>[1]);
        if (cancelled) return;
        if (pending.format === "pdf") {
          const { jsPDF } = await import("jspdf");
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
          const pageW = pdf.internal.pageSize.getWidth();
          const pageH = pdf.internal.pageSize.getHeight();
          const imgH = (canvas.height * pageW) / canvas.width;
          let position = 0;
          let heightLeft = imgH;
          pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
          heightLeft -= pageH;
          while (heightLeft > 0) {
            position -= pageH;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
            heightLeft -= pageH;
          }
          pdf.save(`relatorio-${filenameSlug}.pdf`);
          toast.success("Relatório em PDF gerado.");
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
              a.download = `relatorio-${filenameSlug}.png`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              toast.success("Relatório em imagem gerado.");
              resolve();
            }, "image/png");
          });
        }
      } catch (err) {
        if (!cancelled) toast.error("Erro ao exportar: " + (err as Error).message);
      } finally {
        if (!cancelled) onDone();
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, targetId, filenameSlug]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2" disabled={!!pending}>
            <Download className="h-4 w-4" />
            {pending ? "Gerando..." : "Exportar relatório"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Relatório do paciente</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialogFormat("pdf")}>
            <FileType2 className="h-4 w-4 mr-2 text-destructive" />
            <div className="flex flex-col">
              <span>PDF para encaminhar</span>
              <span className="text-[10px] text-muted-foreground">Escolha as seções</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialogFormat("png")}>
            <ImageIcon className="h-4 w-4 mr-2 text-primary" />
            <div className="flex flex-col">
              <span>Imagem (PNG)</span>
              <span className="text-[10px] text-muted-foreground">Escolha as seções</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!dialogFormat} onOpenChange={(o) => !o && setDialogFormat(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seções do relatório</DialogTitle>
            <DialogDescription>
              Escolha o que deve aparecer no arquivo enviado ao paciente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {RELATORIO_SECTIONS.map((s) => (
              <label key={s.key} className="flex items-center gap-3 text-sm cursor-pointer">
                <Checkbox checked={selected.has(s.key)} onCheckedChange={() => toggle(s.key)} />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set(ALL_RELATORIO_SECTIONS))}
            >
              Marcar todas
            </Button>
            <Button
              disabled={selected.size === 0}
              onClick={() => {
                const format = dialogFormat!;
                setDialogFormat(null);
                onConfirm({ format, selected: new Set(selected) });
              }}
            >
              Gerar {dialogFormat === "pdf" ? "PDF" : "imagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
