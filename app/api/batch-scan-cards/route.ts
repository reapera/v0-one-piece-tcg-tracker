import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { insertCard, findDuplicateCard, patchCard } from '@/lib/cards-service';
import type { CardCategory, CardColor, CardRarity, CardLanguage } from '@/lib/types';

const SCAN_PROMPT = `You are a One Piece TCG card scanner. Look at this card image carefully and extract the following fields. Return ONLY a valid JSON object with no markdown, no explanation, no code blocks. Fields: cardNumber (e.g. OP01-001), cardName (always translate to English, e.g. if the card is Japanese return the official English name), set (e.g. OP01, ST-01, EB04, P for promo), category (one of: Leader, Character, Event, Stage, DON!!), color (one or more of: Red, Green, Blue, Purple, Black, Yellow), cost (number or null), power (number or null), rarity (one of: C, UC, R, SR, SEC, L, SP, Promo), attribute (one of: Slash, Strike, Ranged, Special, Wisdom, or null), type (the affiliation text e.g. Straw Hat Pirates), effectText, language (EN or JP). If a field is not visible or not applicable return null.`;

const VALID_CATEGORIES: CardCategory[] = ['Leader', 'Character', 'Event', 'Stage'];
const VALID_COLORS: CardColor[] = ['Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow'];
const VALID_RARITIES: CardRarity[] = ['C', 'UC', 'R', 'SR', 'SEC', 'L', 'SP', 'Promo'];
const VALID_LANGUAGES: CardLanguage[] = ['EN', 'JP'];

interface GeminiCardData {
  cardNumber?: string | null;
  cardName?: string | null;
  category?: string | null;
  color?: string | string[] | null;
  rarity?: string | null;
  language?: string | null;
}

function normalizeColors(color: string | string[] | null | undefined): CardColor[] {
  if (!color) return ['Red'];
  const arr = Array.isArray(color) ? color : [color];
  const valid = arr.filter((c): c is CardColor => VALID_COLORS.includes(c as CardColor));
  return valid.length > 0 ? valid : ['Red'];
}

function buildCardFromGemini(gemini: GeminiCardData, imageUrl?: string) {
  const today = new Date().toISOString().split('T')[0];

  return {
    cardNumber: gemini.cardNumber || 'Unknown',
    cardName: gemini.cardName || 'Unknown Card',
    category: (VALID_CATEGORIES.includes(gemini.category as CardCategory)
      ? gemini.category
      : 'Character') as CardCategory,
    colors: normalizeColors(gemini.color),
    rarity: (VALID_RARITIES.includes(gemini.rarity as CardRarity)
      ? gemini.rarity
      : 'C') as CardRarity,
    variant: 'Standard' as const,
    language: (VALID_LANGUAGES.includes(gemini.language as CardLanguage)
      ? gemini.language
      : 'EN') as CardLanguage,
    quantity: 1,
    condition: 'Near Mint' as const,
    buyPrice: 1,
    datePurchased: today,
    whereBought: '',
    ...(imageUrl ? { imageUrl } : {}),
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/batch-scan-cards
 *
 * Accepts an array of base64-encoded card images, scans each one sequentially
 * with Gemini, and immediately saves each result to the database with
 * quantity=1 and buy_price=1. Falls back to safe defaults if Gemini cannot
 * identify any field.
 *
 * Request body:
 * {
 *   "images": [
 *     { "image": "<base64 string>", "mimeType": "image/jpeg" },
 *     ...
 *   ]
 * }
 *
 * Response:
 * {
 *   "results": [
 *     {
 *       "index": 0,
 *       "status": "success" | "error",
 *       "card": { ...savedCard } | null,
 *       "geminiData": { ...rawGeminiFields } | null,
 *       "warning": "...",   // present only when Gemini parsing failed but defaults were used
 *       "error": "..."      // present only when status is "error"
 *     }
 *   ],
 *   "summary": { "total": 2, "succeeded": 2, "failed": 0 }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const images: { image: string; mimeType: string; imageUrl?: string }[] = body?.images;

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'images must be a non-empty array of { image: string, mimeType: string }' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const results = [];

    for (let i = 0; i < images.length; i++) {
      const { image, mimeType, imageUrl } = images[i] ?? {};

      if (!image || !mimeType) {
        results.push({ index: i, status: 'error', error: 'Missing image or mimeType', card: null, geminiData: null });
        continue;
      }

      let geminiData: GeminiCardData = {};
      let geminiWarning: string | null = null;

      // Step 1: scan with Gemini (non-fatal — fall back to defaults on any error)
      try {
        const result = await model.generateContent([
          SCAN_PROMPT,
          { inlineData: { data: image, mimeType } },
        ]);

        const raw = result.response.text().trim();
        console.log(`[batch-scan] index ${i} raw:`, raw);

        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

        try {
          geminiData = JSON.parse(cleaned) as GeminiCardData;
        } catch {
          geminiWarning = 'Gemini returned an unparseable response; defaults used';
          console.warn(`[batch-scan] index ${i} unparseable:`, raw);
        }
      } catch (err) {
        geminiWarning = `Gemini scan failed: ${err instanceof Error ? err.message : String(err)}`;
        console.warn(`[batch-scan] index ${i} Gemini error:`, err);
      }

      // Step 2: save or bump duplicate (fatal — report error if this fails)
      try {
        const cardData = buildCardFromGemini(geminiData, imageUrl);
        const duplicate = await findDuplicateCard(cardData.cardNumber, cardData.language, cardData.variant);

        if (duplicate) {
          // Duplicate found — bump quantity only, leave price unchanged
          // (batch scan defaults to price=1 which is not meaningful for averaging)
          const bumped = await patchCard(duplicate.id, { quantity: duplicate.quantity + 1 });
          const entry: Record<string, unknown> = {
            index: i,
            status: 'duplicate',
            card: bumped,
            geminiData,
            message: `Already in collection — quantity bumped to ${bumped.quantity}`,
          };
          if (geminiWarning) entry.warning = geminiWarning;
          results.push(entry);
        } else {
          const saved = await insertCard(cardData);
          const entry: Record<string, unknown> = { index: i, status: 'success', card: saved, geminiData };
          if (geminiWarning) entry.warning = geminiWarning;
          results.push(entry);
        }
      } catch (err) {
        results.push({
          index: i,
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to save card to database',
          card: null,
          geminiData,
        });
      }
    }

    const succeeded = results.filter(r => r.status === 'success').length;
    const duplicates = results.filter(r => r.status === 'duplicate').length;
    const failed = results.filter(r => r.status === 'error').length;

    return NextResponse.json(
      { results, summary: { total: images.length, succeeded, duplicates, failed } },
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    console.error('[batch-scan] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
