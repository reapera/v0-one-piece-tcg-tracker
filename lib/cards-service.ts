import { createClient } from '@supabase/supabase-js';
import { rowToCard, cardToRow, partialCardToRow, type CardRow } from './supabase';
import type { Card } from './types';

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export async function listCards(): Promise<Card[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as CardRow[]).map(rowToCard);
}

export async function insertCard(card: Omit<Card, 'id'>): Promise<Card> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('cards')
    .insert(cardToRow(card))
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToCard(data as CardRow);
}

export async function patchCard(id: string, updates: Partial<Omit<Card, 'id'>>): Promise<Card> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('cards')
    .update(partialCardToRow(updates))
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToCard(data as CardRow);
}

export async function findDuplicateCard(
  cardNumber: string,
  language: string,
  variant: string,
): Promise<Card | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('card_number', cardNumber.trim().toUpperCase())
    .eq('language', language)
    .eq('variant', variant)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToCard(data as CardRow) : null;
}

export async function bumpCardQuantity(
  id: string,
  existingQty: number,
  existingPrice: number,
  newPrice: number,
): Promise<Card> {
  const newQty = existingQty + 1;
  const avgPrice = Math.round(((existingPrice * existingQty + newPrice) / newQty) * 100) / 100;
  return patchCard(id, { quantity: newQty, buyPrice: avgPrice });
}

export async function removeCard(id: string): Promise<void> {
  const supabase = getServerSupabase();

  // Fetch image URL before deleting so we can clean up Storage
  const { data: row } = await supabase
    .from('cards')
    .select('image_url')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('cards').delete().eq('id', id);
  if (error) throw new Error(error.message);

  // Clean up Storage image if present
  if (row?.image_url) {
    const url = row.image_url as string;
    // Extract the path after the bucket name in the URL
    const match = url.match(/card-images\/(.+)$/);
    if (match) {
      await supabase.storage.from('card-images').remove([match[1]]);
    }
  }
}
