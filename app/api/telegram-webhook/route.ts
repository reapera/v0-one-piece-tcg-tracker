import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const NLP_PROMPT = `You are a One Piece TCG collection assistant. Parse the user's natural language message and extract card data to insert into a collection database.

Return ONLY a valid JSON object with no markdown, no explanation, no code blocks.

Schema (all fields optional unless noted):
- cardNumber: string (e.g. "OP01-001")
- cardName: string (official English name)
- category: one of "Leader" | "Character" | "Event" | "Stage" — default "Character"
- colors: array of one or more of "Red" | "Green" | "Blue" | "Purple" | "Black" | "Yellow" — default []
- rarity: one of "C" | "UC" | "R" | "SR" | "SEC" | "L" | "SP" | "Promo" — default "C"
- variant: one of "Standard" | "Alt Art" | "Manga Art" | "Parallel" | "Serial" — default "Standard"
- language: "EN" | "JP" — default "EN"
- quantity: integer — default 1
- condition: one of "Near Mint" | "Lightly Played" | "Moderately Played" | "Heavily Played" | "Damaged"
  Abbreviations: NM=Near Mint, LM=Near Mint, LP=Lightly Played, MP=Moderately Played, HP=Heavily Played, D=Damaged — default "Near Mint"
- buyPrice: number (0 if not mentioned) — default 0
- datePurchased: string in YYYY-MM-DD format — use today's date if not mentioned
- whereBought: string — default ""
- notes: string or null

User message: `;

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

  // Security: silently ignore messages from any chat ID other than the owner's
  const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (allowedChatId && String(chatId) !== allowedChatId) {
    return NextResponse.json({ ok: true });
  }

  const text = message.text?.trim();
  if (!text) {
    await sendTelegramMessage(
      chatId,
      'Send me a text message describing a card to add it to your collection.\n\nExample: "added luffy op01-001 near mint 2 copies"',
      botToken,
    );
    return NextResponse.json({ ok: true });
  }

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const today = new Date().toISOString().split('T')[0];
    const prompt = `${NLP_PROMPT}"${text}"\n\nToday's date is ${today}.`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let cardData: Record<string, unknown>;
    try {
      cardData = JSON.parse(cleaned);
    } catch {
      throw new Error(
        'Could not understand that message. Try: "added luffy op01-001 near mint 2 copies"',
      );
    }

    // Insert via the existing /api/cards route
    const baseUrl = new URL(req.url).origin;
    const cardRes = await fetch(`${baseUrl}/api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardData),
    });

    if (!cardRes.ok) {
      const err = await cardRes.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? `Card insert failed (${cardRes.status})`);
    }

    const saved = await cardRes.json() as {
      cardName?: string;
      cardNumber?: string;
      rarity?: string;
      condition?: string;
      quantity?: number;
      buyPrice?: number;
    };

    const conditionShort: Record<string, string> = {
      'Near Mint': 'NM',
      'Lightly Played': 'LP',
      'Moderately Played': 'MP',
      'Heavily Played': 'HP',
      'Damaged': 'D',
    };
    const cond = saved.condition ? (conditionShort[saved.condition] ?? saved.condition) : 'NM';

    const reply = [
      `✅ Added: ${saved.cardName ?? 'Unknown'} ${saved.cardNumber ?? ''}`.trimEnd(),
      `${saved.rarity ?? 'C'} · ${cond} · x${saved.quantity ?? 1}`,
      saved.buyPrice ? `💰 $${saved.buyPrice}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await sendTelegramMessage(chatId, reply, botToken);
  } catch (err) {
    console.error('[telegram-webhook] Error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await sendTelegramMessage(
      chatId,
      `❌ ${msg}\n\nExample: "added luffy op01-001 near mint 2 copies"`,
      botToken,
    );
  }

  return NextResponse.json({ ok: true });
}
