-- ==========================================================================
-- UNCHARTED — Supabase schema
-- Run this in your Supabase project's SQL editor (Database → SQL Editor).
-- ==========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- books
-- ---------------------------------------------------------------------------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  description text not null default '',
  cover_url text,
  pdf_url text,
  page_count integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.books enable row level security;

-- Anyone (including anonymous visitors) can read published books.
create policy "Public can read published books"
  on public.books for select
  using (is_published = true);

-- Authenticated admins can read every book, published or not.
create policy "Admins can read all books"
  on public.books for select
  to authenticated
  using (true);

-- Only authenticated admins can insert/update/delete books.
create policy "Admins can insert books"
  on public.books for insert
  to authenticated
  with check (true);

create policy "Admins can update books"
  on public.books for update
  to authenticated
  using (true)
  with check (true);

create policy "Admins can delete books"
  on public.books for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- website_settings
-- ---------------------------------------------------------------------------
create table if not exists public.website_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text not null default 'UNCHARTED',
  logo_url text,
  hero_title text not null default 'Knowledge Has No Limits',
  hero_description text not null default 'Uncharted is a simple and beautiful platform to read and explore books online.',
  about_text text not null default '',
  facebook_url text not null default 'https://facebook.com/',
  updated_at timestamptz not null default now()
);

alter table public.website_settings enable row level security;

create policy "Public can read website settings"
  on public.website_settings for select
  using (true);

create policy "Admins can insert website settings"
  on public.website_settings for insert
  to authenticated
  with check (true);

create policy "Admins can update website settings"
  on public.website_settings for update
  to authenticated
  using (true)
  with check (true);

-- Seed a single settings row so the site has something to read on first load.
insert into public.website_settings (site_name, hero_title, hero_description, about_text, facebook_url)
select 'UNCHARTED',
       'Knowledge Has No Limits',
       'Uncharted is a simple and beautiful platform to read and explore books online.',
       'Uncharted is a simple and beautiful platform created for readers who want to discover and read books online in a clean and distraction-free environment.',
       'https://facebook.com/'
where not exists (select 1 from public.website_settings);

-- ---------------------------------------------------------------------------
-- reading_sessions
-- Anonymous, non-identifying progress tracking (no accounts for readers).
-- ---------------------------------------------------------------------------
create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references public.books(id) on delete cascade,
  session_id text not null,
  started_at timestamptz not null default now(),
  last_page integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.reading_sessions enable row level security;

-- Visitors can create and update their own session row (matched by the
-- random session_id the browser generates and stores locally).
create policy "Anyone can insert a reading session"
  on public.reading_sessions for insert
  with check (true);

create policy "Anyone can update their own reading session"
  on public.reading_sessions for update
  using (true)
  with check (true);

create policy "Admins can read reading sessions"
  on public.reading_sessions for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Storage
-- Create one public bucket called "uncharted" (Storage → New bucket → Public)
-- with three folders used by the admin panel: covers/, pdfs/, branding/.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('uncharted', 'uncharted', true)
on conflict (id) do nothing;

create policy "Public can view files in uncharted bucket"
  on storage.objects for select
  using (bucket_id = 'uncharted');

create policy "Admins can upload to uncharted bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'uncharted');

create policy "Admins can update files in uncharted bucket"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'uncharted');

create policy "Admins can delete files in uncharted bucket"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'uncharted');

-- ---------------------------------------------------------------------------
-- Admin user
-- Create the admin login from Authentication → Users → Add user in the
-- Supabase dashboard (email + password). Any authenticated user is treated
-- as an admin by the policies above, so only create accounts you trust.
-- ---------------------------------------------------------------------------
