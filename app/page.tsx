'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/hooks/use-collection';
import { CardForm } from '@/components/card-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, ScanLine, LayoutGrid, Table2, Search, ImageIcon, TrendingUp, Layers, Star, BarChart3, ArrowUpDown, DollarSign, Menu } from 'lucide-react';
import Link from 'next/link';
import { CardDetail } from '@/components/card-detail';
import { BatchScanModal } from '@/components/batch-scan-modal';
import { AuthButton } from '@/components/auth-button';
import { useAuth } from '@/hooks/use-auth';
import type { Card } from '@/lib/types';
import { CARD_RARITIES, CARD_CONDITIONS, RARITY_LABELS } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const CONDITION_SHORT: Record<string, string> = {
  'Near Mint': 'NM',
  'Lightly Played': 'LP',
  'Moderately Played': 'MP',
  'Heavily Played': 'HP',
  'Damaged': 'D',
};

const RARITY_SORT: Record<string, number> = {
  SEC: 0, L: 1, SP: 2, SR: 3, R: 4, UC: 5, C: 6, Promo: 7,
};

function getSet(cardNumber: string): string {
  const m = cardNumber.trim().match(/^(.+)-\d+$/);
  return m ? m[1].toUpperCase() : cardNumber.toUpperCase();
}

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="truncate text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="truncate text-xs text-primary">{sub}</p>}
    </div>
  );
}

function CardTile({ card, onClick }: { card: Card; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted/30">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.cardName}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute right-2 top-2 rounded-md bg-primary/80 px-1.5 py-0.5 text-xs font-bold text-primary-foreground backdrop-blur-sm">
          {card.rarity}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight text-foreground">{card.cardName}</p>
          <p className="text-xs text-primary">{card.cardNumber}</p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            ×{card.quantity}
          </span>
          <span className="text-sm font-semibold text-foreground">
            Rp{card.buyPrice.toLocaleString('id-ID')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { cards, isLoaded, addCard, updateCard, deleteCard, replaceCard } = useCollection();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBatchScanOpen, setIsBatchScanOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('all');
  const [rarity, setRarity] = useState('all');
  const [setFilter, setSetFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');

  const stats = useMemo(() => {
    const totalValue = cards.reduce((s, c) => s + c.buyPrice * c.quantity, 0);
    const totalOwned = cards.reduce((s, c) => s + c.quantity, 0);
    const avgValue = totalOwned > 0 ? totalValue / totalOwned : 0;
    const mostValuable = cards.length > 0
      ? cards.reduce((best, c) => c.buyPrice > best.buyPrice ? c : best)
      : null;
    return { totalValue, totalOwned, avgValue, mostValuable };
  }, [cards]);

  const sets = useMemo(() => {
    const seen = new Set<string>();
    cards.forEach((c) => seen.add(getSet(c.cardNumber)));
    return Array.from(seen).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    let result = cards.filter((card) => {
      if (search) {
        const q = search.toLowerCase();
        if (!card.cardName.toLowerCase().includes(q) && !card.cardNumber.toLowerCase().includes(q)) return false;
      }
      if (condition !== 'all' && card.condition !== condition) return false;
      if (rarity !== 'all' && card.rarity !== rarity) return false;
      if (setFilter !== 'all' && getSet(card.cardNumber) !== setFilter) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'price-high': return b.buyPrice - a.buyPrice;
        case 'price-low':  return a.buyPrice - b.buyPrice;
        case 'name':       return a.cardName.localeCompare(b.cardName);
        case 'rarity':     return (RARITY_SORT[a.rarity] ?? 9) - (RARITY_SORT[b.rarity] ?? 9);
        case 'number':     return a.cardNumber.localeCompare(b.cardNumber);
        case 'date-new':   return b.datePurchased.localeCompare(a.datePurchased);
        case 'date-old':   return a.datePurchased.localeCompare(b.datePurchased);
        default:           return 0;
      }
    });

    return result;
  }, [cards, search, condition, rarity, setFilter, sortBy]);

  const handleEditCard = (card: Card) => { setEditingCard(card); setIsFormOpen(true); };
  const handleFormSubmit = (cardData: Omit<Card, 'id'>) => {
    if (editingCard) { updateCard(editingCard.id, cardData); setEditingCard(null); }
    else addCard(cardData);
  };
  const handleFormClose = (open: boolean) => { setIsFormOpen(open); if (!open) setEditingCard(null); };

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="sm:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem className="gap-2 bg-secondary" disabled>
                  <LayoutGrid className="h-4 w-4" />Gallery
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/cards" className="flex items-center gap-2">
                    <Table2 className="h-4 w-4" />Table
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/sells" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />Sells
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/decks" className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />Decks
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <nav className="hidden sm:flex items-center gap-1">
              <Button variant="ghost" size="sm" className="gap-2 bg-secondary text-foreground">
                <LayoutGrid className="h-4 w-4" />Gallery
              </Button>
              <Link href="/cards">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <Table2 className="h-4 w-4" />Table
                </Button>
              </Link>
              <Link href="/sells">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />Sells
                </Button>
              </Link>
              <Link href="/decks">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <Layers className="h-4 w-4" />Decks
                </Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <>
                <Button variant="outline" onClick={() => setIsBatchScanOpen(true)} className="gap-2">
                  <ScanLine className="h-4 w-4" />
                  <span className="hidden sm:inline">Batch Scan</span>
                </Button>
                <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Card</span>
                </Button>
              </>
            )}
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {cards.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-col gap-1 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Total Portfolio Value
                </p>
                <p className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
                  Rp{stats.totalValue.toLocaleString('id-ID')}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {stats.totalOwned} cards owned · {cards.length} unique entries
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 divide-border/50 border-t border-border/50 sm:grid-cols-4 sm:divide-x">
              <StatTile
                icon={<BarChart3 className="h-3.5 w-3.5" />}
                label="Avg. Card Value"
                value={`Rp${Math.round(stats.avgValue).toLocaleString('id-ID')}`}
              />
              <StatTile
                icon={<Layers className="h-3.5 w-3.5" />}
                label="Unique Cards"
                value={cards.length.toLocaleString()}
              />
              <StatTile
                icon={<Layers className="h-3.5 w-3.5" />}
                label="Total Owned"
                value={stats.totalOwned.toLocaleString()}
              />
              <StatTile
                icon={<Star className="h-3.5 w-3.5" />}
                label="Most Valuable"
                value={stats.mostValuable?.cardName ?? '—'}
                sub={stats.mostValuable ? `Rp${stats.mostValuable.buyPrice.toLocaleString('id-ID')}` : undefined}
              />
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by card name or number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={setFilter} onValueChange={setSetFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sets</SelectItem>
                {sets.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                {CARD_CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>{CONDITION_SHORT[c]} — {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={rarity} onValueChange={setRarity}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Rarity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rarities</SelectItem>
                {CARD_RARITIES.map((r) => (
                  <SelectItem key={r} value={r}>{r} — {RARITY_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="ml-auto w-44 gap-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="price-high">Price: High → Low</SelectItem>
                <SelectItem value="price-low">Price: Low → High</SelectItem>
                <SelectItem value="rarity">Rarity</SelectItem>
                <SelectItem value="name">Name A → Z</SelectItem>
                <SelectItem value="number">Card Number</SelectItem>
                <SelectItem value="date-new">Date: Newest</SelectItem>
                <SelectItem value="date-old">Date: Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {cards.length > 0 && (
          <p className="mb-4 text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredCards.length}</span>
            {' '}of <span className="font-medium text-foreground">{cards.length}</span> cards
          </p>
        )}

        {filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
            <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground">
              {cards.length === 0 ? 'No cards yet' : 'No cards match your filters'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {cards.length === 0
                ? 'Add your first card to start tracking your collection'
                : 'Try adjusting your search or filters'}
            </p>
            {cards.length === 0 && user && (
              <Button onClick={() => setIsFormOpen(true)} className="mt-6 gap-2">
                <Plus className="h-4 w-4" />Add Card
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredCards.map((card) => (
              <CardTile key={card.id} card={card} onClick={() => setSelectedCard(card)} />
            ))}
          </div>
        )}
      </main>

      <CardDetail
        card={selectedCard}
        open={!!selectedCard}
        onOpenChange={(open) => { if (!open) setSelectedCard(null); }}
        onEdit={user ? handleEditCard : undefined}
        onDelete={user ? deleteCard : undefined}
        onSell={user ? (updatedCard) => {
          replaceCard(updatedCard);
          setSelectedCard(updatedCard);
        } : undefined}
      />

      <CardForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        onUpdate={updateCard}
        editCard={editingCard}
      />

      <BatchScanModal
        open={isBatchScanOpen}
        onOpenChange={setIsBatchScanOpen}
        onComplete={() => window.location.reload()}
      />
    </div>
  );
}
