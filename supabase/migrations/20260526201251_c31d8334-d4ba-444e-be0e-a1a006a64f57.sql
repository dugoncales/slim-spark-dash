
-- 1. Tighten role_audit_log INSERT: only admins, and changed_by must equal auth.uid()
DROP POLICY IF EXISTS "Auth insert audit" ON public.role_audit_log;

CREATE POLICY "Admins insert audit"
  ON public.role_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND changed_by = auth.uid()
  );

-- 2. Secure RPCs that perform role changes with trusted audit metadata
CREATE OR REPLACE FUNCTION public.grant_user_role(_target_user_id uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_email text;
  _actor_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT email INTO _target_email FROM auth.users WHERE id = _target_user_id;
  SELECT email INTO _actor_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.role_audit_log
    (target_user_id, target_email, changed_by, changed_by_email, action, role)
  VALUES
    (_target_user_id, _target_email, auth.uid(), _actor_email, 'granted', _role);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_user_role(_target_user_id uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_email text;
  _actor_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Prevent admin from removing their own admin role
  IF _target_user_id = auth.uid() AND _role = 'admin' THEN
    RAISE EXCEPTION 'Cannot remove your own admin role';
  END IF;

  SELECT email INTO _target_email FROM auth.users WHERE id = _target_user_id;
  SELECT email INTO _actor_email FROM auth.users WHERE id = auth.uid();

  DELETE FROM public.user_roles
  WHERE user_id = _target_user_id AND role = _role;

  INSERT INTO public.role_audit_log
    (target_user_id, target_email, changed_by, changed_by_email, action, role)
  VALUES
    (_target_user_id, _target_email, auth.uid(), _actor_email, 'revoked', _role);
END;
$$;

-- 3. Lock down EXECUTE on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.grant_user_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_user_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_users_with_roles() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.grant_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
