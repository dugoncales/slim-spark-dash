import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        setLoading(false);
      });
      unsubscribe = () => subscription.unsubscribe();
      supabase.auth
        .getSession()
        .then(({ data }) => {
          setSession(data.session);
        })
        .catch((err) => {
          console.error("[auth] getSession failed", err);
        })
        .finally(() => setLoading(false));
    } catch (err) {
      // Supabase client failed to initialize (missing env vars, bad config, etc.).
      // Surface an unauthenticated state so the router can redirect to /login.
      console.error("[auth] subscription failed", err);
      setLoading(false);
    }
    return () => unsubscribe?.();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
