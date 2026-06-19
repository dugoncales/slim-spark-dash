import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRoles } from "@/hooks/use-roles";

type ParsedRow = {
  numero: number;
  nome: string;
  imc_inicial: number;
  peso_inicial: number;
  peso_mes: number;
  imc_mes: number;
  circunferencia_inicial: number | null;
  circunferencia_mes: number | null;
  medicamento: string | null;
  dose: string | null;
  consultas_endocrino: number;
  consultas_nutri: number;
  consultas_psico: number;
  consultas_edfisica: number;
  observacao: string | null;
  grupo: string | null;
};

const CORES_AUTO = ["#3b82f6", "#f97316", "#10b981", "#a855f7", "#ef4444", "#14b8a6", "#eab308", "#ec4899"];

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || /^não\s*mensurada$/i.test(s)) return null;
  return s;
}

export function UploadDialog({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { isAdmin } = useRoles();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      const parsed: ParsedRow[] = raw
        .filter(r => num(r["Numero"]) !== null && str(r["Nome"]))
        .map(r => ({
          numero: num(r["Numero"])!,
          nome: str(r["Nome"])!,
          imc_inicial: num(r["IMC inicial"]) ?? 0,
          peso_inicial: num(r["Peso inicial"]) ?? 0,
          peso_mes: num(r["Peso Mês 1"]) ?? num(r["Peso Mes 1"]) ?? 0,
          imc_mes: num(r["IMC Mês 1"]) ?? num(r["IMC Mes 1"]) ?? 0,
          circunferencia_inicial: num(r["Circunferencia Abdominal inicial"]),
          circunferencia_mes: num(r["Circunferencia abdominal mês 1"]) ?? num(r["Circunferencia abdominal mes 1"]),
          medicamento: str(r["Medicamneto"] ?? r["Medicamento"]),
          dose: str(r["Dose"]),
          consultas_endocrino: num(r["Consultas Endocrino"]) ?? 0,
          consultas_nutri: num(r["Consultas Nutri"]) ?? 0,
          consultas_psico: num(r["Consultas Psicologia"]) ?? 0,
          consultas_edfisica: num(r["Consultas Educadora Física"]) ?? num(r["Consultas Educadora Fisica"]) ?? 0,
          observacao: str(r["Observação"] ?? r["Observacao"]),
          grupo: str(r["Grupo"] ?? r["grupo"]),
        }));
      if (parsed.length === 0) {
        toast.error("Nenhuma linha válida encontrada. Verifique o formato da planilha.");
        return;
      }
      setRows(parsed);
      toast.success(`${parsed.length} pessoas lidas da planilha.`);
    } catch (err) {
      toast.error("Erro ao ler planilha: " + (err as Error).message);
    }
  }

  async function importar() {
    if (!rows) return;
    setBusy(true);
    try {
      const mesIso = `${mes}-01`;

      // 1) Resolve groups: read existing groups; auto-create missing (admin only).
      const { data: gruposExistentes } = await supabase.from("grupos").select("id, nome");
      const grupoIdByNome = new Map<string, string>();
      (gruposExistentes ?? []).forEach((g) => grupoIdByNome.set(g.nome.toLowerCase(), g.id));

      let gruposCriados = 0;
      let participantesComGrupo = 0;
      const nomesUnicos = Array.from(
        new Set(rows.map((r) => r.grupo).filter((g): g is string => !!g).map((g) => g.toLowerCase())),
      );
      if (isAdmin) {
        let corIdx = grupoIdByNome.size;
        for (const lower of nomesUnicos) {
          if (grupoIdByNome.has(lower)) continue;
          const original = rows.find((r) => r.grupo?.toLowerCase() === lower)?.grupo ?? lower;
          const cor = CORES_AUTO[corIdx % CORES_AUTO.length];
          corIdx++;
          const { data: novo, error: gerr } = await supabase
            .from("grupos")
            .insert({ nome: original, cor })
            .select("id")
            .single();
          if (!gerr && novo) {
            grupoIdByNome.set(lower, novo.id);
            gruposCriados++;
          }
        }
      }

      // 2) Upsert participantes + medições.
      const { data: existentes } = await supabase.from("participantes").select("id, numero");
      const byNum = new Map((existentes ?? []).map(p => [p.numero, p.id]));

      for (const r of rows) {
        const grupoId = r.grupo ? (grupoIdByNome.get(r.grupo.toLowerCase()) ?? null) : null;
        if (grupoId) participantesComGrupo++;

        let participanteId = byNum.get(r.numero);
        if (!participanteId) {
          const { data, error } = await supabase.from("participantes").insert({
            numero: r.numero,
            nome: r.nome,
            peso_inicial: r.peso_inicial,
            imc_inicial: r.imc_inicial,
            circunferencia_inicial: r.circunferencia_inicial,
            grupo_id: grupoId,
          }).select("id").single();
          if (error) throw error;
          participanteId = data.id;
        } else {
          // Only overwrite grupo_id when the sheet specifies one (avoid wiping manual assignments).
          await supabase.from("participantes").update({
            nome: r.nome,
            peso_inicial: r.peso_inicial,
            imc_inicial: r.imc_inicial,
            circunferencia_inicial: r.circunferencia_inicial,
            ...(grupoId ? { grupo_id: grupoId } : {}),
          }).eq("id", participanteId);
        }
        let imcMes = r.imc_mes;
        if ((!imcMes || imcMes === 0) && r.peso_mes) {
          const { data: partRow } = await supabase.from("participantes").select("altura").eq("id", participanteId).single();
          const altura = partRow?.altura ? Number(partRow.altura) : null;
          if (altura && altura > 0) imcMes = Math.round((r.peso_mes / (altura * altura)) * 100) / 100;
        }
        await supabase.from("medicoes").upsert({
          participante_id: participanteId,
          mes_referencia: mesIso,
          peso: r.peso_mes,
          imc: imcMes,
          circunferencia: r.circunferencia_mes,
          medicamento: r.medicamento,
          dose: r.dose,
          consultas_endocrino: r.consultas_endocrino,
          consultas_nutri: r.consultas_nutri,
          consultas_psico: r.consultas_psico,
          consultas_edfisica: r.consultas_edfisica,
          observacao: r.observacao,
        }, { onConflict: "participante_id,mes_referencia" });
      }

      const partes = [`${rows.length} registros importados.`];
      if (participantesComGrupo) partes.push(`${participantesComGrupo} vinculados a grupos.`);
      if (gruposCriados) partes.push(`${gruposCriados} grupo(s) criados.`);
      toast.success(partes.join(" "));
      onSuccess();
      onOpenChange(false);
      setRows(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error("Erro ao importar: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar planilha mensal</DialogTitle>
          <DialogDescription>
            Faça upload do arquivo Excel no mesmo formato do modelo. Pessoas novas são adicionadas; já existentes têm a medição do mês atualizada.
            {" "}Coluna opcional <code className="px-1 rounded bg-muted text-xs">Grupo</code> (nome do grupo) — se o grupo não existir e você for admin, ele é criado automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mes">Mês de referência</Label>
              <Input id="mes" type="month" value={mes} onChange={e => setMes(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="file">Arquivo .xlsx</Label>
              <Input id="file" ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFile} />
            </div>
          </div>
          {rows && (
            <div className="max-h-64 overflow-auto rounded-md border bg-muted/30 text-xs">
              <table className="w-full">
                <thead className="bg-muted sticky top-0">
                  <tr><th className="p-2 text-left">Nº</th><th className="p-2 text-left">Nome</th><th className="p-2 text-left">Grupo</th><th className="p-2 text-right">Peso ini</th><th className="p-2 text-right">Peso mês</th><th className="p-2 text-right">IMC mês</th></tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.numero} className="border-t"><td className="p-2">{r.numero}</td><td className="p-2">{r.nome}</td><td className="p-2 text-muted-foreground">{r.grupo ?? "—"}</td><td className="p-2 text-right">{r.peso_inicial}</td><td className="p-2 text-right">{r.peso_mes}</td><td className="p-2 text-right">{r.imc_mes}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={importar} disabled={!rows || busy}>{busy ? "Importando..." : `Importar ${rows?.length ?? 0} registros`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
