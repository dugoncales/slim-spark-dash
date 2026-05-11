
create table public.participantes (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique,
  nome text not null,
  peso_inicial numeric(6,2) not null,
  imc_inicial numeric(5,2) not null,
  circunferencia_inicial numeric(6,2),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.medicoes (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  mes_referencia date not null,
  peso numeric(6,2),
  imc numeric(5,2),
  circunferencia numeric(6,2),
  medicamento text,
  dose text,
  consultas_endocrino int default 0,
  consultas_nutri int default 0,
  consultas_psico int default 0,
  consultas_edfisica int default 0,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(participante_id, mes_referencia)
);

create index on public.medicoes(mes_referencia);

alter table public.participantes enable row level security;
alter table public.medicoes enable row level security;

create policy "Auth users read participantes" on public.participantes for select to authenticated using (true);
create policy "Auth users insert participantes" on public.participantes for insert to authenticated with check (true);
create policy "Auth users update participantes" on public.participantes for update to authenticated using (true) with check (true);
create policy "Auth users delete participantes" on public.participantes for delete to authenticated using (true);

create policy "Auth users read medicoes" on public.medicoes for select to authenticated using (true);
create policy "Auth users insert medicoes" on public.medicoes for insert to authenticated with check (true);
create policy "Auth users update medicoes" on public.medicoes for update to authenticated using (true) with check (true);
create policy "Auth users delete medicoes" on public.medicoes for delete to authenticated using (true);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_participantes_updated before update on public.participantes for each row execute function public.set_updated_at();
create trigger trg_medicoes_updated before update on public.medicoes for each row execute function public.set_updated_at();
