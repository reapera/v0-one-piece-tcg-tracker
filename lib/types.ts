export type CardColor = 'Red' | 'Green' | 'Blue' | 'Purple' | 'Black' | 'Yellow' | 'DON!!';

export type CardRarity = 'C' | 'UC' | 'R' | 'SR' | 'SEC' | 'L' | 'SP' | 'Promo';

export type CardCategory = 'Leader' | 'Character' | 'Event' | 'Stage' | 'DON!!';

export type CardVariant = 'Standard' | 'Alt Art' | 'Manga Art' | 'Parallel' | 'Serial';

export type CardLanguage = 'EN' | 'JP';

export type CardCondition = 'Near Mint' | 'Lightly Played' | 'Moderately Played' | 'Heavily Played' | 'Damaged';

export interface Card {
  id: string;
  cardNumber: string;
  cardName: string;
  category: CardCategory;
  colors: CardColor[];
  rarity: CardRarity;
  variant: CardVariant;
  language: CardLanguage;
  quantity: number;
  condition: CardCondition;
  buyPrice: number;
  datePurchased: string;
  whereBought: string;
  psaGrade?: number;
  notes?: string;
  imageUrl?: string;
}

export const CARD_COLORS: CardColor[] = ['Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow', 'DON!!'];

export const CARD_RARITIES: CardRarity[] = ['C', 'UC', 'R', 'SR', 'SEC', 'L', 'SP', 'Promo'];

export const CARD_CATEGORIES: CardCategory[] = ['Leader', 'Character', 'Event', 'Stage', 'DON!!'];

export const CARD_VARIANTS: CardVariant[] = ['Standard', 'Alt Art', 'Manga Art', 'Parallel', 'Serial'];

export const CARD_LANGUAGES: CardLanguage[] = ['EN', 'JP'];

export const CARD_CONDITIONS: CardCondition[] = ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'];

export const RARITY_LABELS: Record<CardRarity, string> = {
  'C': 'Common',
  'UC': 'Uncommon',
  'R': 'Rare',
  'SR': 'Super Rare',
  'SEC': 'Secret Rare',
  'L': 'Leader',
  'SP': 'Special',
  'Promo': 'Promo',
};


