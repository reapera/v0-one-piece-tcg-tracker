export type CardColor = 'Red' | 'Green' | 'Blue' | 'Purple' | 'Black' | 'Yellow';

export type CardRarity = 'C' | 'UC' | 'R' | 'SR' | 'SEC' | 'L' | 'SP' | 'Promo';

export type CardCategory = 'Leader' | 'Character' | 'Event' | 'Stage';

export type CardVariant = 'Standard' | 'Alt Art' | 'Manga Art' | 'Parallel' | 'Serial';

export type CardLanguage = 'EN' | 'JP';

export type CardCondition = 'Near Mint' | 'Lightly Played' | 'Moderately Played' | 'Heavily Played' | 'Damaged';

export interface Card {
  id: string;
  cardNumber: string;
  cardName: string;
  set: string;
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

export const CARD_COLORS: CardColor[] = ['Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow'];

export const CARD_RARITIES: CardRarity[] = ['C', 'UC', 'R', 'SR', 'SEC', 'L', 'SP', 'Promo'];

export const CARD_CATEGORIES: CardCategory[] = ['Leader', 'Character', 'Event', 'Stage'];

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

export const POPULAR_SETS = [
  'OP-01 Romance Dawn',
  'OP-02 Paramount War',
  'OP-03 Pillars of Strength',
  'OP-04 Kingdoms of Intrigue',
  'OP-05 Awakening of the New Era',
  'OP-06 Wings of the Captain',
  'OP-07 500 Years in the Future',
  'OP-08 Two Legends',
  'ST-01 Straw Hat Crew',
  'ST-02 Worst Generation',
  'ST-03 The Seven Warlords',
  'ST-04 Animal Kingdom Pirates',
  'ST-05 Film Edition',
  'ST-06 Absolute Justice',
  'ST-07 Big Mom Pirates',
  'ST-08 Monkey D. Luffy',
  'ST-09 Yamato',
  'ST-10 The Three Captains',
  'ST-11 Uta',
  'ST-12 Zoro and Sanji',
  'ST-13 The Three Brothers',
  'EB-01 Memorial Collection',
  'PRB-01 Premium Booster',
];
