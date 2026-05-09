import { NextRequest, NextResponse } from 'next/server';
import { getDeckCards, upsertDeckCards } from '@/lib/decks-service';
import { lookupCard } from '@/lib/optcg-api';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const cards = await getDeckCards(id);
    return NextResponse.json({ cards });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// PUT body: { lines: string[] }  e.g. ["4xOP12-013", "1xOP12-020"]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { lines } = await req.json() as { lines: string[] };

    // Parse lines like "4xOP12-013" or "4 OP12-013"
    const parsed: { cardNumber: string; quantity: number }[] = [];
    for (const raw of lines ?? []) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(/^(\d+)[xX\s]+([A-Za-z0-9]+-\d+)$/);
      if (!m) continue;
      parsed.push({ cardNumber: m[2].toUpperCase(), quantity: parseInt(m[1], 10) });
    }

    // Lookup metadata for each card in parallel (best-effort)
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

    await upsertDeckCards(id, enriched);
    const cards = await getDeckCards(id);
    return NextResponse.json({ cards });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
