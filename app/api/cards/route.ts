import { NextRequest, NextResponse } from 'next/server';
import { listCards, insertCard } from '@/lib/cards-service';

export async function GET() {
  try {
    const cards = await listCards();
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
    const body = await req.json();
    const card = await insertCard(body);
    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
