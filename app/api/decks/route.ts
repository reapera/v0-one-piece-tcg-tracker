import { NextRequest, NextResponse } from 'next/server';
import { listDecks, createDeck } from '@/lib/decks-service';

export async function GET() {
  try {
    const decks = await listDecks();
    return NextResponse.json({ decks });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const deck = await createDeck(name, description);
    return NextResponse.json({ deck }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
