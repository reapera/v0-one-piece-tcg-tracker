import { NextRequest, NextResponse } from 'next/server';
import { insertSell, listSells } from '@/lib/sells-service';
import { rowToCard, type CardRow } from '@/lib/supabase';
import { getAuthContext } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const sells = await listSells(ctx.client);
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
    const ctx = await getAuthContext(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { cardId, quantitySold, sellPrice, notes } = await req.json();

    if (!cardId || !quantitySold || sellPrice == null) {
      return NextResponse.json(
        { error: 'cardId, quantitySold, and sellPrice are required' },
        { status: 400 },
      );
    }

    // Fetch card using auth client (RLS ensures it belongs to this user)
    const { data: cardRow, error: cardErr } = await ctx.client
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

    const sell = await insertSell(
      {
        cardId: card.id,
        cardNumber: card.cardNumber,
        cardName: card.cardName,
        quantitySold,
        sellPrice,
        buyPriceSnapshot: card.buyPrice,
        notes,
      },
      ctx.userId,
      ctx.client,
    );

    const newQty = card.quantity - quantitySold;
    const { data: updatedRow, error: updateErr } = await ctx.client
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
