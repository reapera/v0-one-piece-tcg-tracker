import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

const MAX_DIMENSION = 1200;
const MAX_BYTES = 200 * 1024;

async function compressImage(buffer: ArrayBuffer): Promise<{ base64: string; mimeType: string }> {
  let img = sharp(Buffer.from(buffer)).rotate(); // auto-rotate based on EXIF

  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    img = img.resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true });
  }

  let quality = 85;
  let output: Buffer;
  do {
    output = await img.jpeg({ quality }).toBuffer();
    if (output.byteLength <= MAX_BYTES) break;
    quality = Math.max(quality - 10, 10);
  } while (quality > 10);

  console.log(`[telegram-webhook] Compressed image: ${Math.round(output.byteLength / 1024)}KB, quality=${quality}`);
  return { base64: output.toString('base64'), mimeType: 'image/jpeg' };
}

const SCAN_PROMPT = `You are a One Piece TCG card scanner. Look at this card image carefully and extract the following fields. Return ONLY a valid JSON object with no markdown, no explanation, no code blocks. Fields: cardNumber (e.g. OP01-001), cardName (always translate to English, e.g. if the card is Japanese return the official English name), set (e.g. OP01, ST-01, EB04, P for promo), category (one of: Leader, Character, Event, Stage, DON!!), color (one or more of: Red, Green, Blue, Purple, Black, Yellow), cost (number or null), power (number or null), rarity (one of: C, UC, R, SR, SEC, L, SP, Promo), attribute (one of: Slash, Strike, Ranged, Special, Wisdom, or null), type (the affiliation text e.g. Straw Hat Pirates), effectText, language (EN or JP). If a field is not visible or not applicable return null.`;

// Only extract supplementary purchase/condition fields — NOT card identity
const EXTRA_PROMPT = `You are parsing a short note about a card purchase. Extract ONLY these fields and return a valid JSON object with no markdown.

Fields (all optional):
- condition: one of "Near Mint" | "Lightly Played" | "Moderately Played" | "Heavily Played" | "Damaged". Abbreviations: NM/LM=Near Mint, LP=Lightly Played, MP=Moderately Played, HP=Heavily Played, D=Damaged
- quantity: integer (number of copies)
- buyPrice: number (price paid)
- whereBought: string (shop or platform name)
- variant: one of "Standard" | "Alt Art" | "Manga Art" | "Parallel" | "Serial"
- language: "EN" | "JP"
- notes: string (anything else worth noting)
- datePurchased: string in YYYY-MM-DD format (only if explicitly mentioned)

Omit any field not mentioned. Do not infer card identity (name, number, rarity) from this text.

Message: `;

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

function parseJson(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
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
      caption?: string;
      photo?: { file_id: string; file_size?: number }[];
    };
  };

  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;

  const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (allowedChatId && String(chatId) !== allowedChatId) {
    return NextResponse.json({ ok: true });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    await sendTelegramMessage(chatId, '❌ GEMINI_API_KEY not configured', botToken);
    return NextResponse.json({ ok: true });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    let cardData: Record<string, unknown>;

    if (message.photo && message.photo.length > 0) {
      // ── Photo path: scan image with Gemini, parse caption for extras ──

      // Pick the largest available photo
      const photo = message.photo[message.photo.length - 1];

      // Resolve Telegram file path
      const fileRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${photo.file_id}`,
      );
      const fileData = (await fileRes.json()) as { result: { file_path: string } };
      const filePath = fileData.result?.file_path;
      if (!filePath) throw new Error('Could not retrieve photo from Telegram');

      // Download the image
      const imgRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
      if (!imgRes.ok) throw new Error('Failed to download photo from Telegram');
      const imgBuffer = await imgRes.arrayBuffer();
      console.log(`[telegram-webhook] Downloaded image: filePath=${filePath}, size=${Math.round(imgBuffer.byteLength / 1024)}KB`);

      // Compress to match webapp behaviour (max 1200px, max 200KB JPEG)
      const { base64: imgBase64, mimeType } = await compressImage(imgBuffer);

      // Scan the card image
      console.log('[telegram-webhook] Calling Gemini for image scan...');
      let scanResult;
      try {
        scanResult = await model.generateContent([
          SCAN_PROMPT,
          { inlineData: { data: imgBase64, mimeType } },
        ]);
      } catch (geminiErr) {
        const errMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
        console.error('[telegram-webhook] Gemini scan error:', errMsg);
        throw new Error(`Gemini scan failed: ${errMsg}`);
      }
      const scanRaw = scanResult.response.text().trim();
      console.log('[telegram-webhook] Gemini scan raw:', scanRaw);

      let scanData: Record<string, unknown>;
      try {
        scanData = parseJson(scanRaw);
      } catch {
        throw new Error('Could not read the card from the image. Try a clearer photo.');
      }

      // Map scan output to DB schema
      cardData = {
        cardNumber: scanData.cardNumber ?? null,
        cardName: scanData.cardName ?? null,
        category: scanData.category ?? 'Character',
        colors: Array.isArray(scanData.color) ? scanData.color : scanData.color ? [scanData.color] : [],
        cost: scanData.cost ?? null,
        power: scanData.power ?? null,
        rarity: scanData.rarity ?? 'C',
        attribute: scanData.attribute ?? null,
        type: scanData.type ?? null,
        effectText: scanData.effectText ?? null,
        language: scanData.language ?? 'EN',
        variant: 'Standard',
        quantity: 1,
        condition: 'Near Mint',
        buyPrice: 0,
        whereBought: '',
        notes: null,
        datePurchased: today,
      };

      // Parse caption for supplementary fields (condition, price, where bought, etc.)
      const caption = message.caption?.trim();
      if (caption) {
        console.log('[telegram-webhook] Calling Gemini for caption parse...');
        let extraResult;
        try {
          extraResult = await model.generateContent(
            `${EXTRA_PROMPT}"${caption}"\n\nToday's date is ${today}.`,
          );
        } catch (geminiErr) {
          const errMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
          console.error('[telegram-webhook] Gemini caption error:', errMsg);
          // Non-fatal — just log and skip caption parsing
          console.warn('[telegram-webhook] Skipping caption parse due to Gemini error');
          extraResult = null;
        }
        const extraRaw = extraResult?.response.text().trim() ?? '';
        console.log('[telegram-webhook] Gemini caption raw:', extraRaw);

        try {
          if (!extraRaw) throw new Error('No extraRaw to parse');
          const extra = parseJson(extraRaw);
          // Only override supplementary fields, never card identity
          if (extra.condition) cardData.condition = extra.condition;
          if (extra.quantity) cardData.quantity = extra.quantity;
          if (extra.buyPrice !== undefined) cardData.buyPrice = extra.buyPrice;
          if (extra.whereBought) cardData.whereBought = extra.whereBought;
          if (extra.variant) cardData.variant = extra.variant;
          if (extra.language) cardData.language = extra.language;
          if (extra.notes) cardData.notes = extra.notes;
          if (extra.datePurchased) cardData.datePurchased = extra.datePurchased;
        } catch {
          // Caption parse failed — ignore, proceed with scan data defaults
          console.warn('[telegram-webhook] Could not parse caption as extras, ignoring');
        }
      }
    } else if (message.text?.trim()) {
      // ── Text-only path: full NLP parse ──
      const text = message.text.trim();
      const prompt = `${NLP_PROMPT}"${text}"\n\nToday's date is ${today}.`;
      console.log('[telegram-webhook] Calling Gemini for NLP parse...');
      let result;
      try {
        result = await model.generateContent(prompt);
      } catch (geminiErr) {
        const errMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
        console.error('[telegram-webhook] Gemini NLP error:', errMsg);
        throw new Error(`Gemini NLP failed: ${errMsg}`);
      }
      const raw = result.response.text().trim();
      console.log('[telegram-webhook] Gemini NLP raw:', raw);

      try {
        cardData = parseJson(raw);
      } catch {
        throw new Error('Could not understand that message. Try sending a photo of the card instead.');
      }
    } else {
      // No photo, no text
      await sendTelegramMessage(
        chatId,
        'Send me a photo of a card to add it to your collection.\n\nYou can add a caption with extra details like condition, price, or where you bought it.\n\nExample caption: "NM, $5, bought at local game store"',
        botToken,
      );
      return NextResponse.json({ ok: true });
    }

    // Insert via the existing /api/cards route
    const baseUrl = new URL(req.url).origin;
    const cardRes = await fetch(`${baseUrl}/api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardData),
    });

    if (!cardRes.ok) {
      const err = (await cardRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `Card insert failed (${cardRes.status})`);
    }

    const saved = (await cardRes.json()) as {
      cardName?: string;
      cardNumber?: string;
      rarity?: string;
      condition?: string;
      quantity?: number;
      buyPrice?: number;
      whereBought?: string;
    };

    const conditionShort: Record<string, string> = {
      'Near Mint': 'NM',
      'Lightly Played': 'LP',
      'Moderately Played': 'MP',
      'Heavily Played': 'HP',
      Damaged: 'D',
    };
    const cond = saved.condition ? (conditionShort[saved.condition] ?? saved.condition) : 'NM';

    const reply = [
      `✅ Added: ${saved.cardName ?? 'Unknown'} ${saved.cardNumber ?? ''}`.trimEnd(),
      `${saved.rarity ?? 'C'} · ${cond} · x${saved.quantity ?? 1}`,
      saved.buyPrice ? `💰 $${saved.buyPrice}` : null,
      saved.whereBought ? `📍 ${saved.whereBought}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await sendTelegramMessage(chatId, reply, botToken);
  } catch (err) {
    console.error('[telegram-webhook] Error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error && err.stack ? `\n${err.stack.split('\n').slice(0, 3).join('\n')}` : '';
    console.error('[telegram-webhook] Stack:', stack);
    await sendTelegramMessage(
      chatId,
      `❌ ${msg}\n\nTip: Send a photo of the card. Add a caption like "NM, $5, bought at TCG shop" for extra details.`,
      botToken,
    );
  }

  return NextResponse.json({ ok: true });
}
