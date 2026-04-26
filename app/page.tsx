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
import { Plus, ScanLine, LayoutGrid, Table2, Search, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { CardDetail } from '@/components/card-detail';
import { BatchScanModal } from '@/components/batch-scan-modal';
import type { Card } from '@/lib/types';
import { CARD_RARITIES, CARD_CONDITIONS, RARITY_LABELS } from '@/lib/types';

const CONDITION_SHORT: Record<string, string> = {
  'Near Mint': 'NM',
  'Lightly Played': 'LP',
  'Moderately Played': 'MP',
  'Heavily Played': 'HP',
  'Damaged': 'D',
};

const CONDITION_COLOR: Record<string, string> = {
  'Near Mint': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Lightly Played': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Moderately Played': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Heavily Played': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Damaged': 'bg-red-500/20 text-red-400 border-red-500/30',
};

function CardTile({ card, onClick }: { card: Card; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Image */}
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

        {/* Game badge */}
        <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          One Piece
        </div>

        {/* Rarity badge */}
        <div className="absolute right-2 top-2 rounded-md bg-primary/80 px-1.5 py-0.5 text-xs font-bold text-primary-foreground backdrop-blur-sm">
          {card.rarity}
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight text-foreground">
            {card.cardName}
          </p>
          <p className="text-xs text-primary">{card.cardNumber}</p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${CONDITION_COLOR[card.condition]}`}
          >
            {CONDITION_SHORT[card.condition] ?? card.condition}
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
  const { cards, isLoaded, addCard, updateCard, deleteCard } = useCollection();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBatchScanOpen, setIsBatchScanOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('all');
  const [rarity, setRarity] = useState('all');

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !card.cardName.toLowerCase().includes(q) &&
          !card.cardNumber.toLowerCase().includes(q)
        )
          return false;
      }
      if (condition !== 'all' && card.condition !== condition) return false;
      if (rarity !== 'all' && card.rarity !== rarity) return false;
      return true;
    });
  }, [cards, search, condition, rarity]);

  const handleEditCard = (card: Card) => {
    setEditingCard(card);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (cardData: Omit<Card, 'id'>) => {
    if (editingCard) {
      updateCard(editingCard.id, cardData);
      setEditingCard(null);
    } else {
      addCard(cardData);
    }
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) setEditingCard(null);
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <img src="/onepiece-logo.svg" alt="One Piece" className="h-8 w-8" />
              </div>
              <h1 className="hidden text-xl font-bold text-foreground sm:block">
                My One Piece TCG
              </h1>
            </div>
            <nav className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="gap-2 bg-secondary text-foreground">
                <LayoutGrid className="h-4 w-4" />
                Gallery
              </Button>
              <Link href="/cards">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <Table2 className="h-4 w-4" />
                  Table
                </Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsBatchScanOpen(true)} className="gap-2">
              <ScanLine className="h-4 w-4" />
              <span className="hidden sm:inline">Batch Scan</span>
            </Button>
            <Button onClick={() => setIsFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Card
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Search + Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by card name or number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                {CARD_CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CONDITION_SHORT[c]} — {c}
                  </SelectItem>
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
                  <SelectItem key={r} value={r}>
                    {r} — {RARITY_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        {cards.length > 0 && (
          <p className="mb-4 text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">{filteredCards.length}</span>
            {' '}of{' '}
            <span className="font-medium text-foreground">{cards.length}</span>
            {' '}cards
          </p>
        )}

        {/* Grid */}
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
            {cards.length === 0 && (
              <Button onClick={() => setIsFormOpen(true)} className="mt-6 gap-2">
                <Plus className="h-4 w-4" />
                Add Card
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredCards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                onClick={() => setSelectedCard(card)}
              />
            ))}
          </div>
        )}
      </main>

      <CardDetail
        card={selectedCard}
        open={!!selectedCard}
        onOpenChange={(open) => { if (!open) setSelectedCard(null); }}
        onEdit={handleEditCard}
        onDelete={deleteCard}
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
