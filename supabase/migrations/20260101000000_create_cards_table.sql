-- Migration: create cards table
-- One Piece TCG Collection Tracker

create table if not exists public.cards (
  id            uuid primary key default gen_random_uuid(),
  card_number   text        not null,
  card_name     text        not null,
  category      text        not null check (category in ('Leader', 'Character', 'Event', 'Stage')),
  colors        text[]      not null default '{}',
  rarity        text        not null check (rarity in ('C', 'UC', 'R', 'SR', 'SEC', 'L', 'SP', 'Promo')),
  variant       text        not null check (variant in ('Standard', 'Alt Art', 'Manga Art', 'Parallel', 'Serial')),
  language      text        not null check (language in ('EN', 'JP')),
  quantity      integer     not null default 1 check (quantity >= 0),
  condition     text        not null check (condition in ('Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged')),
  buy_price     numeric     not null default 0,
  date_purchased text       not null default '',
  where_bought  text        not null default '',
  psa_grade     integer     check (psa_grade between 1 and 10),
  notes         text,
  image_url     text,
  created_at    timestamptz not null default now()
);

-- Index for common filter/search operations
create index if not exists cards_card_name_idx     on public.cards using gin (to_tsvector('english', card_name));
create index if not exists cards_card_number_idx   on public.cards (card_number);
create index if not exists cards_rarity_idx        on public.cards (rarity);
create index if not exists cards_category_idx      on public.cards (category);
create index if not exists cards_language_idx      on public.cards (language);
create index if not exists cards_condition_idx     on public.cards (condition);

-- Optional: enable Row Level Security (uncomment if you add Supabase Auth)
-- alter table public.cards enable row level security;
-- create policy "Users can manage their own cards"
--   on public.cards for all
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);
