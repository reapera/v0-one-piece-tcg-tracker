'use client';

import { useMemo } from 'react';
import { useSells } from '@/hooks/use-sells';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  Table2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  BarChart3,
  Layers,
  Menu,
} from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: 'green' | 'red';
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p
        className={`truncate text-xl font-bold ${
          accent === 'green'
            ? 'text-green-400'
            : accent === 'red'
              ? 'text-red-400'
              : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function SellsPage() {
  const { sells, isLoaded } = useSells();

  const stats = useMemo(() => {
    const revenue = sells.reduce((s, x) => s + x.sellPrice * x.quantitySold, 0);
    const cost = sells.reduce((s, x) => s + x.buyPriceSnapshot * x.quantitySold, 0);
    const profit = revenue - cost;
    const profitPct = cost > 0 ? (profit / cost) * 100 : 0;
    return { revenue, cost, profit, profitPct, count: sells.length };
  }, [sells]);

  const isGain = stats.profit >= 0;

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <img src="/onepiece-logo.svg" alt="One Piece" className="h-8 w-8" />
              </div>
              <h1 className="hidden text-xl font-bold text-foreground sm:block">My One Piece TCG</h1>
            </div>
            {/* Mobile nav: hamburger */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="sm:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href="/" className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />Gallery
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/cards" className="flex items-center gap-2">
                    <Table2 className="h-4 w-4" />Table
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 bg-secondary" disabled>
                  <DollarSign className="h-4 w-4" />Sells
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/decks" className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />Decks
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-1">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <LayoutGrid className="h-4 w-4" />Gallery
                </Button>
              </Link>
              <Link href="/cards">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <Table2 className="h-4 w-4" />Table
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="gap-2 bg-secondary text-foreground">
                <DollarSign className="h-4 w-4" />Sells
              </Button>
              <Link href="/decks">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <Layers className="h-4 w-4" />Decks
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {sells.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
            {/* Hero row */}
            <div
              className={`flex flex-col gap-1 px-6 py-6 sm:flex-row sm:items-end sm:justify-between ${
                isGain
                  ? 'bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent'
                  : 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent'
              }`}
            >
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Net Profit / Loss
                </p>
                <p
                  className={`text-4xl font-extrabold tracking-tight sm:text-5xl ${
                    isGain ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {isGain ? '+' : ''}Rp{stats.profit.toLocaleString('id-ID')}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {isGain ? '+' : ''}
                  {stats.profitPct.toFixed(1)}% return · {stats.count} transactions
                </p>
              </div>
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  isGain ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}
              >
                {isGain ? (
                  <TrendingUp className="h-6 w-6 text-green-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-400" />
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 divide-border/50 border-t border-border/50 sm:grid-cols-4 sm:divide-x">
              <StatTile
                icon={<Receipt className="h-3.5 w-3.5" />}
                label="Revenue"
                value={`Rp${stats.revenue.toLocaleString('id-ID')}`}
              />
              <StatTile
                icon={<BarChart3 className="h-3.5 w-3.5" />}
                label="Cost Basis"
                value={`Rp${stats.cost.toLocaleString('id-ID')}`}
              />
              <StatTile
                icon={
                  isGain ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )
                }
                label="Net Profit"
                value={`${isGain ? '+' : ''}Rp${stats.profit.toLocaleString('id-ID')}`}
                accent={isGain ? 'green' : 'red'}
              />
              <StatTile
                icon={<Receipt className="h-3.5 w-3.5" />}
                label="Transactions"
                value={stats.count.toLocaleString()}
              />
            </div>
          </div>
        )}

        {sells.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
            <DollarSign className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground">No sells yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sell cards from your collection to see your P&amp;L history here
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Card</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Cost/unit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Sell/unit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">P&amp;L</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {sells.map((sell) => {
                    const rowProfit =
                      (sell.sellPrice - sell.buyPriceSnapshot) * sell.quantitySold;
                    const rowPct =
                      sell.buyPriceSnapshot > 0
                        ? ((sell.sellPrice - sell.buyPriceSnapshot) / sell.buyPriceSnapshot) * 100
                        : 0;
                    const rowGain = rowProfit >= 0;
                    return (
                      <tr
                        key={sell.id}
                        className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/20"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {new Date(sell.soldAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{sell.cardName}</p>
                          <p className="text-xs text-muted-foreground">{sell.cardNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">{sell.quantitySold}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          Rp{sell.buyPriceSnapshot.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">
                          Rp{sell.sellPrice.toLocaleString('id-ID')}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            rowGain ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {rowGain ? '+' : ''}Rp{rowProfit.toLocaleString('id-ID')}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            rowGain ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {rowGain ? '+' : ''}
                          {rowPct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
