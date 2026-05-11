ALTER TABLE public.participantes ADD COLUMN IF NOT EXISTS mes_inicio date;

UPDATE public.participantes p
SET mes_inicio = sub.first_mes
FROM (
  SELECT participante_id, MIN(mes_referencia) AS first_mes
  FROM public.medicoes
  GROUP BY participante_id
) sub
WHERE p.id = sub.participante_id AND p.mes_inicio IS NULL;

UPDATE public.participantes
SET mes_inicio = (SELECT (valor)::date FROM public.configuracoes WHERE chave = 'mes_inicio' LIMIT 1)
WHERE mes_inicio IS NULL;