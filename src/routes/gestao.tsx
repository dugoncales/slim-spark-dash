import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { fetchAll, formatMes, calcImc, type Medicao, type Participante } from "@/lib/dashboard-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/gestao")({
  component: Gestao,
});

function Gestao() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !session) navigate({ to: "/login" }); }, [loading, session, navigate]);

  const { data, refetch, isLoading } = useQuery({ queryKey: ["gestao"], queryFn: fetchAll, enabled: !!session });

  const meses = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.medicoes.map(m => m.mes_referencia))).sort();
  }, [data]);

  const [mesSel, setMesSel] = useState<string>("");
  const [novoMes, setNovoMes] = useState(new Date().toISOString().slice(0, 7));
  const [edits, setEdits] = useState<Record<string, Partial<Medicao>>>({});
  const [novoPart, setNovoPart] = useState({ nome: "", altura: "", peso_inicial: "", circunferencia_inicial: "" });

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
    setEdits(e => {
      const next: Partial<Medicao> = { ...e[pid], [field]: v === "" ? null : v };
      // Auto-calc IMC quando peso muda e altura existe
      if (field === "peso") {
        const part = participantes.find(p => p.id === pid);
        if (part?.altura && v !== "") {
          const imc = calcImc(parseFloat(v), part.altura);
          if (imc != null) next.imc = imc as unknown as Medicao["imc"];
        }
      }
      return { ...e, [pid]: next };
    });
  }

  async function setAlturaParticipante(pid: string, valor: string) {
    const altura = parseFloat(valor);
    if (isNaN(altura) || altura <= 0) { toast.error("Altura inválida"); return; }
    const { error } = await supabase.from("participantes").update({ altura }).eq("id", pid);
    if (error) { toast.error(error.message); return; }
    toast.success("Altura atualizada.");
    refetch();
  }

  async function criarMes() {
    if (!novoMes) return;
    const iso = `${novoMes}-01`;
    if (meses.includes(iso)) { setMesSel(iso); return; }
    if (participantes.length === 0) {
      toast.info("Cadastre participantes primeiro.");
      setMesSel(iso);
      return;
    }
    // Encontra o mês anterior mais recente para pré-preencher
    const mesAnterior = meses.filter(m => m < iso).slice(-1)[0];
    const medsAnt = mesAnterior
      ? new Map((data?.medicoes ?? []).filter(m => m.mes_referencia === mesAnterior).map(m => [m.participante_id, m]))
      : new Map<string, Medicao>();

    const rows = participantes.map(p => {
      const ant = medsAnt.get(p.id);
      if (ant) {
        return {
          participante_id: p.id,
          mes_referencia: iso,
          peso: ant.peso,
          imc: ant.imc,
          circunferencia: ant.circunferencia,
          medicamento: ant.medicamento,
          dose: ant.dose,
          consultas_endocrino: ant.consultas_endocrino ?? 0,
          consultas_nutri: ant.consultas_nutri ?? 0,
          consultas_psico: ant.consultas_psico ?? 0,
          consultas_edfisica: ant.consultas_edfisica ?? 0,
          observacao: ant.observacao,
        };
      }
      // sem mês anterior — usa valores iniciais
      return {
        participante_id: p.id,
        mes_referencia: iso,
        peso: p.peso_inicial,
        imc: p.imc_inicial,
        circunferencia: p.circunferencia_inicial,
      };
    });
    const { error } = await supabase.from("medicoes").upsert(rows, { onConflict: "participante_id,mes_referencia" });
    if (error) { toast.error(error.message); return; }
    toast.success(`Mês ${formatMes(iso)} criado${mesAnterior ? " com base em " + formatMes(mesAnterior) : ""}.`);
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
    const altura = parseFloat(novoPart.altura);
    if (!novoPart.nome || isNaN(peso) || isNaN(altura) || altura <= 0) {
      toast.error("Nome, altura e peso iniciais são obrigatórios.");
      return;
    }
    const imc = calcImc(peso, altura)!;
    const max = participantes.reduce((a, p) => Math.max(a, p.numero), 0);
    const { error } = await supabase.from("participantes").insert({
      numero: max + 1,
      nome: novoPart.nome,
      altura,
      peso_inicial: peso,
      imc_inicial: imc,
      circunferencia_inicial: novoPart.circunferencia_inicial ? parseFloat(novoPart.circunferencia_inicial) : null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Participante adicionado.");
    setNovoPart({ nome: "", altura: "", peso_inicial: "", circunferencia_inicial: "" });
    refetch();
  }

  async function removerParticipante(id: string) {
    if (!confirm("Remover este participante e todas as suas medições?")) return;
    const { error: e1 } = await supabase.from("medicoes").delete().eq("participante_id", id);
    if (e1) { toast.error(e1.message); return; }
    const { error } = await supabase.from("participantes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removido.");
    refetch();
  }

  const imcPreview = (() => {
    const p = parseFloat(novoPart.peso_inicial);
    const a = parseFloat(novoPart.altura);
    const v = calcImc(p, a);
    return v == null ? "—" : v.toFixed(2);
  })();

  const semAltura = participantes.filter(p => !p.altura).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-[1400px] px-6 py-4">
          <h1 className="text-lg font-semibold">Gestão</h1>
          <p className="text-xs text-muted-foreground">Cadastro de participantes, criação de meses e edição de medições.</p>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
        {/* Add participant */}
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Adicionar participante</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2"><Label>Nome</Label><Input value={novoPart.nome} onChange={e => setNovoPart({ ...novoPart, nome: e.target.value })} /></div>
            <div><Label>Altura (m)</Label><Input type="number" step="0.01" placeholder="1.70" value={novoPart.altura} onChange={e => setNovoPart({ ...novoPart, altura: e.target.value })} /></div>
            <div><Label>Peso inicial (kg)</Label><Input type="number" step="0.1" value={novoPart.peso_inicial} onChange={e => setNovoPart({ ...novoPart, peso_inicial: e.target.value })} /></div>
            <div><Label>IMC inicial (auto)</Label><Input value={imcPreview} readOnly className="bg-muted" /></div>
            <div><Label>Circ. (cm)</Label><Input type="number" step="0.1" value={novoPart.circunferencia_inicial} onChange={e => setNovoPart({ ...novoPart, circunferencia_inicial: e.target.value })} /></div>
            <Button onClick={addParticipante} className="md:col-span-6 md:w-fit"><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </div>
        </Card>

        {semAltura > 0 && (
          <Card className="p-4 border-yellow-500/40 bg-yellow-500/5 text-sm">
            <strong>{semAltura}</strong> participante(s) ainda sem altura cadastrada. Preencha a altura na grade abaixo para que o IMC seja calculado automaticamente.
          </Card>
        )}

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
            <p className="text-xs text-muted-foreground basis-full md:basis-auto md:ml-2">Novo mês é pré-preenchido com os valores do mês anterior.</p>
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
                  <th className="px-2 py-2">Altura (m)</th>
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
                    <td className="px-2 py-1">
                      <Input
                        className={`h-8 w-20 ${!p.altura ? "border-yellow-500" : ""}`}
                        type="number"
                        step="0.01"
                        defaultValue={p.altura ?? ""}
                        onBlur={e => { if (e.target.value !== String(p.altura ?? "")) setAlturaParticipante(p.id, e.target.value); }}
                      />
                    </td>
                    <td className="px-2 py-1"><Input className="h-8 w-20" type="number" step="0.1" value={getVal(p, "peso")} onChange={e => setVal(p.id, "peso", e.target.value)} /></td>
                    <td className="px-2 py-1"><Input className="h-8 w-20 bg-muted/40" type="number" step="0.01" value={getVal(p, "imc")} onChange={e => setVal(p.id, "imc", e.target.value)} title="Recalculado automaticamente ao alterar o peso" /></td>
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
