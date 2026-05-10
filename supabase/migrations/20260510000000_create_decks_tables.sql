-- Deck list
create table if not exists public.decks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'My Deck',
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Cards in a deck (metadata cached from optcgapi.com)
create table if not exists public.deck_cards (
  id             uuid primary key default gen_random_uuid(),
  deck_id        uuid not null references public.decks(id) on delete cascade,
  card_number    text not null,
  quantity       integer not null default 1 check (quantity > 0),
  card_name      text,
  card_image_url text,
  card_rarity    text,
  card_color     text,
  card_type      text,
  created_at     timestamptz not null default now(),
  unique(deck_id, card_number)
);

create index if not exists deck_cards_deck_id_idx on public.deck_cards (deck_id);

-- Auto-bump updated_at on decks
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger decks_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();

-- RLS
alter table public.decks      enable row level security;
alter table public.deck_cards enable row level security;

create policy "anon select decks"      on public.decks      for select to anon using (true);
create policy "anon insert decks"      on public.decks      for insert to anon with check (true);
create policy "anon update decks"      on public.decks      for update to anon using (true);
create policy "anon delete decks"      on public.decks      for delete to anon using (true);

create policy "anon select deck_cards" on public.deck_cards for select to anon using (true);
create policy "anon insert deck_cards" on public.deck_cards for insert to anon with check (true);
create policy "anon update deck_cards" on public.deck_cards for update to anon using (true);
create policy "anon delete deck_cards" on public.deck_cards for delete to anon using (true);
