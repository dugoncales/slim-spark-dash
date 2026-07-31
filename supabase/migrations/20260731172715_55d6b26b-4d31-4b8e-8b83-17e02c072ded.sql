-- 1. Tabela de atribuição
CREATE TABLE IF NOT EXISTS public.user_grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, grupo_id)
);

GRANT SELECT ON public.user_grupos TO authenticated;
GRANT ALL ON public.user_grupos TO service_role;

ALTER TABLE public.user_grupos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_grupos_select_own_or_admin" ON public.user_grupos;
CREATE POLICY "user_grupos_select_own_or_admin" ON public.user_grupos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 2. Funções de escopo
CREATE OR REPLACE FUNCTION public.user_grupo_ids(_user_id uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(grupo_id), '{}') FROM public.user_grupos WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.user_has_grupo(_user_id uuid, _grupo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT exists (SELECT 1 FROM public.user_grupos WHERE user_id = _user_id AND grupo_id = _grupo_id)
$$;

CREATE OR REPLACE FUNCTION public.can_access_participante(_user_id uuid, _grupo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR (_grupo_id IS NOT NULL AND public.user_has_grupo(_user_id, _grupo_id))
$$;

REVOKE ALL ON FUNCTION public.user_grupo_ids(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_has_grupo(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_participante(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_grupo_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_grupo(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_participante(uuid, uuid) TO authenticated;

-- 3. RPCs de administração
CREATE OR REPLACE FUNCTION public.grant_user_grupo(_target_user_id uuid, _grupo_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _target_email text; _actor_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT email INTO _target_email FROM auth.users WHERE id = _target_user_id;
  SELECT email INTO _actor_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.user_grupos (user_id, grupo_id) VALUES (_target_user_id, _grupo_id)
  ON CONFLICT (user_id, grupo_id) DO NOTHING;
  INSERT INTO public.role_audit_log (target_user_id, target_email, changed_by, changed_by_email, action, role)
  VALUES (_target_user_id, _target_email, auth.uid(), _actor_email,
          'grupo_granted:' || _grupo_id::text, 'gestor');
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_user_grupo(_target_user_id uuid, _grupo_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _target_email text; _actor_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT email INTO _target_email FROM auth.users WHERE id = _target_user_id;
  SELECT email INTO _actor_email FROM auth.users WHERE id = auth.uid();
  DELETE FROM public.user_grupos WHERE user_id = _target_user_id AND grupo_id = _grupo_id;
  INSERT INTO public.role_audit_log (target_user_id, target_email, changed_by, changed_by_email, action, role)
  VALUES (_target_user_id, _target_email, auth.uid(), _actor_email,
          'grupo_revoked:' || _grupo_id::text, 'gestor');
END;
$$;

CREATE OR REPLACE FUNCTION public.list_user_grupos()
RETURNS TABLE(user_id uuid, grupo_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ug.user_id, ug.grupo_id FROM public.user_grupos ug
  WHERE public.has_role(auth.uid(), 'admin')
$$;

REVOKE ALL ON FUNCTION public.grant_user_grupo(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_user_grupo(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_user_grupos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_user_grupo(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_grupo(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_user_grupos() TO authenticated;

-- 4. Policies de participantes
DROP POLICY IF EXISTS "Role users read participantes" ON public.participantes;
DROP POLICY IF EXISTS "Gestor saude insert participantes" ON public.participantes;
DROP POLICY IF EXISTS "Gestor saude update participantes" ON public.participantes;
DROP POLICY IF EXISTS "Gestor saude delete participantes" ON public.participantes;

CREATE POLICY "participantes_select_scoped" ON public.participantes
  FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'gestor_saude')
     OR public.has_role(auth.uid(), 'gestor'))
    AND public.can_access_participante(auth.uid(), grupo_id)
  );

CREATE POLICY "participantes_insert_scoped" ON public.participantes
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor_saude'))
    AND public.can_access_participante(auth.uid(), grupo_id)
  );

CREATE POLICY "participantes_update_scoped" ON public.participantes
  FOR UPDATE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor_saude'))
    AND public.can_access_participante(auth.uid(), grupo_id)
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor_saude'))
    AND public.can_access_participante(auth.uid(), grupo_id)
  );

CREATE POLICY "participantes_delete_scoped" ON public.participantes
  FOR DELETE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor_saude'))
    AND public.can_access_participante(auth.uid(), grupo_id)
  );

-- 5. Policies de medicoes
DROP POLICY IF EXISTS "Role users read medicoes" ON public.medicoes;
DROP POLICY IF EXISTS "Gestor saude insert medicoes" ON public.medicoes;
DROP POLICY IF EXISTS "Gestor saude update medicoes" ON public.medicoes;
DROP POLICY IF EXISTS "Gestor saude delete medicoes" ON public.medicoes;

CREATE POLICY "medicoes_select_scoped" ON public.medicoes
  FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'gestor_saude')
     OR public.has_role(auth.uid(), 'gestor'))
    AND EXISTS (
      SELECT 1 FROM public.participantes p
      WHERE p.id = medicoes.participante_id
        AND public.can_access_participante(auth.uid(), p.grupo_id)
    )
  );

CREATE POLICY "medicoes_insert_scoped" ON public.medicoes
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor_saude'))
    AND EXISTS (
      SELECT 1 FROM public.participantes p
      WHERE p.id = medicoes.participante_id
        AND public.can_access_participante(auth.uid(), p.grupo_id)
    )
  );

CREATE POLICY "medicoes_update_scoped" ON public.medicoes
  FOR UPDATE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor_saude'))
    AND EXISTS (
      SELECT 1 FROM public.participantes p
      WHERE p.id = medicoes.participante_id
        AND public.can_access_participante(auth.uid(), p.grupo_id)
    )
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor_saude'))
    AND EXISTS (
      SELECT 1 FROM public.participantes p
      WHERE p.id = medicoes.participante_id
        AND public.can_access_participante(auth.uid(), p.grupo_id)
    )
  );

CREATE POLICY "medicoes_delete_scoped" ON public.medicoes
  FOR DELETE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor_saude'))
    AND EXISTS (
      SELECT 1 FROM public.participantes p
      WHERE p.id = medicoes.participante_id
        AND public.can_access_participante(auth.uid(), p.grupo_id)
    )
  );

-- 6. Policy de grupos (leitura escopada)
DROP POLICY IF EXISTS "grupos_select_authenticated" ON public.grupos;
CREATE POLICY "grupos_select_scoped" ON public.grupos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.user_has_grupo(auth.uid(), id));