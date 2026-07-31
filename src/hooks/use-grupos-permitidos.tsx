import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";

/**
 * Grupos que o usuário atual pode acessar.
 * `isGlobal` = admin (vê todos os grupos e participantes sem grupo).
 * Para usuários escopados, a RLS já filtra os dados; este hook serve para
 * ajustar a UI (opções de filtro, "Sem grupo", estados vazios).
 */
export function useGruposPermitidos() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();

  const { data, isLoading } = useQuery({
    queryKey: ["user-grupos", user?.id],
    enabled: !!user && !isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_grupos")
        .select("grupo_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.grupo_id as string);
    },
  });

  return {
    isGlobal: isAdmin,
    grupoIds: isAdmin ? null : (data ?? []),
    /** true quando o usuário é escopado e não tem nenhum grupo atribuído */
    semAcesso: !isAdmin && !isLoading && (data ?? []).length === 0,
    loading: authLoading || rolesLoading || (!!user && !isAdmin && isLoading),
  };
}
