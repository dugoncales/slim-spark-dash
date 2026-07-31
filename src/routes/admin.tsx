import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles, type AppRole } from "@/hooks/use-roles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ShieldCheck, Plus, Trash2, Layers } from "lucide-react";
import type { Grupo } from "@/lib/dashboard-data";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const ALL_ROLES: { key: AppRole; label: string; desc: string }[] = [
  { key: "gestor", label: "Gestor", desc: "Apenas Dashboard" },
  { key: "gestor_saude", label: "Gestor da Saúde", desc: "Dashboard + Gestão" },
  { key: "admin", label: "Administrador", desc: "Gerencia permissões" },
];

type UserRow = { user_id: string; email: string; roles: AppRole[] };
type LogRow = {
  id: string;
  target_email: string | null;
  changed_by_email: string | null;
  action: string;
  role: AppRole;
  created_at: string;
};

function AdminPage() {
  const { session, user, loading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);
  useEffect(() => {
    if (!rolesLoading && session && !isAdmin) navigate({ to: "/" });
  }, [rolesLoading, isAdmin, session, navigate]);

  const usersQ = useQuery({
    queryKey: ["admin-users"],
    enabled: !!session && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_users_with_roles");
      if (error) throw error;
      return (data ?? []) as UserRow[];
    },
  });

  const logsQ = useQuery({
    queryKey: ["admin-logs"],
    enabled: !!session && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  const [busy, setBusy] = useState<string | null>(null);

  async function toggleRole(u: UserRow, role: AppRole, hasIt: boolean) {
    setBusy(u.user_id + role);
    try {
      if (hasIt) {
        const { error } = await supabase.rpc("revoke_user_role", {
          _target_user_id: u.user_id,
          _role: role,
        });
        if (error) throw error;
        toast.success(`Permissão "${role}" removida de ${u.email}`);
      } else {
        const { error } = await supabase.rpc("grant_user_role", {
          _target_user_id: u.user_id,
          _role: role,
        });
        if (error) throw error;
        toast.success(`Permissão "${role}" concedida a ${u.email}`);
      }
      usersQ.refetch();
      logsQ.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (loading || rolesLoading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Administração</h1>
          <p className="text-sm text-muted-foreground">Gerencie permissões e veja o histórico de alterações.</p>
        </div>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Usuários e permissões</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                {ALL_ROLES.map(r => (
                  <TableHead key={r.key} className="text-center">
                    <div>{r.label}</div>
                    <div className="text-[10px] font-normal text-muted-foreground">{r.desc}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(usersQ.data ?? []).map(u => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  {ALL_ROLES.map(r => {
                    const hasIt = u.roles?.includes(r.key);
                    const isSelf = u.user_id === user?.id && r.key === "admin";
                    return (
                      <TableCell key={r.key} className="text-center">
                        <Checkbox
                          checked={hasIt}
                          disabled={busy === u.user_id + r.key || isSelf}
                          onCheckedChange={() => toggleRole(u, r.key, hasIt)}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Você não pode remover sua própria permissão de administrador.</p>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Log de modificações</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Quem alterou</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Permissão</TableHead>
                <TableHead>Usuário alvo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logsQ.data ?? []).map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{l.changed_by_email ?? "—"}</TableCell>
                  <TableCell>
                    <span className={l.action === "granted" ? "text-green-600" : "text-red-600"}>
                      {l.action === "granted" ? "Concedeu" : "Removeu"}
                    </span>
                  </TableCell>
                  <TableCell>{l.role}</TableCell>
                  <TableCell>{l.target_email ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!logsQ.data?.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Sem alterações ainda.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <GruposAdmin />

      <AcessoPorGrupo users={usersQ.data ?? []} onChanged={() => logsQ.refetch()} />

    </div>
  );
}

/* ============================== GRUPOS ============================== */

function GruposAdmin() {
  const gruposQ = useQuery({
    queryKey: ["admin-grupos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grupos").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Grupo[];
    },
  });
  const countsQ = useQuery({
    queryKey: ["admin-grupos-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("participantes").select("grupo_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      let semGrupo = 0;
      (data ?? []).forEach((p: { grupo_id: string | null }) => {
        if (p.grupo_id == null) semGrupo++;
        else counts[p.grupo_id] = (counts[p.grupo_id] ?? 0) + 1;
      });
      return { counts, semGrupo };
    },
  });

  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState("#3b82f6");
  const [busy, setBusy] = useState(false);

  async function criarGrupo() {
    if (!novoNome.trim()) { toast.error("Informe o nome."); return; }
    setBusy(true);
    const { error } = await supabase.from("grupos").insert({ nome: novoNome.trim(), cor: novaCor || null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Grupo criado.");
    setNovoNome("");
    gruposQ.refetch();
  }

  async function atualizarGrupo(id: string, patch: Partial<Grupo>) {
    const { error } = await supabase.from("grupos").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    gruposQ.refetch();
    countsQ.refetch();
  }

  async function removerGrupo(g: Grupo) {
    const n = countsQ.data?.counts[g.id] ?? 0;
    if (!confirm(`Excluir "${g.nome}"?${n ? ` ${n} participante(s) ficarão sem grupo.` : ""}`)) return;
    const { error } = await supabase.from("grupos").delete().eq("id", g.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Grupo removido.");
    gruposQ.refetch();
    countsQ.refetch();
  }

  const grupos = gruposQ.data ?? [];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Grupos de análise</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Crie grupos (ex.: empresas, unidades) para segmentar os indicadores do dashboard.
      </p>

      <div className="flex items-end gap-2 mb-4 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-muted-foreground">Nome do grupo</label>
          <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex.: Empresa A" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Cor</label>
          <Input type="color" value={novaCor} onChange={(e) => setNovaCor(e.target.value)} className="w-16 p-1 h-9" />
        </div>
        <Button onClick={criarGrupo} disabled={busy}><Plus className="h-4 w-4 mr-1" />Criar</Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cor</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-center">Participantes</TableHead>
              <TableHead className="text-center">Ativo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grupos.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  <Input
                    type="color"
                    value={g.cor ?? "#94a3b8"}
                    onChange={(e) => atualizarGrupo(g.id, { cor: e.target.value })}
                    className="w-12 p-1 h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    defaultValue={g.nome}
                    onBlur={(e) => { if (e.target.value !== g.nome) atualizarGrupo(g.id, { nome: e.target.value }); }}
                    className="h-8"
                  />
                </TableCell>
                <TableCell className="text-center">{countsQ.data?.counts[g.id] ?? 0}</TableCell>
                <TableCell className="text-center">
                  <Switch checked={g.ativo} onCheckedChange={(v) => atualizarGrupo(g.id, { ativo: v })} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => removerGrupo(g)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!grupos.length && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-4">Nenhum grupo cadastrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        {(countsQ.data?.semGrupo ?? 0) > 0 && (
          <p className="text-xs text-muted-foreground mt-2">{countsQ.data!.semGrupo} participante(s) sem grupo atribuído.</p>
        )}
      </div>
    </Card>
  );
}

/* ========================== ACESSO POR GRUPO ========================== */

function AcessoPorGrupo({ users, onChanged }: { users: UserRow[]; onChanged: () => void }) {
  const gruposQ = useQuery({
    queryKey: ["admin-grupos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grupos").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Grupo[];
    },
  });
  const acessosQ = useQuery({
    queryKey: ["admin-user-grupos"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_user_grupos");
      if (error) throw error;
      return (data ?? []) as { user_id: string; grupo_id: string }[];
    },
  });

  const [busy, setBusy] = useState<string | null>(null);
  const grupos = (gruposQ.data ?? []).filter((g) => g.ativo);
  const acessos = acessosQ.data ?? [];

  async function toggle(u: UserRow, grupoId: string, hasIt: boolean) {
    setBusy(u.user_id + grupoId);
    try {
      const { error } = await supabase.rpc(hasIt ? "revoke_user_grupo" : "grant_user_grupo", {
        _target_user_id: u.user_id,
        _grupo_id: grupoId,
      });
      if (error) throw error;
      toast.success(hasIt ? "Acesso removido." : "Acesso concedido.");
      acessosQ.refetch();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Acesso por grupo</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Administradores acessam todos os grupos. Gestores e gestores da saúde acessam apenas os
        grupos marcados abaixo — participantes sem grupo ficam visíveis somente para administradores.
      </p>

      {!grupos.length ? (
        <p className="text-sm text-muted-foreground py-2">Crie um grupo para atribuir acessos.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                {grupos.map((g) => (
                  <TableHead key={g.id} className="text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm"
                        style={{ background: g.cor ?? "#94a3b8" }}
                      />
                      {g.nome}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isAdminUser = u.roles?.includes("admin");
                return (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">
                      {u.email}
                      {isAdminUser && (
                        <span className="ml-2 text-[10px] text-muted-foreground">(acesso total)</span>
                      )}
                    </TableCell>
                    {grupos.map((g) => {
                      const hasIt = acessos.some(
                        (a) => a.user_id === u.user_id && a.grupo_id === g.id,
                      );
                      return (
                        <TableCell key={g.id} className="text-center">
                          <Checkbox
                            checked={isAdminUser ? true : hasIt}
                            disabled={isAdminUser || busy === u.user_id + g.id}
                            onCheckedChange={() => toggle(u, g.id, hasIt)}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
              {!users.length && (
                <TableRow>
                  <TableCell colSpan={grupos.length + 1} className="text-center text-sm text-muted-foreground py-4">
                    Nenhum usuário.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
