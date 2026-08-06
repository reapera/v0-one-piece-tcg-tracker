import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface Deck {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  cardCount?: number;
}

export interface DeckCard {
  id: string;
  deckId: string;
  cardNumber: string;
  quantity: number;
  cardName: string | null;
  cardImageUrl: string | null;
  cardRarity: string | null;
  cardColor: string | null;
  cardType: string | null;
  owned: number;
}

interface DeckRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  card_count?: number;
}

interface DeckCardRow {
  id: string;
  deck_id: string;
  card_number: string;
  quantity: number;
  card_name: string | null;
  card_image_url: string | null;
  card_rarity: string | null;
  card_color: string | null;
  card_type: string | null;
}

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

function rowToDeck(row: DeckRow): Deck {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cardCount: row.card_count,
  };
}

function rowToDeckCard(row: DeckCardRow, owned = 0): DeckCard {
  return {
    id: row.id,
    deckId: row.deck_id,
    cardNumber: row.card_number,
    quantity: row.quantity,
    cardName: row.card_name,
    cardImageUrl: row.card_image_url,
    cardRarity: row.card_rarity,
    cardColor: row.card_color,
    cardType: row.card_type,
    owned,
  };
}

export async function listDecks(supabase: SupabaseClient = getSupabase()): Promise<Deck[]> {
  const { data, error } = await supabase
    .from('decks')
    .select('*, deck_cards(count)')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: DeckRow & { deck_cards: [{ count: number }] }) =>
    rowToDeck({ ...row, card_count: row.deck_cards?.[0]?.count ?? 0 }),
  );
}

export async function createDeck(
  name: string,
  userId: string,
  description?: string,
  supabase: SupabaseClient = getSupabase(),
): Promise<Deck> {
  const { data, error } = await supabase
    .from('decks')
    .insert({ name, description: description ?? null, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToDeck(data as DeckRow);
}

export async function getDeck(id: string, supabase: SupabaseClient = getSupabase()): Promise<Deck | null> {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return rowToDeck(data as DeckRow);
}

export async function updateDeck(
  id: string,
  updates: { name?: string; description?: string },
  supabase: SupabaseClient = getSupabase(),
): Promise<Deck> {
  const { data, error } = await supabase
    .from('decks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToDeck(data as DeckRow);
}

export async function deleteDeck(id: string, supabase: SupabaseClient = getSupabase()): Promise<void> {
  const { error } = await supabase.from('decks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getDeckCards(deckId: string, supabase: SupabaseClient = getSupabase()): Promise<DeckCard[]> {

  const { data: deckCardRows, error } = await supabase
    .from('deck_cards')
    .select('*')
    .eq('deck_id', deckId);
  if (error) throw new Error(error.message);

  const cardNumbers = (deckCardRows ?? []).map((r: DeckCardRow) => r.card_number);

  const anonClient = getSupabase();
  const { data: collectionRows } = await anonClient
    .from('cards')
    .select('card_number, quantity')
    .in('card_number', cardNumbers.length ? cardNumbers : ['__none__']);

  const ownedMap = new Map<string, number>();
  for (const row of collectionRows ?? []) {
    ownedMap.set(row.card_number, (ownedMap.get(row.card_number) ?? 0) + row.quantity);
  }

  return (deckCardRows ?? []).map((row: DeckCardRow) =>
    rowToDeckCard(row, ownedMap.get(row.card_number) ?? 0),
  );
}

export async function upsertDeckCards(
  deckId: string,
  cards: Array<{
    cardNumber: string;
    quantity: number;
    cardName: string | null;
    cardImageUrl: string | null;
    cardRarity: string | null;
    cardColor: string | null;
    cardType: string | null;
  }>,
  supabase: SupabaseClient = getSupabase(),
): Promise<void> {

  if (cards.length === 0) {
    await supabase.from('deck_cards').delete().eq('deck_id', deckId);
    return;
  }

  const rows = cards.map((c) => ({
    deck_id: deckId,
    card_number: c.cardNumber,
    quantity: c.quantity,
    card_name: c.cardName,
    card_image_url: c.cardImageUrl,
    card_rarity: c.cardRarity,
    card_color: c.cardColor,
    card_type: c.cardType,
  }));

  const { error: upsertErr } = await supabase
    .from('deck_cards')
    .upsert(rows, { onConflict: 'deck_id,card_number' });
  if (upsertErr) throw new Error(upsertErr.message);

  // Remove cards no longer in the list
  const newNumbers = cards.map((c) => c.cardNumber);
  const { error: deleteErr } = await supabase
    .from('deck_cards')
    .delete()
    .eq('deck_id', deckId)
    .not('card_number', 'in', `(${newNumbers.map((n) => `"${n}"`).join(',')})`);
  if (deleteErr) throw new Error(deleteErr.message);
}
