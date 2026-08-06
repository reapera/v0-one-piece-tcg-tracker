-- Migration: add multi-user auth support
-- Adds user_id to cards, sells, decks and updates RLS policies.
-- Run this in the Supabase SQL editor after enabling Email auth in the dashboard.

-- ── 1. Enable RLS on cards and sells (not yet enabled) ───────────────────────
alter table public.cards enable row level security;
alter table public.sells enable row level security;

-- ── 2. Add user_id columns ────────────────────────────────────────────────────
alter table public.cards
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.sells
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.decks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- ── 3. Cards RLS ──────────────────────────────────────────────────────────────
-- Anon (guest): read all cards (no login required to browse)
-- Authenticated: read only own cards; insert/update/delete only own cards

create policy "anon read all cards"
  on public.cards for select to anon
  using (true);

create policy "auth read own cards"
  on public.cards for select to authenticated
  using (auth.uid() = user_id);

create policy "auth insert cards"
  on public.cards for insert to authenticated
  with check (auth.uid() = user_id);

create policy "auth update cards"
  on public.cards for update to authenticated
  using (auth.uid() = user_id);

create policy "auth delete cards"
  on public.cards for delete to authenticated
  using (auth.uid() = user_id);

-- ── 4. Sells RLS ──────────────────────────────────────────────────────────────
-- Only authenticated users can view/create their own sell records

create policy "auth read own sells"
  on public.sells for select to authenticated
  using (auth.uid() = user_id);

create policy "auth insert sells"
  on public.sells for insert to authenticated
  with check (auth.uid() = user_id);

-- ── 5. Decks RLS ─────────────────────────────────────────────────────────────
-- Drop old open-access anon policies
drop policy if exists "anon select decks"      on public.decks;
drop policy if exists "anon insert decks"      on public.decks;
drop policy if exists "anon update decks"      on public.decks;
drop policy if exists "anon delete decks"      on public.decks;

drop policy if exists "anon select deck_cards" on public.deck_cards;
drop policy if exists "anon insert deck_cards" on public.deck_cards;
drop policy if exists "anon update deck_cards" on public.deck_cards;
drop policy if exists "anon delete deck_cards" on public.deck_cards;

-- Only authenticated users can manage their own decks
create policy "auth read own decks"
  on public.decks for select to authenticated
  using (auth.uid() = user_id);

create policy "auth insert decks"
  on public.decks for insert to authenticated
  with check (auth.uid() = user_id);

create policy "auth update decks"
  on public.decks for update to authenticated
  using (auth.uid() = user_id);

create policy "auth delete decks"
  on public.decks for delete to authenticated
  using (auth.uid() = user_id);

-- deck_cards inherits access from parent deck ownership
create policy "auth read own deck_cards"
  on public.deck_cards for select to authenticated
  using (deck_id in (select id from public.decks where user_id = auth.uid()));

create policy "auth insert deck_cards"
  on public.deck_cards for insert to authenticated
  with check (deck_id in (select id from public.decks where user_id = auth.uid()));

create policy "auth update deck_cards"
  on public.deck_cards for update to authenticated
  using (deck_id in (select id from public.decks where user_id = auth.uid()));

create policy "auth delete deck_cards"
  on public.deck_cards for delete to authenticated
  using (deck_id in (select id from public.decks where user_id = auth.uid()));

-- ── 6. Indexes ────────────────────────────────────────────────────────────────
create index if not exists cards_user_id_idx  on public.cards (user_id);
create index if not exists sells_user_id_idx  on public.sells (user_id);
create index if not exists decks_user_id_idx  on public.decks (user_id);

-- ── 7. MANUAL STEP (run separately after registering your first account) ──────
-- After you sign up, replace <your-user-uuid> with your actual UUID from
-- Supabase Dashboard → Authentication → Users, then run:
--
--   UPDATE public.cards SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;
--   UPDATE public.sells SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;
--
-- This claims all existing cards/sells for your account.
