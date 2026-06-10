import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const PROMPT = `You are a One Piece TCG card scanner. Look at this card image carefully and extract the following fields. Return ONLY a valid JSON object with no markdown, no explanation, no code blocks. Fields: cardNumber (e.g. OP01-001), cardName (always translate to English, e.g. if the card is Japanese return the official English name), set (e.g. OP01, ST-01, EB04, P for promo), category (one of: Leader, Character, Event, Stage, DON!!), color (one or more of: Red, Green, Blue, Purple, Black, Yellow), cost (number or null), power (number or null), rarity (one of: C, UC, R, SR, SEC, L, SP, Promo), attribute (one of: Slash, Strike, Ranged, Special, Wisdom, or null), type (the affiliation text e.g. Straw Hat Pirates), effectText, language (EN or JP). If a field is not visible or not applicable return null.`;

export async function POST(req: NextRequest) {
  try {
    const { image, mimeType } = await req.json();

    if (!image || !mimeType) {
      return NextResponse.json({ error: 'Missing image or mimeType' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    const result = await model.generateContent([
      PROMPT,
      { inlineData: { data: image, mimeType } },
    ]);

    const raw = result.response.text().trim();
    console.log('[scan-card] Gemini raw response:', raw);

    // Strip markdown code fences if Gemini adds them despite instructions
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Gemini returned unparseable response:', raw);
      return NextResponse.json(
        { error: 'Gemini returned an unparseable response' },
        { status: 500 },
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('scan-card error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
