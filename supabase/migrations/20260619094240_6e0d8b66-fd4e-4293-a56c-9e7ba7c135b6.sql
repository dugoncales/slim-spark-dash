
CREATE TABLE public.grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos TO authenticated;
GRANT ALL ON public.grupos TO service_role;

ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grupos_select_authenticated" ON public.grupos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "grupos_insert_admin" ON public.grupos
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "grupos_update_admin" ON public.grupos
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "grupos_delete_admin" ON public.grupos
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER grupos_set_updated_at
  BEFORE UPDATE ON public.grupos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.participantes
  ADD COLUMN grupo_id uuid REFERENCES public.grupos(id) ON DELETE SET NULL;

CREATE INDEX participantes_grupo_id_idx ON public.participantes(grupo_id);
