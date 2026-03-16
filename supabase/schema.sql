-- Run this in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  kid_name text not null,
  day text not null check (day in ('Tuesday', 'Wednesday')),
  location text not null,
  needs_pickup boolean not null default true,
  needs_dropoff boolean not null default true,
  pickup_parent_name text,
  dropoff_parent_name text,
  created_at timestamptz not null default now()
);

create index if not exists ride_requests_created_at_idx
  on public.ride_requests (created_at desc);

-- Migration safety if you previously used the authenticated version.
alter table public.ride_requests
  drop constraint if exists ride_requests_created_by_user_id_fkey;
alter table public.ride_requests
  drop column if exists created_by_user_id;

alter table public.ride_requests enable row level security;

-- Public board access for parents without login.
drop policy if exists "ride_requests_select_public" on public.ride_requests;
create policy "ride_requests_select_public"
  on public.ride_requests
  for select
  to anon, authenticated
  using (true);

drop policy if exists "ride_requests_insert_public" on public.ride_requests;
create policy "ride_requests_insert_public"
  on public.ride_requests
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "ride_requests_update_public" on public.ride_requests;
create policy "ride_requests_update_public"
  on public.ride_requests
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "ride_requests_delete_public" on public.ride_requests;
create policy "ride_requests_delete_public"
  on public.ride_requests
  for delete
  to anon, authenticated
  using (true);
