import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AppRole = "admin" | "gestor_saude" | "gestor";

export function useRoles() {
  const { user, loading: authLoading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = data ?? [];
  return {
    roles,
    isAdmin: roles.includes("admin"),
    isGestorSaude: roles.includes("gestor_saude") || roles.includes("admin"),
    loading: authLoading || (!!user && isLoading),
  };
}
