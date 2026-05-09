export interface OptcgCardData {
  cardNumber: string;
  cardName: string | null;
  imageUrl: string | null;
  rarity: string | null;
  color: string | null;
  cardType: string | null;
}

export async function lookupCard(cardNumber: string): Promise<OptcgCardData> {
  const base: OptcgCardData = {
    cardNumber,
    cardName: null,
    imageUrl: null,
    rarity: null,
    color: null,
    cardType: null,
  };
  try {
    const res = await fetch(
      `https://optcgapi.com/api/sets/card/${encodeURIComponent(cardNumber)}/`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return base;
    const d = await res.json();
    return {
      cardNumber,
      cardName: d.name ?? d.card_name ?? null,
      imageUrl: d.image ?? d.image_url ?? d.img ?? null,
      rarity: d.rarity ?? null,
      color: d.color ?? null,
      cardType: d.type ?? d.card_type ?? d.category ?? null,
    };
  } catch {
    return base;
  }
}
