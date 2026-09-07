import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Redefinir senha — Painel HEALTHBIT" },
      {
        name: "description",
        content: "Defina uma nova senha para acessar o painel de acompanhamento HEALTHBIT.",
      },
      { property: "og:title", content: "Redefinir senha — Painel HEALTHBIT" },
      {
        property: "og:description",
        content: "Defina uma nova senha para acessar o painel de acompanhamento HEALTHBIT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // O link do e-mail entrega a sessão de recuperação (hash ou code).
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (senha !== confirma) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      toast.success("Senha alterada com sucesso.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background px-4">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="mb-8 text-center">
          <img
            src="/logo.webp"
            alt="HEALTHBIT — uma empresa RDsaúde"
            className="h-[52px] w-auto object-contain mx-auto mb-4"
          />
          <h1 className="text-xl font-semibold mt-2">Definir nova senha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ready
              ? "Escolha uma senha com pelo menos 6 caracteres"
              : "Abra esta página pelo link enviado no seu e-mail"}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="confirma">Confirmar nova senha</Label>
            <Input
              id="confirma"
              type="password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={loading || !ready} className="w-full">
            {loading ? "Aguarde..." : "Salvar nova senha"}
          </Button>
          <button
            type="button"
            onClick={() => navigate({ to: "/login" })}
            className="w-full text-sm text-muted-foreground hover:text-primary"
          >
            Voltar para o login
          </button>
        </form>
      </Card>
    </div>
  );
}
