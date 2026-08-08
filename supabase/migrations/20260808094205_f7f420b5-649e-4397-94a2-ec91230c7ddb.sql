CREATE OR REPLACE FUNCTION public.next_participante_numero()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(max(numero), 0) + 1 FROM public.participantes
$$;

REVOKE ALL ON FUNCTION public.next_participante_numero() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_participante_numero() TO authenticated;