import { NextRequest, NextResponse } from 'next/server';
import { getDeck, updateDeck, deleteDeck } from '@/lib/decks-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deck = await getDeck(id);
  if (!deck) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ deck });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const updates = await req.json();
    const deck = await updateDeck(id, updates);
    return NextResponse.json({ deck });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteDeck(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
