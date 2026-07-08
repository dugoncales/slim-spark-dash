import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchAll, formatMes, calcImc, NUTRI_FIELDS, MEDICAMENTOS, formatDoseValue, type Medicao, type Participante, type Grupo } from "@/lib/dashboard-data";
import { EXAME_KEYS, type ExameKey } from "@/lib/exames";
import { ExamesDialog } from "@/components/dashboard/ExamesDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/gestao")({
  component: Gestao,
});

function Gestao() {
  const { session, loading } = useAuth();
  const { isGestorSaude, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !session) navigate({ to: "/login" }); }, [loading, session, navigate]);
  useEffect(() => { if (!rolesLoading && session && !isGestorSaude) navigate({ to: "/" }); }, [rolesLoading, isGestorSaude, session, navigate]);

  const { data, refetch, isLoading } = useQuery({ queryKey: ["gestao"], queryFn: fetchAll, enabled: !!session });

  if (loading || isLoading || !session) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  const participantes = data?.participantes ?? [];
  const medicoes = data?.medicoes ?? [];
  const grupos = data?.grupos ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-[1400px] px-6 py-4">
          <h1 className="text-lg font-semibold">Gestão</h1>
          <p className="text-xs text-muted-foreground">Cadastro inicial dos participantes e acompanhamento mensal.</p>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <Tabs defaultValue="acompanhamento">
          <TabsList>
            <TabsTrigger value="cadastro">Cadastro inicial</TabsTrigger>
            <TabsTrigger value="acompanhamento">Acompanhamento mensal</TabsTrigger>
          </TabsList>
          <TabsContent value="cadastro" className="mt-4">
            <CadastroInicial participantes={participantes} grupos={grupos} refetch={refetch} session={!!session} />
          </TabsContent>
          <TabsContent value="acompanhamento" className="mt-4">
            <Acompanhamento participantes={participantes} medicoes={medicoes} grupos={grupos} refetch={refetch} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function FiltroGrupoSelect({ value, onChange, grupos, className }: { value: string; onChange: (v: string) => void; grupos: Grupo[]; className?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-[180px] h-8"}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__todos">Todos os grupos</SelectItem>
        <SelectItem value="__sem">Sem grupo</SelectItem>
        {grupos.filter(g => g.ativo).map(g => (
          <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function matchGrupo(p: Participante, filtroGrupo: string): boolean {
  if (filtroGrupo === "__todos") return true;
  if (filtroGrupo === "__sem") return !p.grupo_id;
  return p.grupo_id === filtroGrupo;
}

/* ============================== CADASTRO INICIAL ============================== */

function CadastroInicial({ participantes, grupos, refetch, session }: { participantes: Participante[]; grupos: Grupo[]; refetch: () => void; session: boolean }) {
  const cfgQ = useQuery({
    queryKey: ["configuracoes"],
    enabled: session,
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes").select("*");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map(r => [r.chave, r.valor])) as Record<string, string | null>;
    },
  });
  const mesInicio = cfgQ.data?.mes_inicio ?? null;
  const [mesInicioEdit, setMesInicioEdit] = useState<string>("");
  useEffect(() => { if (mesInicio) setMesInicioEdit(mesInicio.slice(0, 7)); }, [mesInicio]);

  async function salvarMesInicio() {
    if (!mesInicioEdit) { toast.error("Informe o mês de início."); return; }
    const iso = `${mesInicioEdit}-01`;
    const { error } = await supabase.from("configuracoes").upsert({ chave: "mes_inicio", valor: iso, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); return; }
    toast.success(`Mês de início definido: ${formatMes(iso)}.`);
    cfgQ.refetch();
  }

  const defaultMes = (mesInicio ? mesInicio.slice(0, 7) : new Date().toISOString().slice(0, 7));
  const [novoPart, setNovoPart] = useState({ nome: "", altura: "", peso_inicial: "", circunferencia_inicial: "", mes_inicio: "", grupo_id: "", sexo: "" });
  useEffect(() => { if (!novoPart.mes_inicio) setNovoPart(s => ({ ...s, mes_inicio: defaultMes })); }, [defaultMes]);
  const [filtroMes, setFiltroMes] = useState<string>("__todos");
  const [filtroGrupo, setFiltroGrupo] = useState<string>("__todos");
  const [edits, setEdits] = useState<Record<string, Partial<Participante>>>({});

  const imcPreview = (() => {
    const p = parseFloat(novoPart.peso_inicial);
    const a = parseFloat(novoPart.altura);
    const v = calcImc(p, a);
    return v == null ? "—" : v.toFixed(2);
  })();

  function getVal(p: Participante, field: keyof Participante): string {
    const edit = edits[p.id];
    if (edit && field in edit) {
      const v = (edit as Record<string, unknown>)[field];
      return v == null ? "" : String(v);
    }
    const v = (p as Record<string, unknown>)[field];
    return v == null ? "" : String(v);
  }

  function setVal(pid: string, field: keyof Participante, v: string | boolean) {
    setEdits(e => {
      const next: Partial<Participante> = { ...e[pid], [field]: typeof v === "string" && v === "" ? null : v } as Partial<Participante>;
      return { ...e, [pid]: next };
    });
  }

  function getNum(p: Participante, field: "altura" | "peso_inicial"): number | null {
    const s = getVal(p, field);
    if (s === "") return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  function imcLinha(p: Participante): string {
    const peso = getNum(p, "peso_inicial");
    const altura = getNum(p, "altura");
    const v = calcImc(peso, altura);
    return v == null ? "—" : v.toFixed(2);
  }

  async function addParticipante() {
    const peso = parseFloat(novoPart.peso_inicial);
    const altura = parseFloat(novoPart.altura);
    if (!novoPart.nome || isNaN(peso) || isNaN(altura) || altura <= 0 || !novoPart.mes_inicio) {
      toast.error("Nome, altura, peso e mês de início são obrigatórios.");
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
      mes_inicio: `${novoPart.mes_inicio}-01`,
      grupo_id: novoPart.grupo_id || null,
      sexo: (novoPart.sexo as "masculino" | "feminino" | "") || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Participante adicionado.");
    setNovoPart({ nome: "", altura: "", peso_inicial: "", circunferencia_inicial: "", mes_inicio: defaultMes, grupo_id: "", sexo: "" });
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

  async function salvarEdicoes() {
    const entries = Object.entries(edits);
    if (!entries.length) { toast.info("Nada para salvar."); return; }
    const numeric = new Set(["altura", "peso_inicial", "circunferencia_inicial"]);
    for (const [pid, fields] of entries) {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v === null || v === undefined || v === "") payload[k] = null;
        else if (numeric.has(k)) payload[k] = Number(v);
        else if (k === "mes_inicio") payload[k] = String(v).length === 7 ? `${v}-01` : v;
        else payload[k] = v;
      }
      const part = participantes.find(p => p.id === pid)!;
      const novoPeso = "peso_inicial" in payload ? (payload.peso_inicial as number | null) : part.peso_inicial;
      const novaAltura = "altura" in payload ? (payload.altura as number | null) : part.altura;
      const imc = calcImc(novoPeso ?? null, novaAltura ?? null);
      if (imc != null) payload.imc_inicial = imc;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("participantes").update(payload as any).eq("id", pid);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Cadastro inicial salvo.");
    setEdits({});
    refetch();
  }

  return (
    <div className="space-y-6">
      {/* Mês de início */}
      <Card className="p-5 border-primary/30 bg-primary/5">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label>Mês de início do acompanhamento</Label>
            <Input type="month" value={mesInicioEdit} onChange={e => setMesInicioEdit(e.target.value)} className="w-[200px]" />
          </div>
          <Button onClick={salvarMesInicio}><Save className="h-4 w-4 mr-1" />Salvar início</Button>
          <p className="text-xs text-muted-foreground basis-full md:basis-auto md:ml-2">
            {mesInicio ? <>Atual: <strong>{formatMes(mesInicio)}</strong>.</> : "Defina o mês inicial do programa."}
          </p>
        </div>
      </Card>

      {/* Adicionar */}
      <Card className="p-5">
        <h2 className="font-semibold mb-3">Adicionar participante</h2>
        <div className="grid grid-cols-2 md:grid-cols-8 gap-3 items-end">
          <div className="md:col-span-2"><Label>Nome</Label><Input value={novoPart.nome} onChange={e => setNovoPart({ ...novoPart, nome: e.target.value })} /></div>
          <div><Label>Altura (m)</Label><Input type="number" step="0.01" placeholder="1.70" value={novoPart.altura} onChange={e => setNovoPart({ ...novoPart, altura: e.target.value })} /></div>
          <div><Label>Peso inicial (kg)</Label><Input type="number" step="0.1" value={novoPart.peso_inicial} onChange={e => setNovoPart({ ...novoPart, peso_inicial: e.target.value })} /></div>
          <div><Label>IMC (auto)</Label><Input value={imcPreview} readOnly className="bg-muted" /></div>
          <div><Label>Circ. (cm)</Label><Input type="number" step="0.1" value={novoPart.circunferencia_inicial} onChange={e => setNovoPart({ ...novoPart, circunferencia_inicial: e.target.value })} /></div>
          <div><Label>Mês de início</Label><Input type="month" value={novoPart.mes_inicio} onChange={e => setNovoPart({ ...novoPart, mes_inicio: e.target.value })} /></div>
          <div>
            <Label>Grupo</Label>
            <Select value={novoPart.grupo_id || "__none"} onValueChange={(v) => setNovoPart({ ...novoPart, grupo_id: v === "__none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Sem grupo —</SelectItem>
                {grupos.filter(g => g.ativo).map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sexo</Label>
            <Select value={novoPart.sexo || "__none"} onValueChange={(v) => setNovoPart({ ...novoPart, sexo: v === "__none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Não informado —</SelectItem>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addParticipante} className="md:col-span-8 md:w-fit"><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
        </div>
      </Card>

      {/* Tabela editável */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-3 px-2 gap-3 flex-wrap">
          <h2 className="font-semibold">Participantes — dados iniciais</h2>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Filtrar por mês de início:</Label>
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="w-[180px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos">Todos</SelectItem>
                <SelectItem value="__sem">Sem definição</SelectItem>
                {Array.from(new Set(participantes.map(p => p.mes_inicio).filter(Boolean) as string[])).sort().map(m => (
                  <SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="text-xs ml-2">Filtrar por grupo:</Label>
            <FiltroGrupoSelect value={filtroGrupo} onChange={setFiltroGrupo} grupos={grupos} />
            <Button onClick={salvarEdicoes} disabled={!Object.keys(edits).length}>
              <Save className="h-4 w-4 mr-1" />Salvar ({Object.keys(edits).length})
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="text-left">
                <th className="px-2 py-2">Nº</th>
                <th className="px-2 py-2">Nome</th>
                <th className="px-2 py-2">Grupo</th>
                <th className="px-2 py-2">Mês início</th>
                <th className="px-2 py-2">Altura (m)</th>
                <th className="px-2 py-2">Peso inicial</th>
                <th className="px-2 py-2">IMC inicial</th>
                <th className="px-2 py-2">Circ. inicial</th>
                <th className="px-2 py-2">Sexo</th>
                <th className="px-2 py-2">Ativo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {participantes
                .filter(p => filtroMes === "__todos" ? true : filtroMes === "__sem" ? !p.mes_inicio : p.mes_inicio === filtroMes)
                .filter(p => matchGrupo(p, filtroGrupo))
                .map(p => {
                const miEdit = edits[p.id]?.mes_inicio as string | null | undefined;
                const miVal = miEdit !== undefined ? (miEdit ?? "") : (p.mes_inicio ?? "");
                return (
                <tr key={p.id} className="border-t">
                  <td className="px-2 py-1">{p.numero}</td>
                  <td className="px-2 py-1"><Input className="h-8 w-48" value={getVal(p, "nome")} onChange={e => setVal(p.id, "nome", e.target.value)} /></td>
                  <td className="px-2 py-1">
                    <Select
                      value={(edits[p.id]?.grupo_id ?? p.grupo_id) || "__none"}
                      onValueChange={(v) => setVal(p.id, "grupo_id", v === "__none" ? "" : v)}
                    >
                      <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— Sem grupo —</SelectItem>
                        {grupos.filter(g => g.ativo || g.id === p.grupo_id).map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1"><Input className="h-8 w-32" type="month" value={typeof miVal === "string" ? miVal.slice(0,7) : ""} onChange={e => setVal(p.id, "mes_inicio", e.target.value)} /></td>
                  <td className="px-2 py-1"><Input className="h-8 w-20" type="number" step="0.01" value={getVal(p, "altura")} onChange={e => setVal(p.id, "altura", e.target.value)} /></td>
                  <td className="px-2 py-1"><Input className="h-8 w-20" type="number" step="0.1" value={getVal(p, "peso_inicial")} onChange={e => setVal(p.id, "peso_inicial", e.target.value)} /></td>
                  <td className="px-2 py-1"><Input className="h-8 w-20 bg-muted" readOnly value={imcLinha(p)} /></td>
                  <td className="px-2 py-1"><Input className="h-8 w-20" type="number" step="0.1" value={getVal(p, "circunferencia_inicial")} onChange={e => setVal(p.id, "circunferencia_inicial", e.target.value)} /></td>
                  <td className="px-2 py-1">
                    <Select
                      value={((edits[p.id]?.sexo as string | null | undefined) ?? p.sexo) || "__none"}
                      onValueChange={(v) => setVal(p.id, "sexo", v === "__none" ? "" : v)}
                    >
                      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">—</SelectItem>
                        <SelectItem value="masculino">M</SelectItem>
                        <SelectItem value="feminino">F</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1">
                    <Switch
                      checked={(edits[p.id]?.ativo ?? p.ativo) as boolean}
                      onCheckedChange={(v) => setVal(p.id, "ativo", v)}
                    />
                  </td>
                  <td className="px-2 py-1"><Button variant="ghost" size="sm" onClick={() => removerParticipante(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                </tr>
                );
              })}
              {!participantes.length && (
                <tr><td colSpan={11} className="text-center text-sm text-muted-foreground py-6">Nenhum participante cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================== ACOMPANHAMENTO MENSAL ============================== */

function Acompanhamento({ participantes, medicoes, grupos, refetch }: { participantes: Participante[]; medicoes: Medicao[]; grupos: Grupo[]; refetch: () => void }) {
  const [filtroGrupo, setFiltroGrupo] = useState<string>("__todos");
  const meses = useMemo(() => Array.from(new Set(medicoes.map(m => m.mes_referencia))).sort(), [medicoes]);
  const [mesSel, setMesSel] = useState<string>("");
  const [novoMes, setNovoMes] = useState("2026-03");
  const [edits, setEdits] = useState<Record<string, Partial<Medicao>>>({});
  const [examesDialogPart, setExamesDialogPart] = useState<Participante | null>(null);

  useEffect(() => { if (meses.length && !mesSel) setMesSel(meses[meses.length - 1]); }, [meses, mesSel]);

  const medicoesDoMes = medicoes.filter(m => m.mes_referencia === mesSel);
  const byPart = new Map(medicoesDoMes.map(m => [m.participante_id, m]));

  function getVal(p: Participante, field: keyof Medicao): string {
    const edit = edits[p.id];
    if (edit && field in edit) return String((edit as Record<string, unknown>)[field] ?? "");
    const m = byPart.get(p.id);
    const v = m ? (m as Record<string, unknown>)[field] : null;
    return v == null ? "" : String(v);
  }

  function setVal(pid: string, field: keyof Medicao, v: string | boolean | null) {
    setEdits(e => {
      const next: Partial<Medicao> = { ...e[pid], [field]: v === "" ? null : v } as Partial<Medicao>;
      if (field === "peso" && typeof v === "string") {
        const part = participantes.find(p => p.id === pid);
        if (part?.altura && v !== "") {
          const imc = calcImc(parseFloat(v), part.altura);
          if (imc != null) next.imc = imc as unknown as Medicao["imc"];
        }
      }
      return { ...e, [pid]: next };
    });
  }

  function getBool(p: Participante, field: keyof Medicao): boolean {
    const edit = edits[p.id];
    if (edit && field in edit) return Boolean((edit as Record<string, unknown>)[field]);
    const m = byPart.get(p.id);
    return Boolean(m ? (m as Record<string, unknown>)[field] : false);
  }


  async function criarMes() {
    if (!novoMes) return;
    const iso = `${novoMes}-01`;
    if (meses.includes(iso)) { setMesSel(iso); return; }
    if (participantes.length === 0) { toast.info("Cadastre participantes primeiro."); setMesSel(iso); return; }
    const mesAnterior = meses.filter(m => m < iso).slice(-1)[0];
    const medsAnt = mesAnterior
      ? new Map(medicoes.filter(m => m.mes_referencia === mesAnterior).map(m => [m.participante_id, m]))
      : new Map<string, Medicao>();

    const elegiveis = participantes.filter(p => !p.mes_inicio || p.mes_inicio <= iso);
    const rows = elegiveis.map(p => {
      const ant = medsAnt.get(p.id);
      if (ant) {
        return {
          participante_id: p.id, mes_referencia: iso,
          peso: ant.peso, imc: ant.imc, circunferencia: ant.circunferencia,
          medicamento: ant.medicamento, dose: ant.dose,
          consultas_endocrino: ant.consultas_endocrino ?? 0,
          consultas_nutri: ant.consultas_nutri ?? 0,
          consultas_psico: ant.consultas_psico ?? 0,
          consultas_edfisica: ant.consultas_edfisica ?? 0,
          observacao: ant.observacao,
        };
      }
      return { participante_id: p.id, mes_referencia: iso, peso: p.peso_inicial, imc: p.imc_inicial, circunferencia: p.circunferencia_inicial };
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
    if (!toSave.length) { toast.info("Nada para salvar."); return; }
    const numericFields = new Set<string>([
      "peso", "imc", "circunferencia",
      "consultas_endocrino", "consultas_nutri", "consultas_psico", "consultas_edfisica",
      "consultas_endocrino_agendadas", "consultas_nutri_agendadas", "consultas_psico_agendadas", "consultas_edfisica_agendadas",
      "ativ_fisica_dias_semana",
      ...EXAME_KEYS,
    ]);
    const booleanFields = new Set([
      "nutri_reduziu_acucar", "nutri_reduziu_ultraprocessados", "nutri_aumentou_proteina",
      "nutri_aumentou_vegetais", "nutri_controle_porcoes", "nutri_reduziu_alcool",
    ]);
    for (const [pid, fields] of toSave) {
      const payload: Record<string, unknown> = { participante_id: pid, mes_referencia: mesSel };
      for (const [k, v] of Object.entries(fields)) {
        if (v == null) payload[k] = null;
        else if (booleanFields.has(k)) payload[k] = Boolean(v);
        else if (numericFields.has(k)) payload[k] = Number(v);
        else payload[k] = v;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("medicoes").upsert(payload as any, { onConflict: "participante_id,mes_referencia" });
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Alterações salvas.");
    setEdits({});
    refetch();
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label>Mês para editar</Label>
            <Select value={mesSel || undefined} onValueChange={setMesSel}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{meses.map(m => <SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Filtrar por grupo</Label>
            <FiltroGrupoSelect value={filtroGrupo} onChange={setFiltroGrupo} grupos={grupos} className="w-[200px] h-10" />
          </div>
          <div className="border-l h-12 mx-2 hidden md:block" />
          <div><Label>Novo mês</Label><Input type="month" value={novoMes} onChange={e => setNovoMes(e.target.value)} /></div>
          <Button variant="outline" onClick={criarMes}><Plus className="h-4 w-4 mr-1" />Criar / abrir mês</Button>
          <p className="text-xs text-muted-foreground basis-full md:basis-auto md:ml-2">Pré-preenchido com valores do mês anterior.</p>
          <div className="flex-1" />
          <Button onClick={salvar} disabled={!Object.keys(edits).length}><Save className="h-4 w-4 mr-1" />Salvar alterações ({Object.keys(edits).length})</Button>
        </div>
      </Card>

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
                <th className="px-2 py-2" title="Realizadas / Agendadas">Endo<br/><span className="text-[10px]">real / agend</span></th>
                <th className="px-2 py-2" title="Realizadas / Agendadas">Nutri<br/><span className="text-[10px]">real / agend</span></th>
                <th className="px-2 py-2" title="Realizadas / Agendadas">Psico<br/><span className="text-[10px]">real / agend</span></th>
                <th className="px-2 py-2" title="Realizadas / Agendadas">Ed.F<br/><span className="text-[10px]">real / agend</span></th>
                <th className="px-2 py-2">Ativ. física</th>
                <th className="px-2 py-2">Dias/sem</th>
                {NUTRI_FIELDS.map(f => (
                  <th key={f.key} className="px-2 py-2 text-center" title={f.label}>
                    <span className="text-[10px] leading-tight block max-w-[70px]">{f.label}</span>
                  </th>
                ))}
                <th className="px-2 py-2">Obs</th>
                <th className="px-2 py-2 text-center" title="Exames laboratoriais (opcional)">Exames</th>
              </tr>
            </thead>
            <tbody>
              {participantes
                .filter(p => !p.mes_inicio || p.mes_inicio <= mesSel)
                .filter(p => matchGrupo(p, filtroGrupo))
                .map(p => {
                const isInicio = p.mes_inicio === mesSel;
                return (
                <tr key={p.id} className="border-t">
                  <td className="px-2 py-1">{p.numero}</td>
                  <td className="px-2 py-1 font-medium whitespace-nowrap">
                    {p.nome}
                    {isInicio && <span className="ml-1 inline-block px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-medium">Início</span>}
                  </td>
                  <td className="px-2 py-1"><Input className="h-8 w-20" type="number" step="0.1" value={getVal(p, "peso")} onChange={e => setVal(p.id, "peso", e.target.value)} /></td>
                  <td className="px-2 py-1"><Input className="h-8 w-20 bg-muted/40" type="number" step="0.01" value={getVal(p, "imc")} onChange={e => setVal(p.id, "imc", e.target.value)} title="Recalculado ao alterar peso" /></td>
                  <td className="px-2 py-1"><Input className="h-8 w-20" type="number" step="0.1" value={getVal(p, "circunferencia") || (isInicio && p.circunferencia_inicial != null ? String(p.circunferencia_inicial) : "")} onChange={e => setVal(p.id, "circunferencia", e.target.value)} /></td>
                  <td className="px-2 py-1">
                    <Select
                      value={(getVal(p, "medicamento") as string) || "__none__"}
                      onValueChange={(v) => {
                        const next = v === "__none__" ? "" : v;
                        setVal(p.id, "medicamento", next);
                        // Limpa a dose se o medicamento mudou (doses são específicas da caneta).
                        const doseAtual = getVal(p, "dose") as string;
                        const med = MEDICAMENTOS.find((m) => m.nome === next);
                        if (!med || !med.doses.some((d) => formatDoseValue(d) === doseAtual)) {
                          setVal(p.id, "dose", "");
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-32"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {MEDICAMENTOS.map((m) => (
                          <SelectItem key={m.nome} value={m.nome}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1">
                    {(() => {
                      const medNome = getVal(p, "medicamento") as string;
                      const med = MEDICAMENTOS.find((m) => m.nome === medNome);
                      const doseAtual = (getVal(p, "dose") as string) || "";
                      // Normaliza doses legadas (ex.: "10mg", "5,0mg") para o valor padrão equivalente.
                      let doseSel = doseAtual;
                      if (med && doseAtual) {
                        const num = parseFloat(doseAtual.replace(",", ".").match(/\d+(?:\.\d+)?/)?.[0] ?? "");
                        const match = med.doses.find((d) => Math.abs(d - num) < 0.001);
                        if (match != null) doseSel = formatDoseValue(match);
                      }
                      return (
                        <Select
                          value={doseSel || "__none__"}
                          onValueChange={(v) => setVal(p.id, "dose", v === "__none__" ? "" : v)}
                          disabled={!med}
                        >
                          <SelectTrigger className="h-8 w-24"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {med?.doses.map((d) => {
                              const val = formatDoseValue(d);
                              return <SelectItem key={val} value={val}>{val}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      <Input className="h-8 w-12" type="number" value={getVal(p, "consultas_endocrino")} onChange={e => setVal(p.id, "consultas_endocrino", e.target.value)} />
                      <span className="text-muted-foreground">/</span>
                      <Input className="h-8 w-12 bg-muted/30" type="number" value={getVal(p, "consultas_endocrino_agendadas")} onChange={e => setVal(p.id, "consultas_endocrino_agendadas", e.target.value)} />
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      <Input className="h-8 w-12" type="number" value={getVal(p, "consultas_nutri")} onChange={e => setVal(p.id, "consultas_nutri", e.target.value)} />
                      <span className="text-muted-foreground">/</span>
                      <Input className="h-8 w-12 bg-muted/30" type="number" value={getVal(p, "consultas_nutri_agendadas")} onChange={e => setVal(p.id, "consultas_nutri_agendadas", e.target.value)} />
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      <Input className="h-8 w-12" type="number" value={getVal(p, "consultas_psico")} onChange={e => setVal(p.id, "consultas_psico", e.target.value)} />
                      <span className="text-muted-foreground">/</span>
                      <Input className="h-8 w-12 bg-muted/30" type="number" value={getVal(p, "consultas_psico_agendadas")} onChange={e => setVal(p.id, "consultas_psico_agendadas", e.target.value)} />
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      <Input className="h-8 w-12" type="number" value={getVal(p, "consultas_edfisica")} onChange={e => setVal(p.id, "consultas_edfisica", e.target.value)} />
                      <span className="text-muted-foreground">/</span>
                      <Input className="h-8 w-12 bg-muted/30" type="number" value={getVal(p, "consultas_edfisica_agendadas")} onChange={e => setVal(p.id, "consultas_edfisica_agendadas", e.target.value)} />
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <Select
                      value={(getVal(p, "ativ_fisica_intensidade") || "__none") as string}
                      onValueChange={(v) => setVal(p.id, "ativ_fisica_intensidade", v === "__none" ? null : v)}
                    >
                      <SelectTrigger className="h-8 w-36"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">—</SelectItem>
                        <SelectItem value="nao_pratica">Não pratica</SelectItem>
                        <SelectItem value="leve">Leve</SelectItem>
                        <SelectItem value="moderada">Moderada</SelectItem>
                        <SelectItem value="intensa">Intensa</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1"><Input className="h-8 w-16" type="number" min={0} max={7} value={getVal(p, "ativ_fisica_dias_semana")} onChange={e => setVal(p.id, "ativ_fisica_dias_semana", e.target.value)} /></td>
                  {NUTRI_FIELDS.map(f => (
                    <td key={f.key} className="px-2 py-1 text-center">
                      <Checkbox
                        checked={getBool(p, f.key as keyof Medicao)}
                        onCheckedChange={(v) => setVal(p.id, f.key as keyof Medicao, Boolean(v))}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1"><Input className="h-8 w-48" value={getVal(p, "observacao")} onChange={e => setVal(p.id, "observacao", e.target.value)} /></td>
                  <td className="px-2 py-1 text-center">
                    {(() => {
                      const preenchidos = EXAME_KEYS.filter((k) => getVal(p, k as keyof Medicao) !== "").length;
                      return (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 px-2"
                          onClick={() => setExamesDialogPart(p)}
                          title="Exames laboratoriais (glicemia, lipídios, PA)"
                        >
                          <FlaskConical className="h-3.5 w-3.5" />
                          {preenchidos > 0 ? (
                            <span className="text-[10px] font-semibold">{preenchidos}/8</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </Button>
                      );
                    })()}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {examesDialogPart && (
        <ExamesDialog
          open={!!examesDialogPart}
          onOpenChange={(v) => { if (!v) setExamesDialogPart(null); }}
          nome={examesDialogPart.nome}
          mesLabel={mesSel ? formatMes(mesSel) : ""}
          getValor={(k: ExameKey) => getVal(examesDialogPart, k as keyof Medicao)}
          onChange={(k, v) => setVal(examesDialogPart.id, k as keyof Medicao, v)}
        />
      )}
    </div>
  );
}
