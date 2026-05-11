create table if not exists public.configuracoes (
  chave text primary key,
  valor text,
  updated_at timestamptz not null default now()
);

alter table public.configuracoes enable row level security;

create policy "Auth read configuracoes" on public.configuracoes for select to authenticated using (true);
create policy "Gestor saude upsert configuracoes" on public.configuracoes for insert to authenticated with check (public.has_role(auth.uid(), 'gestor_saude') or public.has_role(auth.uid(), 'admin'));
create policy "Gestor saude update configuracoes" on public.configuracoes for update to authenticated using (public.has_role(auth.uid(), 'gestor_saude') or public.has_role(auth.uid(), 'admin'));

insert into public.configuracoes (chave, valor)
select 'mes_inicio', to_char((select min(mes_referencia) from public.medicoes), 'YYYY-MM-DD')
where exists (select 1 from public.medicoes)
on conflict (chave) do nothing;