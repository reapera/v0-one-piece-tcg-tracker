import { NextRequest, NextResponse } from 'next/server';
import { getDeckCards, upsertDeckCards } from '@/lib/decks-service';
import { lookupCard } from '@/lib/optcg-api';
import { getAuthContext } from '@/lib/supabase-server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const cards = await getDeckCards(id, ctx.client);
    return NextResponse.json({ cards });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// PUT body: { lines: string[] }  e.g. ["4xOP12-013", "1xOP12-020"]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const { lines } = await req.json() as { lines: string[] };

    const parsed: { cardNumber: string; quantity: number }[] = [];
    for (const raw of lines ?? []) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(/^(\d+)[xX\s]+([A-Za-z0-9]+-\d+)$/);
      if (!m) continue;
      parsed.push({ cardNumber: m[2].toUpperCase(), quantity: parseInt(m[1], 10) });
    }

    const enriched = await Promise.all(
      parsed.map(async ({ cardNumber, quantity }) => {
        const meta = await lookupCard(cardNumber);
        return {
          cardNumber,
          quantity,
          cardName: meta.cardName,
          cardImageUrl: meta.imageUrl,
          cardRarity: meta.rarity,
          cardColor: meta.color,
          cardType: meta.cardType,
        };
      }),
    );

    await upsertDeckCards(id, enriched, ctx.client);
    const cards = await getDeckCards(id, ctx.client);
    return NextResponse.json({ cards });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
