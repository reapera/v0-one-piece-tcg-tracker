import { createClient } from '@supabase/supabase-js';

export interface Sell {
  id: string;
  cardId: string | null;
  cardNumber: string;
  cardName: string;
  quantitySold: number;
  sellPrice: number;
  buyPriceSnapshot: number;
  soldAt: string;
  notes?: string;
}

interface SellRow {
  id: string;
  card_id: string | null;
  card_number: string;
  card_name: string;
  quantity_sold: number;
  sell_price: number;
  buy_price_snapshot: number;
  sold_at: string;
  notes?: string;
}

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

function rowToSell(row: SellRow): Sell {
  return {
    id: row.id,
    cardId: row.card_id,
    cardNumber: row.card_number,
    cardName: row.card_name,
    quantitySold: row.quantity_sold,
    sellPrice: row.sell_price,
    buyPriceSnapshot: row.buy_price_snapshot,
    soldAt: row.sold_at,
    notes: row.notes,
  };
}

export async function listSells(): Promise<Sell[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('sells')
    .select('*')
    .order('sold_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as SellRow[]).map(rowToSell);
}

export async function insertSell(sell: Omit<Sell, 'id' | 'soldAt'>): Promise<Sell> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('sells')
    .insert({
      card_id: sell.cardId,
      card_number: sell.cardNumber,
      card_name: sell.cardName,
      quantity_sold: sell.quantitySold,
      sell_price: sell.sellPrice,
      buy_price_snapshot: sell.buyPriceSnapshot,
      notes: sell.notes,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToSell(data as SellRow);
}
