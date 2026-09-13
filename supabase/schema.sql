-- Field Ledger — Supabase schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------

create sequence if not exists customer_seq start 1;

create table if not exists customers (
  id               text primary key,
  name             text not null,
  mobile           text not null,
  address          text not null,
  id_proof_type    text not null default '',
  id_proof_path    text not null default '',   -- path inside the id-proofs storage bucket
  id_proof_file_name text not null default '',
  created_at       timestamptz not null default now()
);

create table if not exists leads (
  lead_id            text primary key,
  customer_id        text references customers(id) on delete set null,
  fe_username        text not null,
  fe_name            text not null,
  visit_date         timestamptz not null default now(),
  device_brand       text not null,
  device_model       text not null,
  expected_price     numeric not null default 0,
  purchase_price     numeric not null default 0,
  commission         numeric not null default 0,
  commission_amount  numeric not null default 0,
  status             text not null default 'Pending',
  remarks            text not null default '',
  created_at         timestamptz not null default now()
);

create table if not exists field_executives (
  username      text primary key,
  name          text not null,
  password_hash text not null,
  active        boolean not null default true
);

create table if not exists admin_users (
  username      text primary key,
  password_hash text not null
);

-- ------------------------------------------------------------------
-- Seed data — CHANGE THESE PASSWORDS after your first login.
-- Same demo logins as the prototype: field executives use
-- firstname123, admin uses admin123.
-- ------------------------------------------------------------------

insert into admin_users (username, password_hash) values
  ('admin', crypt('admin123', gen_salt('bf')))
on conflict (username) do nothing;

insert into field_executives (username, name, password_hash, active) values
  ('sangewar',    'Sangewar',    crypt('sangewar123', gen_salt('bf')), true),
  ('dnyaneshwar', 'Dnyaneshwar', crypt('dnyaneshwar123', gen_salt('bf')), true),
  ('harish',      'Harish',      crypt('harish123', gen_salt('bf')), true),
  ('ajit',        'Ajit',        crypt('ajit123', gen_salt('bf')), true)
on conflict (username) do nothing;

-- ------------------------------------------------------------------
-- RPCs — all password handling happens here, server-side. The
-- browser only ever sends a plaintext password over HTTPS and
-- receives back a yes/no; password_hash never reaches the client.
-- ------------------------------------------------------------------

create or replace function public.next_customer_seq()
returns integer
language sql
security definer
set search_path = public, extensions
as $$
  select nextval('customer_seq')::integer;
$$;

create or replace function public.verify_admin_login(p_username text, p_password text)
returns table(username text)
language sql
security definer
set search_path = public, extensions
as $$
  select username from admin_users
  where username = p_username
    and password_hash = crypt(p_password, password_hash);
$$;

create or replace function public.verify_fe_login(p_username text, p_password text)
returns table(username text, name text)
language sql
security definer
set search_path = public, extensions
as $$
  select username, name from field_executives
  where username = p_username
    and active = true
    and password_hash = crypt(p_password, password_hash);
$$;

create or replace function public.add_field_executive(p_username text, p_name text, p_password text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  insert into field_executives (username, name, password_hash, active)
  values (p_username, p_name, crypt(p_password, gen_salt('bf')), true);
$$;

create or replace function public.update_fe_name(p_username text, p_name text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update field_executives set name = p_name where username = p_username;
$$;

create or replace function public.set_fe_password(p_username text, p_password text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update field_executives set password_hash = crypt(p_password, gen_salt('bf')) where username = p_username;
$$;

create or replace function public.set_fe_active(p_username text, p_active boolean)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update field_executives set active = p_active where username = p_username;
$$;

grant execute on function public.next_customer_seq() to anon, authenticated;
grant execute on function public.verify_admin_login(text, text) to anon, authenticated;
grant execute on function public.verify_fe_login(text, text) to anon, authenticated;
grant execute on function public.add_field_executive(text, text, text) to anon, authenticated;
grant execute on function public.update_fe_name(text, text) to anon, authenticated;
grant execute on function public.set_fe_password(text, text) to anon, authenticated;
grant execute on function public.set_fe_active(text, boolean) to anon, authenticated;

-- ------------------------------------------------------------------
-- Row level security
-- ------------------------------------------------------------------

alter table customers enable row level security;
alter table leads enable row level security;
alter table field_executives enable row level security;
alter table admin_users enable row level security;

-- Customers & leads: open to the app for now (see README security note —
-- there is no per-user Supabase Auth session yet, so this is equivalent
-- to "anyone with the published app URL can read/write leads data").
create policy "customers full access" on customers for all using (true) with check (true);
create policy "leads full access" on leads for all using (true) with check (true);

-- Field executives: only username/name/active are ever readable by the
-- app, and only via the login dropdown / admin screens. All writes go
-- through the RPCs above, which run as the table owner and bypass RLS.
create policy "fe directory read" on field_executives for select using (true);
revoke select on field_executives from anon, authenticated;
grant select (username, name, active) on field_executives to anon, authenticated;

-- Admin users: no direct client access at all. Only verify_admin_login
-- (SECURITY DEFINER) can read this table.
revoke all on admin_users from anon, authenticated;

-- ------------------------------------------------------------------
-- Storage bucket for uploaded ID proof images (private)
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('id-proofs', 'id-proofs', false)
on conflict (id) do nothing;

create policy "id proofs read" on storage.objects
  for select using (bucket_id = 'id-proofs');
create policy "id proofs insert" on storage.objects
  for insert with check (bucket_id = 'id-proofs');
create policy "id proofs update" on storage.objects
  for update using (bucket_id = 'id-proofs');
