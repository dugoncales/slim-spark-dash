ALTER TABLE public.medicoes
  ADD COLUMN ativ_fisica_intensidade text
    CHECK (ativ_fisica_intensidade IN ('nao_pratica','leve','moderada','intensa')),
  ADD COLUMN ativ_fisica_dias_semana smallint
    CHECK (ativ_fisica_dias_semana BETWEEN 0 AND 7),
  ADD COLUMN nutri_reduziu_acucar boolean DEFAULT false,
  ADD COLUMN nutri_reduziu_ultraprocessados boolean DEFAULT false,
  ADD COLUMN nutri_aumentou_proteina boolean DEFAULT false,
  ADD COLUMN nutri_aumentou_vegetais boolean DEFAULT false,
  ADD COLUMN nutri_controle_porcoes boolean DEFAULT false,
  ADD COLUMN nutri_reduziu_alcool boolean DEFAULT false,
  ADD COLUMN consultas_endocrino_agendadas smallint DEFAULT 0,
  ADD COLUMN consultas_nutri_agendadas smallint DEFAULT 0,
  ADD COLUMN consultas_psico_agendadas smallint DEFAULT 0,
  ADD COLUMN consultas_edfisica_agendadas smallint DEFAULT 0;