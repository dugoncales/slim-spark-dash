ALTER TABLE public.medicoes
  ADD COLUMN IF NOT EXISTS glicemia_jejum numeric,
  ADD COLUMN IF NOT EXISTS hba1c numeric,
  ADD COLUMN IF NOT EXISTS colesterol_total numeric,
  ADD COLUMN IF NOT EXISTS hdl numeric,
  ADD COLUMN IF NOT EXISTS ldl numeric,
  ADD COLUMN IF NOT EXISTS triglicerideos numeric,
  ADD COLUMN IF NOT EXISTS pa_sistolica integer,
  ADD COLUMN IF NOT EXISTS pa_diastolica integer;