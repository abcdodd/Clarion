-- v58: About/Services/FAQ seeds (force content to TEXT; safe to re-run)
create table if not exists public.site_content (
  key         text primary key,
  content     text,
  published   boolean default true,
  updated_at  timestamptz default now()
);
alter table public.site_content
  add column if not exists content   text,
  add column if not exists published boolean default true,
  add column if not exists updated_at timestamptz default now();
do $$ begin begin alter table public.site_content alter column content type text using content::text; exception when others then null; end; end $$;
alter table public.site_content enable row level security;
drop policy if exists sc_select_public on public.site_content;
create policy sc_select_public on public.site_content for select to anon using (coalesce(published,true) = true);
drop policy if exists sc_select_auth on public.site_content;
create policy sc_select_auth on public.site_content for select to authenticated using (true);
drop policy if exists sc_upsert_auth on public.site_content;
create policy sc_upsert_auth on public.site_content for insert to authenticated with check (true);
drop policy if exists sc_update_auth on public.site_content;
create policy sc_update_auth on public.site_content for update to authenticated using (true) with check (true);
insert into public.site_content(key, content, published) values
('about_main_html','<h1>About Clarion</h1><div class="card"><p>Clarion Location Services provides trusted, trained Location Support Personnel (LSPs) across the GTHA.</p></div><div class="card" style="margin-top:1rem"><h3 style="margin-top:0">Coverage</h3><p>Greater Toronto & Hamilton Area (GTHA)</p><h3>Contact</h3><p>Phone: 647-219-6345<br/>Email: clarion.location.services@gmail.com</p></div>',true)
on conflict (key) do update set content=excluded.content, published=true, updated_at=now();
insert into public.site_content(key, content, published) values
('services_main_html','<h1>Services</h1><p>From road clearing to studio support, our trained LSPs keep production days running smoothly across the GTHA.</p>',true)
on conflict (key) do update set content=excluded.content, published=true, updated_at=now();
insert into public.site_content(key, content, published) values
('faq_main_html','<h1>FAQ</h1><div class="card"><details open><summary>Where do you operate?</summary><p>GTHA — Greater Toronto & Hamilton Area.</p></details></div>',true)
on conflict (key) do update set content=excluded.content, published=true, updated_at=now();
