import { NextRequest, NextResponse } from 'next/server';
import { findDuplicateCard } from '@/lib/cards-service';

/**
 * GET /api/cards/duplicate?cardNumber=OP01-001&language=EN&variant=Standard
 *
 * Returns { duplicate: Card } if a card with the same cardNumber + language + variant
 * already exists, or { duplicate: null } if it does not.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cardNumber = searchParams.get('cardNumber');
    const language = searchParams.get('language');
    const variant = searchParams.get('variant');

    if (!cardNumber || !language || !variant) {
      return NextResponse.json(
        { error: 'cardNumber, language, and variant are required' },
        { status: 400 },
      );
    }

    const duplicate = await findDuplicateCard(cardNumber, language, variant);
    return NextResponse.json({ duplicate });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
