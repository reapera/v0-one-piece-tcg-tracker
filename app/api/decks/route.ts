import { NextRequest, NextResponse } from 'next/server';
import { listDecks, createDeck } from '@/lib/decks-service';
import { getAuthContext } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decks = await listDecks(ctx.client);
    return NextResponse.json({ decks });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { name, description } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const deck = await createDeck(name, ctx.userId, description, ctx.client);
    return NextResponse.json({ deck }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
