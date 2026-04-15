'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/hooks/use-collection';
import { DashboardStats } from '@/components/dashboard-stats';
import { CollectionFilters, type Filters } from '@/components/collection-filters';
import { CollectionTable } from '@/components/collection-table';
import { CardForm } from '@/components/card-form';
import { BatchScanModal } from '@/components/batch-scan-modal';
import { Button } from '@/components/ui/button';
import { Plus, ScanLine, Anchor, LayoutGrid, Table2 } from 'lucide-react';
import Link from 'next/link';
import type { Card } from '@/lib/types';

export default function CardsPage() {
  const { cards, isLoaded, addCard, updateCard, deleteCard } = useCollection();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBatchScanOpen, setIsBatchScanOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    color: '',
    rarity: '',
    category: '',
    language: '',
    condition: '',
  });

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          card.cardName.toLowerCase().includes(searchLower) ||
          card.cardNumber.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filters.color && !card.colors.includes(filters.color)) return false;
      if (filters.rarity && card.rarity !== filters.rarity) return false;
      if (filters.category && card.category !== filters.category) return false;
      if (filters.language && card.language !== filters.language) return false;
      if (filters.condition && card.condition !== filters.condition) return false;
      return true;
    });
  }, [cards, filters]);

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
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Anchor className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground hidden sm:block">
                My One Piece TCG
              </h1>
            </div>
            <nav className="flex items-center gap-1">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <LayoutGrid className="h-4 w-4" />
                  Gallery
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="gap-2 text-foreground bg-secondary">
                <Table2 className="h-4 w-4" />
                Table
              </Button>
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <DashboardStats cards={cards} />
          <CollectionFilters filters={filters} onFiltersChange={setFilters} />
          {cards.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-medium text-foreground">{filteredCards.length}</span>
              {' '}of{' '}
              <span className="font-medium text-foreground">{cards.length}</span>
              {' '}cards
            </p>
          )}
          <CollectionTable cards={filteredCards} onEdit={handleEditCard} onDelete={deleteCard} />
        </div>
      </main>

      <CardForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
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
