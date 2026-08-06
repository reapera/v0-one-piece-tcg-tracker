import { NextRequest, NextResponse } from 'next/server';
import { listCards, insertCard } from '@/lib/cards-service';
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
    const card = await insertCard(body, ctx.userId, ctx.client);
    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
