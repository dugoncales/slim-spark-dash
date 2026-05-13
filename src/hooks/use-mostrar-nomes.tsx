import { useCallback, useEffect, useState } from "react";
import { useRoles } from "@/hooks/use-roles";

const STORAGE_KEY = "mostrarNomes";

/**
 * Estado compartilhado de anonimização entre todas as telas.
 *
 * - admin / gestor_saude: podem alternar e o valor persiste em localStorage.
 *   Default: admin = mostrar, gestor_saude = ocultar.
 * - gestor: SEMPRE oculto, sem opção de alternar.
 *
 * Após hidratação, `setMostrarNomes` grava no localStorage imediatamente.
 */
export function useMostrarNomes() {
  const { isAdmin, isGestorSaude, loading: rolesLoading } = useRoles();
  const canToggle = isAdmin || isGestorSaude;
  const [mostrarNomes, setMostrarNomesState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (rolesLoading) return;
    if (!canToggle) {
      setMostrarNomesState(false);
      setHydrated(true);
      return;
    }
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored !== null) setMostrarNomesState(stored === "1");
    else setMostrarNomesState(isAdmin);
    setHydrated(true);
  }, [rolesLoading, canToggle, isAdmin]);

  const setMostrarNomes = useCallback(
    (next: boolean) => {
      if (!canToggle) return;
      setMostrarNomesState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      }
    },
    [canToggle],
  );

  return { mostrarNomes, setMostrarNomes, canToggle, hydrated, rolesLoading };
}
