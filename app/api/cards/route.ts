import { NextRequest, NextResponse } from 'next/server';
import { listCards, insertCard, findDuplicateCard, bumpCardQuantity } from '@/lib/cards-service';
import { getAuthContext, createAnonClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    // Auth users see own cards via RLS; guests use anon client and see all
    const client = ctx ? ctx.client : createAnonClient();
    const cards = await listCards(client);
    return NextResponse.json(cards);
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
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();

    const duplicate = await findDuplicateCard(body.cardNumber, body.language, body.variant, ctx.client);
    if (duplicate) {
      const bumped = await bumpCardQuantity(
        duplicate.id,
        duplicate.quantity,
        duplicate.buyPrice,
        body.buyPrice ?? 0,
        body.quantity ?? 1,
        ctx.client,
      );
      return NextResponse.json(bumped, { status: 200 });
    }

    const card = await insertCard(body, ctx.userId, ctx.client);
    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
