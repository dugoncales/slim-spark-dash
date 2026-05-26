
-- participantes: restrict writes to gestor_saude/admin
DROP POLICY IF EXISTS "Auth users insert participantes" ON public.participantes;
DROP POLICY IF EXISTS "Auth users update participantes" ON public.participantes;
DROP POLICY IF EXISTS "Auth users delete participantes" ON public.participantes;

CREATE POLICY "Gestor saude insert participantes" ON public.participantes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'gestor_saude') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Gestor saude update participantes" ON public.participantes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor_saude') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'gestor_saude') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Gestor saude delete participantes" ON public.participantes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor_saude') OR public.has_role(auth.uid(), 'admin'));

-- medicoes: same
DROP POLICY IF EXISTS "Auth users insert medicoes" ON public.medicoes;
DROP POLICY IF EXISTS "Auth users update medicoes" ON public.medicoes;
DROP POLICY IF EXISTS "Auth users delete medicoes" ON public.medicoes;

CREATE POLICY "Gestor saude insert medicoes" ON public.medicoes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'gestor_saude') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Gestor saude update medicoes" ON public.medicoes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor_saude') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'gestor_saude') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Gestor saude delete medicoes" ON public.medicoes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor_saude') OR public.has_role(auth.uid(), 'admin'));
