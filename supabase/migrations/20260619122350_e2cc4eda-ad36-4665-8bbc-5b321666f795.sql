CREATE TYPE public.sexo_tipo AS ENUM ('masculino', 'feminino');
ALTER TABLE public.participantes ADD COLUMN sexo public.sexo_tipo;