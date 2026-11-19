-- Run in the Supabase SQL Editor.
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  lyrics text not null,
  language text default 'Malayalam (transliterated)',
  position integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.songs enable row level security;

create policy "Anyone can read published songs" on public.songs
for select using (published = true);

create policy "Authenticated admin can insert songs" on public.songs
for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Authenticated admin can update songs" on public.songs
for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Authenticated admin can delete songs" on public.songs
for delete to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'admin');

alter publication supabase_realtime add table public.songs;
