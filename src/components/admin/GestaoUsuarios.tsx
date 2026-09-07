import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Trash2, KeyRound, Users } from "lucide-react";
import {
  listAuthUsers,
  inviteUser,
  sendPasswordReset,
  deleteAuthUser,
  type AdminUserInfo,
} from "@/lib/user-admin.functions";

export function GestaoUsuarios({ onChanged }: { onChanged: () => void }) {
  const fetchUsers = useServerFn(listAuthUsers);
  const invite = useServerFn(inviteUser);
  const reset = useServerFn(sendPasswordReset);
  const remove = useServerFn(deleteAuthUser);

  const usersQ = useQuery({
    queryKey: ["auth-users"],
    queryFn: () => fetchUsers() as Promise<AdminUserInfo[]>,
  });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("gestor");
  const [busy, setBusy] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function convidar() {
    if (!email.trim()) { toast.error("Informe o e-mail."); return; }
    setBusy("invite");
    try {
      await invite({ data: { email, redirectTo: `${origin}/reset-password`, role } });
      toast.success(`Convite enviado para ${email.trim().toLowerCase()}.`);
      setEmail("");
      usersQ.refetch();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function reenviarSenha(u: AdminUserInfo) {
    if (!u.email) return;
    setBusy(u.id);
    try {
      await reset({ data: { email: u.email, redirectTo: `${origin}/reset-password` } });
      toast.success("Link de acesso enviado por e-mail.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function excluir(u: AdminUserInfo) {
    if (!confirm(`Remover o acesso de ${u.email}? Esta ação não pode ser desfeita.`)) return;
    setBusy(u.id);
    try {
      await remove({ data: { userId: u.id } });
      toast.success("Usuário removido.");
      usersQ.refetch();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const users = usersQ.data ?? [];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Gestão de usuários</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Convide pessoas por e-mail (elas recebem um link para criar a senha), reenvie o acesso ou
        remova quem não deve mais entrar.
      </p>

      <div className="flex items-end gap-2 mb-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs text-muted-foreground">E-mail</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pessoa@empresa.com"
          />
        </div>
        <div className="min-w-[170px]">
          <label className="text-xs text-muted-foreground">Permissão inicial</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gestor">Gestor</SelectItem>
              <SelectItem value="gestor_saude">Gestor da Saúde</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={convidar} disabled={busy === "invite"}>
          <UserPlus className="h-4 w-4 mr-1" />Convidar
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {u.confirmed ? (
                    <span className="text-green-600">Ativo</span>
                  ) : (
                    <span className="text-amber-600">Convite pendente</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "Nunca"}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy === u.id}
                    onClick={() => reenviarSenha(u)}
                    title="Enviar link de acesso/senha"
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy === u.id}
                    onClick={() => excluir(u)}
                    title="Remover usuário"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!users.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">
                  {usersQ.isLoading ? "Carregando..." : "Nenhum usuário."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
