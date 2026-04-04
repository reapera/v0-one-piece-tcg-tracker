'use client';

import { Card as CardType, RARITY_LABELS } from '@/lib/types';
import { TrendingUp, Layers, Hash, DollarSign } from 'lucide-react';

interface DashboardStatsProps {
  cards: CardType[];
}

export function DashboardStats({ cards }: DashboardStatsProps) {
  const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
  const uniqueCards = cards.length;
  const totalValue = cards.reduce(
    (sum, card) => sum + card.buyPrice * card.quantity,
    0
  );

  // Group by rarity
  const rarityBreakdown = cards.reduce((acc, card) => {
    const key = card.rarity;
    if (!acc[key]) {
      acc[key] = { count: 0, value: 0 };
    }
    acc[key].count += card.quantity;
    acc[key].value += card.buyPrice * card.quantity;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const rarityOrder = ['SEC', 'SP', 'L', 'SR', 'R', 'UC', 'C', 'Promo'];

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cards</p>
              <p className="text-2xl font-bold text-foreground">{totalCards}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unique Cards</p>
              <p className="text-2xl font-bold text-foreground">{uniqueCards}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Collection Value</p>
              <p className="text-2xl font-bold text-foreground">
                Rp{totalValue.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. Card Value</p>
              <p className="text-2xl font-bold text-foreground">
                Rp{totalCards > 0 ? Math.round(totalValue / totalCards).toLocaleString('id-ID') : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rarity Breakdown */}
      {Object.keys(rarityBreakdown).length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Rarity Breakdown
          </h3>
          <div className="flex flex-wrap gap-3">
            {rarityOrder
              .filter((rarity) => rarityBreakdown[rarity])
              .map((rarity) => (
                <div
                  key={rarity}
                  className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2"
                >
                  <span className="text-xs font-medium text-primary">
                    {rarity}
                  </span>
                  <span className="text-sm text-foreground">
                    {rarityBreakdown[rarity].count}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (Rp{rarityBreakdown[rarity].value.toLocaleString('id-ID')})
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
