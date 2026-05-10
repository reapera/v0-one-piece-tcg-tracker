import { NextRequest, NextResponse } from 'next/server';
import { lookupCard } from '@/lib/optcg-api';

export async function GET(req: NextRequest) {
  const cardNumber = req.nextUrl.searchParams.get('card');
  if (!cardNumber) {
    return NextResponse.json({ error: 'Missing card parameter' }, { status: 400 });
  }
  const data = await lookupCard(cardNumber);
  return NextResponse.json(data);
}
