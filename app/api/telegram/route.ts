import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { insertCard } from '@/lib/cards-service';
import type { Card } from '@/lib/types';

const SCAN_PROMPT = `You are a One Piece TCG card scanner. Look at this card image carefully and extract the following fields. Return ONLY a valid JSON object with no markdown, no explanation, no code blocks. Fields: cardNumber (e.g. OP01-001), cardName (always translate to English, e.g. if the card is Japanese return the official English name), set (e.g. OP01, ST-01, EB04, P for promo), category (one of: Leader, Character, Event, Stage, DON!!), color (one or more of: Red, Green, Blue, Purple, Black, Yellow), cost (number or null), power (number or null), rarity (one of: C, UC, R, SR, SEC, L, SP, Promo), attribute (one of: Slash, Strike, Ranged, Special, Wisdom, or null), type (the affiliation text e.g. Straw Hat Pirates), effectText, language (EN or JP). If a field is not visible or not applicable return null.`;

// Parse caption for user-supplied fields.
// Expected format (any order, all optional):
//   price: 50000
//   condition: NM
//   qty: 2
//   where: Local Shop
//   date: 2024-01-15
function parseCaption(caption: string): Partial<Omit<Card, 'id'>> {
  const lines = caption.split('\n');
  const result: Partial<Omit<Card, 'id'>> = {};

  const conditionMap: Record<string, Card['condition']> = {
    nm: 'Near Mint',
    lp: 'Lightly Played',
    mp: 'Moderately Played',
    hp: 'Heavily Played',
    d: 'Damaged',
    'near mint': 'Near Mint',
    'lightly played': 'Lightly Played',
    'moderately played': 'Moderately Played',
    'heavily played': 'Heavily Played',
    damaged: 'Damaged',
  };

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(':');
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const val = rest.join(':').trim();

    if ((key === 'price' || key === 'buy_price') && val) {
      result.buyPrice = Number(val.replace(/[^0-9.]/g, ''));
    } else if (key === 'condition' && val) {
      result.condition = conditionMap[val.toLowerCase()] ?? ('Near Mint' as Card['condition']);
    } else if ((key === 'qty' || key === 'quantity') && val) {
      result.quantity = parseInt(val, 10);
    } else if ((key === 'where' || key === 'where_bought') && val) {
      result.whereBought = val;
    } else if ((key === 'date' || key === 'date_purchased') && val) {
      result.datePurchased = val;
    }
  }

  return result;
}

async function sendTelegramMessage(chatId: number, text: string, token: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 });
  }

  let update: {
    message?: {
      chat: { id: number };
      photo?: { file_id: string; file_size?: number }[];
      caption?: string;
      text?: string;
    };
  };

  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true }); // Ignore malformed updates
  }

  const message = update.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;

  // Only process messages with photos
  if (!message.photo || message.photo.length === 0) {
    await sendTelegramMessage(chatId, 'Send me a photo of a card to add it to your collection. You can add a caption with:\nprice: 50000\ncondition: NM\nqty: 1\nwhere: Local Shop', botToken);
    return NextResponse.json({ ok: true });
  }

  // Get the largest photo (last in array)
  const photo = message.photo[message.photo.length - 1];

  try {
    // 1. Get file path from Telegram
    const fileRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${photo.file_id}`,
    );
    const fileData = await fileRes.json() as { ok: boolean; result: { file_path: string } };
    if (!fileData.ok) throw new Error('Failed to get file info from Telegram');

    // 2. Download the photo as buffer
    const photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
    const photoRes = await fetch(photoUrl);
    if (!photoRes.ok) throw new Error('Failed to download photo from Telegram');

    const photoBuffer = await photoRes.arrayBuffer();
    const base64Image = Buffer.from(photoBuffer).toString('base64');
    const mimeType = 'image/jpeg';

    // 3. Scan with Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      SCAN_PROMPT,
      { inlineData: { data: base64Image, mimeType } },
    ]);

    const raw = result.response.text().trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let scanned: Record<string, unknown>;
    try {
      scanned = JSON.parse(cleaned);
    } catch {
      throw new Error('Gemini returned unparseable response');
    }

    // 4. Parse caption fields
    const captionFields = message.caption ? parseCaption(message.caption) : {};

    // 5. Build card — scanned data fills card details, caption fills pricing/condition
    const today = new Date().toISOString().split('T')[0];
    const card: Omit<Card, 'id'> = {
      cardNumber: (scanned.cardNumber as string) ?? '',
      cardName: (scanned.cardName as string) ?? '',
      category: (scanned.category as Card['category']) ?? 'Character',
      colors: (scanned.color as Card['colors']) ?? [],
      rarity: (scanned.rarity as Card['rarity']) ?? 'C',
      variant: 'Standard',
      language: (scanned.language as Card['language']) ?? 'JP',
      quantity: captionFields.quantity ?? 1,
      condition: captionFields.condition ?? 'Near Mint',
      buyPrice: captionFields.buyPrice ?? 0,
      datePurchased: captionFields.datePurchased ?? today,
      whereBought: captionFields.whereBought ?? '',
    };

    // 6. Insert into DB
    const saved = await insertCard(card);

    const reply = [
      `✅ Card added to collection!`,
      `📋 ${saved.cardName} (${saved.cardNumber})`,
      `⭐ ${saved.rarity} · ${saved.condition}`,
      saved.buyPrice > 0 ? `💰 Rp${saved.buyPrice.toLocaleString('id-ID')}` : null,
    ].filter(Boolean).join('\n');

    await sendTelegramMessage(chatId, reply, botToken);
  } catch (err) {
    console.error('[telegram] Error:', err);
    await sendTelegramMessage(
      chatId,
      `❌ Failed to process card: ${err instanceof Error ? err.message : 'Unknown error'}`,
      botToken,
    );
  }

  return NextResponse.json({ ok: true });
}
