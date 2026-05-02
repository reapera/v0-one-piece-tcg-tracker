import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { insertSell, listSells } from '@/lib/sells-service';
import { rowToCard, type CardRow } from '@/lib/supabase';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function GET() {
  try {
    const sells = await listSells();
    return NextResponse.json({ sells });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { cardId, quantitySold, sellPrice, notes } = await req.json();

    if (!cardId || !quantitySold || sellPrice == null) {
      return NextResponse.json({ error: 'cardId, quantitySold, and sellPrice are required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch card for validation and buy_price snapshot
    const { data: cardRow, error: cardErr } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (cardErr || !cardRow) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const card = rowToCard(cardRow as CardRow);

    if (quantitySold > card.quantity) {
      return NextResponse.json(
        { error: `Cannot sell ${quantitySold} — only ${card.quantity} in stock` },
        { status: 400 },
      );
    }

    // Record the sale
    const sell = await insertSell({
      cardId: card.id,
      cardNumber: card.cardNumber,
      cardName: card.cardName,
      quantitySold,
      sellPrice,
      buyPriceSnapshot: card.buyPrice,
      notes,
    });

    // Reduce card quantity (keep card even at 0)
    const newQty = card.quantity - quantitySold;
    const { data: updatedRow, error: updateErr } = await supabase
      .from('cards')
      .update({ quantity: newQty })
      .eq('id', cardId)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({ sell, card: rowToCard(updatedRow as CardRow) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
