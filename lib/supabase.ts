import { createClient } from '@supabase/supabase-js';
import type { Card } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// DB row shape (snake_case) → TypeScript Card (camelCase)
export interface CardRow {
  id: string;
  card_number: string;
  card_name: string;
  category: string;
  colors: string[];
  rarity: string;
  variant: string;
  language: string;
  quantity: number;
  condition: string;
  buy_price: number;
  date_purchased: string;
  where_bought: string;
  psa_grade: number | null;
  notes: string | null;
  image_url: string | null;
  created_at: string;
}

export function rowToCard(row: CardRow): Card {
  return {
    id: row.id,
    cardNumber: row.card_number,
    cardName: row.card_name,
    category: row.category as Card['category'],
    colors: row.colors as Card['colors'],
    rarity: row.rarity as Card['rarity'],
    variant: row.variant as Card['variant'],
    language: row.language as Card['language'],
    quantity: row.quantity,
    condition: row.condition as Card['condition'],
    buyPrice: row.buy_price,
    datePurchased: row.date_purchased,
    whereBought: row.where_bought,
    psaGrade: row.psa_grade ?? undefined,
    notes: row.notes ?? undefined,
    imageUrl: row.image_url ?? undefined,
  };
}

export function cardToRow(card: Omit<Card, 'id'>): Omit<CardRow, 'id' | 'created_at'> {
  return {
    card_number: card.cardNumber,
    card_name: card.cardName,
    category: card.category,
    colors: card.colors,
    rarity: card.rarity,
    variant: card.variant,
    language: card.language,
    quantity: card.quantity,
    condition: card.condition,
    buy_price: card.buyPrice,
    date_purchased: card.datePurchased,
    where_bought: card.whereBought,
    psa_grade: card.psaGrade ?? null,
    notes: card.notes ?? null,
    image_url: card.imageUrl ?? null,
  };
}
