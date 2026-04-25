-- Allow DON!! as a valid category value
alter table public.cards
  drop constraint if exists cards_category_check;

alter table public.cards
  add constraint cards_category_check
    check (category in ('Leader', 'Character', 'Event', 'Stage', 'DON!!'));
