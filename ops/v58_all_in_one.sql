create extension if not exists pgcrypto;

create or replace function public.auth_role()
returns text language sql stable as $$
  select coalesce((current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'role'), '');
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$ select public.auth_role() in ('admin','manager'); $$;

create or replace function public.is_production()
returns boolean language sql stable as $$ select public.auth_role() = 'production'; $$;

create table if not exists public.messages(
  id uuid primary key default gen_random_uuid(),
  message text not null,
  sender_id uuid, sender_email text, role text,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
drop policy if exists messages_select_all on public.messages;
create policy messages_select_all on public.messages for select to authenticated using (true);
drop policy if exists messages_insert_auth on public.messages;
create policy messages_insert_auth on public.messages for insert to authenticated with check (auth.uid() is not null);

create table if not exists public.profiles(
  id uuid primary key, full_name text, email text unique, role text default 'lsp', status text default 'active', created_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.applications(
  id uuid primary key default gen_random_uuid(), full_name text, email text, phone text, status text default 'pending', created_at timestamptz default now()
);
alter table public.applications enable row level security;
drop policy if exists apps_admin_all on public.applications;
create policy apps_admin_all on public.applications for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.orders(
  id uuid primary key default gen_random_uuid(), production text, location text, call_time text, end_time text, date date, task_type text, lsp_count int, notes text,
  status text default 'new', status_ts timestamptz default now(), created_by uuid default auth.uid(), created_at timestamptz default now()
);
alter table public.orders enable row level security;
drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists orders_prod_insert on public.orders;
create policy orders_prod_insert on public.orders for insert to authenticated with check (public.is_production());

create table if not exists public.hours(
  id bigserial primary key, lsp_id uuid, lsp_name text, production text, location text, start_time text, finish_time text, allowances text, status text default 'submitted',
  created_at timestamptz default now(), approved_at timestamptz
);
alter table public.hours enable row level security;
drop policy if exists hours_admin_all on public.hours;
create policy hours_admin_all on public.hours for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists hours_lsp_own on public.hours;
create policy hours_lsp_own on public.hours for select to authenticated using (lsp_id = auth.uid());

create table if not exists public.clarion_safe(
  id uuid primary key default gen_random_uuid(), sender_email text, lsp_name text, lat double precision, lng double precision, timestamp timestamptz default now(), production text
);
alter table public.clarion_safe enable row level security;
drop policy if exists cs_admin_read on public.clarion_safe;
create policy cs_admin_read on public.clarion_safe for select using (public.is_admin());
drop policy if exists cs_any_insert on public.clarion_safe;
create policy cs_any_insert on public.clarion_safe for insert to authenticated with check (auth.uid() is not null);

create table if not exists public.invoices(
  id uuid primary key default gen_random_uuid(), production text, period_start timestamptz, period_end timestamptz, total numeric, created_at timestamptz default now(), created_by uuid default auth.uid()
);
alter table public.invoices enable row level security;
drop policy if exists invoices_admin_all on public.invoices;
create policy invoices_admin_all on public.invoices for all using (public.is_admin()) with check (public.is_admin());

do $$
declare t text; begin
  select data_type into t from information_schema.columns where table_schema='public' and table_name='hours' and column_name='id' limit 1;
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='invoice_lines') then
    if t='uuid' then execute 'create table public.invoice_lines (id uuid primary key default gen_random_uuid(), invoice_id uuid, hour_id uuid, description text, amount numeric)';
    else execute 'create table public.invoice_lines (id uuid primary key default gen_random_uuid(), invoice_id uuid, hour_id bigint, description text, amount numeric)';
    end if;
  else
    if t='uuid' then execute 'alter table public.invoice_lines alter column hour_id type uuid using hour_id::uuid';
    else execute 'alter table public.invoice_lines alter column hour_id type bigint using hour_id::bigint';
    end if;
  end if;
  begin execute 'alter table public.invoice_lines drop constraint if exists invoice_lines_invoice_id_fkey'; exception when others then null; end;
  begin execute 'alter table public.invoice_lines drop constraint if exists invoice_lines_hour_id_fkey'; exception when others then null; end;
  execute 'alter table public.invoice_lines add constraint invoice_lines_invoice_id_fkey foreign key (invoice_id) references public.invoices(id) on delete cascade';
  execute 'alter table public.invoice_lines add constraint invoice_lines_hour_id_fkey foreign key (hour_id) references public.hours(id) on delete set null';
end $$;
alter table public.invoice_lines enable row level security;
drop policy if exists inv_lines_admin_all on public.invoice_lines;
create policy inv_lines_admin_all on public.invoice_lines for all using (public.is_admin()) with check (public.is_admin());
