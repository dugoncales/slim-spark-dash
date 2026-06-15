-- Drop auto-role assignment trigger so new signups get NO role until admin grants one
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role();

-- Tighten SELECT policies: require an explicit role instead of any authenticated user
DROP POLICY IF EXISTS "Auth users read participantes" ON public.participantes;
CREATE POLICY "Role users read participantes" ON public.participantes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor_saude'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
  );

DROP POLICY IF EXISTS "Auth users read medicoes" ON public.medicoes;
CREATE POLICY "Role users read medicoes" ON public.medicoes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor_saude'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
  );

DROP POLICY IF EXISTS "Auth read configuracoes" ON public.configuracoes;
CREATE POLICY "Role users read configuracoes" ON public.configuracoes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor_saude'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
  );