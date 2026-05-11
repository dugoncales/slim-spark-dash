
-- Role enum
create type public.app_role as enum ('admin', 'gestor_saude', 'gestor');

-- user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- has_role security definer
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- RLS user_roles
create policy "Users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert roles" on public.user_roles
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update roles" on public.user_roles
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete roles" on public.user_roles
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- audit log
create table public.role_audit_log (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null,
  target_email text,
  changed_by uuid,
  changed_by_email text,
  action text not null, -- 'granted' | 'revoked'
  role public.app_role not null,
  created_at timestamptz not null default now()
);
alter table public.role_audit_log enable row level security;
create policy "Admins read audit" on public.role_audit_log
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Auth insert audit" on public.role_audit_log
  for insert to authenticated with check (true);

-- profiles-light view of users via a helper for admin UI
create or replace function public.list_users_with_roles()
returns table (user_id uuid, email text, roles public.app_role[])
language sql stable security definer set search_path = public
as $$
  select u.id, u.email::text, coalesce(array_agg(r.role) filter (where r.role is not null), '{}')
  from auth.users u
  left join public.user_roles r on r.user_id = u.id
  where public.has_role(auth.uid(), 'admin')
  group by u.id, u.email
  order by u.email
$$;

-- Auto-assign 'gestor' to new signups
create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'gestor')
  on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute function public.handle_new_user_role();

-- Backfill: give all existing users 'gestor_saude' + 'admin' so the first existing user can manage
insert into public.user_roles (user_id, role)
select id, 'gestor_saude'::public.app_role from auth.users
on conflict do nothing;
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users
on conflict do nothing;
