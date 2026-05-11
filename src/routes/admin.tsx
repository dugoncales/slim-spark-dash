import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { fetchAll, formatMes, type Medicao, type Participante } from "@/lib/dashboard-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: Admin,
});

function Admin() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !session) navigate({ to: "/login" }); }, [loading, session, navigate]);

  const { data, refetch, isLoading } = useQuery({ queryKey: ["admin"], queryFn: fetchAll, enabled: !!session });

  const meses = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.medicoes.map(m => m.mes_referencia))).sort();
  }, [data]);

  const [mesSel, setMesSel] = useState<string>("");
  const [novoMes, setNovoMes] = useState(new Date().toISOString().slice(0, 7));
  const [edits, setEdits] = useState<Record<string, Partial<Medicao>>>({});
  const [novoPart, setNovoPart] = useState({ nome: "", peso_inicial: "", imc_inicial: "", circunferencia_inicial: "" });

  useEffect(() => {
    if (meses.length && !mesSel) setMesSel(meses[meses.length - 1]);
  }, [meses, mesSel]);

  if (loading || isLoading || !session) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  const participantes = data?.participantes ?? [];
  const medicoesDoMes = (data?.medicoes ?? []).filter(m => m.mes_referencia === mesSel);
  const byPart = new Map(medicoesDoMes.map(m => [m.participante_id, m]));

  function getVal(p: Participante, field: keyof Medicao): string {
    const edit = edits[p.id];
    if (edit && field in edit) return String((edit as Record<string, unknown>)[field] ?? "");
    const m = byPart.get(p.id);
    const v = m ? (m as Record<string, unknown>)[field] : null;
    return v == null ? "" : String(v);
  }

  function setVal(pid: string, field: keyof Medicao, v: string) {
    setEdits(e => ({ ...e, [pid]: { ...e[pid], [field]: v === "" ? null : v } }));
  }

  async function criarMes() {
    if (!novoMes) return;
    const iso = `${novoMes}-01`;
    if (meses.includes(iso)) { setMesSel(iso); return; }
    // Cria linhas vazias para todos os participantes ativos
    if (participantes.length === 0) {
      toast.info("Cadastre participantes primeiro.");
      setMesSel(iso);
      return;
    }
    const rows = participantes.map(p => ({ participante_id: p.id, mes_referencia: iso }));
    const { error } = await supabase.from("medicoes").upsert(rows, { onConflict: "participante_id,mes_referencia" });
    if (error) { toast.error(error.message); return; }
    toast.success(`Mês ${formatMes(iso)} criado.`);
    setMesSel(iso);
    refetch();
  }

  async function salvar() {
    if (!mesSel) return;
    const toSave = Object.entries(edits);
    if (toSave.length === 0) { toast.info("Nada para salvar."); return; }
    const numericFields = new Set(["peso", "imc", "circunferencia", "consultas_endocrino", "consultas_nutri", "consultas_psico", "consultas_edfisica"]);
    for (const [pid, fields] of toSave) {
      const payload: Record<string, unknown> = { participante_id: pid, mes_referencia: mesSel };
      for (const [k, v] of Object.entries(fields)) {
        payload[k] = v == null ? null : numericFields.has(k) ? Number(v) : v;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("medicoes").upsert(payload as any, { onConflict: "participante_id,mes_referencia" });
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Alterações salvas.");
    setEdits({});
    refetch();
  }

  async function addParticipante() {
    const peso = parseFloat(novoPart.peso_inicial);
    const imc = parseFloat(novoPart.imc_inicial);
    if (!novoPart.nome || isNaN(peso) || isNaN(imc)) { toast.error("Nome, peso e IMC iniciais são obrigatórios."); return; }
    const max = participantes.reduce((a, p) => Math.max(a, p.numero), 0);
    const { error } = await supabase.from("participantes").insert({
      numero: max + 1,
      nome: novoPart.nome,
      peso_inicial: peso,
      imc_inicial: imc,
      circunferencia_inicial: novoPart.circunferencia_inicial ? parseFloat(novoPart.circunferencia_inicial) : null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Participante adicionado.");
    setNovoPart({ nome: "", peso_inicial: "", imc_inicial: "", circunferencia_inicial: "" });
    refetch();
  }

  async function removerParticipante(id: string) {
    if (!confirm("Remover este participante e todas as suas medições?")) return;
    const { error } = await supabase.from("participantes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removido.");
    refetch();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Dashboard</Button></Link>
            <h1 className="text-lg font-semibold">Administração</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
        {/* Add participant */}
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Adicionar participante</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div><Label>Nome</Label><Input value={novoPart.nome} onChange={e => setNovoPart({ ...novoPart, nome: e.target.value })} /></div>
            <div><Label>Peso inicial (kg)</Label><Input type="number" step="0.1" value={novoPart.peso_inicial} onChange={e => setNovoPart({ ...novoPart, peso_inicial: e.target.value })} /></div>
            <div><Label>IMC inicial</Label><Input type="number" step="0.01" value={novoPart.imc_inicial} onChange={e => setNovoPart({ ...novoPart, imc_inicial: e.target.value })} /></div>
            <div><Label>Circunferência (cm)</Label><Input type="number" step="0.1" value={novoPart.circunferencia_inicial} onChange={e => setNovoPart({ ...novoPart, circunferencia_inicial: e.target.value })} /></div>
            <Button onClick={addParticipante}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </div>
        </Card>

        {/* Month management */}
        <Card className="p-5">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <Label>Mês para editar</Label>
              <Select value={mesSel || undefined} onValueChange={setMesSel}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{meses.map(m => <SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="border-l h-12 mx-2 hidden md:block" />
            <div><Label>Novo mês</Label><Input type="month" value={novoMes} onChange={e => setNovoMes(e.target.value)} /></div>
            <Button variant="outline" onClick={criarMes}><Plus className="h-4 w-4 mr-1" />Criar / abrir mês</Button>
            <div className="flex-1" />
            <Button onClick={salvar} disabled={Object.keys(edits).length === 0}><Save className="h-4 w-4 mr-1" />Salvar alterações ({Object.keys(edits).length})</Button>
          </div>
        </Card>

        {/* Edit grid */}
        {mesSel && participantes.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-2 py-2">Nº</th>
                  <th className="px-2 py-2">Nome</th>
                  <th className="px-2 py-2">Peso</th>
                  <th className="px-2 py-2">IMC</th>
                  <th className="px-2 py-2">Circ.</th>
                  <th className="px-2 py-2">Medicam.</th>
                  <th className="px-2 py-2">Dose</th>
                  <th className="px-2 py-2">Endo</th>
                  <th className="px-2 py-2">Nutri</th>
                  <th className="px-2 py-2">Psico</th>
                  <th className="px-2 py-2">Ed.F</th>
                  <th className="px-2 py-2">Obs</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {participantes.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="px-2 py-1">{p.numero}</td>
                    <td className="px-2 py-1 font-medium whitespace-nowrap">{p.nome}</td>
                    <td className="px-2 py-1"><Input className="h-8 w-20" type="number" step="0.1" value={getVal(p, "peso")} onChange={e => setVal(p.id, "peso", e.target.value)} /></td>
                    <td className="px-2 py-1"><Input className="h-8 w-20" type="number" step="0.01" value={getVal(p, "imc")} onChange={e => setVal(p.id, "imc", e.target.value)} /></td>
                    <td className="px-2 py-1"><Input className="h-8 w-20" type="number" step="0.1" value={getVal(p, "circunferencia")} onChange={e => setVal(p.id, "circunferencia", e.target.value)} /></td>
                    <td className="px-2 py-1"><Input className="h-8 w-28" value={getVal(p, "medicamento")} onChange={e => setVal(p.id, "medicamento", e.target.value)} /></td>
                    <td className="px-2 py-1"><Input className="h-8 w-20" value={getVal(p, "dose")} onChange={e => setVal(p.id, "dose", e.target.value)} /></td>
                    <td className="px-2 py-1"><Input className="h-8 w-14" type="number" value={getVal(p, "consultas_endocrino")} onChange={e => setVal(p.id, "consultas_endocrino", e.target.value)} /></td>
                    <td className="px-2 py-1"><Input className="h-8 w-14" type="number" value={getVal(p, "consultas_nutri")} onChange={e => setVal(p.id, "consultas_nutri", e.target.value)} /></td>
                    <td className="px-2 py-1"><Input className="h-8 w-14" type="number" value={getVal(p, "consultas_psico")} onChange={e => setVal(p.id, "consultas_psico", e.target.value)} /></td>
                    <td className="px-2 py-1"><Input className="h-8 w-14" type="number" value={getVal(p, "consultas_edfisica")} onChange={e => setVal(p.id, "consultas_edfisica", e.target.value)} /></td>
                    <td className="px-2 py-1"><Input className="h-8 w-48" value={getVal(p, "observacao")} onChange={e => setVal(p.id, "observacao", e.target.value)} /></td>
                    <td className="px-2 py-1"><Button variant="ghost" size="sm" onClick={() => removerParticipante(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </main>
    </div>
  );
}
