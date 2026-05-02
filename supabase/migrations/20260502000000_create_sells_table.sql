-- Sell history table
create table if not exists public.sells (
  id                 uuid primary key default gen_random_uuid(),
  card_id            uuid references public.cards(id) on delete set null,
  card_number        text not null,
  card_name          text not null,
  quantity_sold      integer not null check (quantity_sold > 0),
  sell_price         numeric not null check (sell_price >= 0),
  buy_price_snapshot numeric not null,
  sold_at            timestamptz not null default now(),
  notes              text,
  created_at         timestamptz not null default now()
);

create index if not exists sells_card_id_idx on public.sells (card_id);
create index if not exists sells_sold_at_idx on public.sells (sold_at desc);
