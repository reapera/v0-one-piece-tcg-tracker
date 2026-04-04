'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/hooks/use-collection';
import { DashboardStats } from '@/components/dashboard-stats';
import { CollectionFilters, type Filters } from '@/components/collection-filters';
import { CollectionTable } from '@/components/collection-table';
import { CardForm } from '@/components/card-form';
import { Button } from '@/components/ui/button';
import { Plus, Anchor, Skull } from 'lucide-react';
import type { Card } from '@/lib/types';

export default function Home() {
  const { cards, isLoaded, addCard, updateCard, deleteCard } = useCollection();
  const [isFormOpen, setIsFormOpen] = useState(false);
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
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          card.cardName.toLowerCase().includes(searchLower) ||
          card.cardNumber.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Color filter
      if (filters.color && !card.colors.includes(filters.color)) return false;

      // Rarity filter
      if (filters.rarity && card.rarity !== filters.rarity) return false;

      // Category filter
      if (filters.category && card.category !== filters.category) return false;

      // Language filter
      if (filters.language && card.language !== filters.language) return false;

      // Condition filter
      if (filters.condition && card.condition !== filters.condition) return false;

      return true;
    });
  }, [cards, filters]);

  const handleAddCard = (cardData: Omit<Card, 'id'>) => {
    addCard(cardData);
  };

  const handleEditCard = (card: Card) => {
    setEditingCard(card);
    setIsFormOpen(true);
  };

  const handleUpdateCard = (cardData: Omit<Card, 'id'>) => {
    if (editingCard) {
      updateCard(editingCard.id, cardData);
      setEditingCard(null);
    }
  };

  const handleFormSubmit = (cardData: Omit<Card, 'id'>) => {
    if (editingCard) {
      handleUpdateCard(cardData);
    } else {
      handleAddCard(cardData);
    }
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingCard(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skull className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading your collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Anchor className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                My One Piece TCG Collection
              </h1>
              <p className="text-xs text-muted-foreground">
                Track your treasure
              </p>
            </div>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Card
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Dashboard Stats */}
          <section>
            <h2 className="sr-only">Collection Statistics</h2>
            <DashboardStats cards={cards} />
          </section>

          {/* Filters */}
          <section>
            <h2 className="sr-only">Filters</h2>
            <CollectionFilters filters={filters} onFiltersChange={setFilters} />
          </section>

          {/* Results Count */}
          {cards.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing{' '}
                <span className="font-medium text-foreground">
                  {filteredCards.length}
                </span>{' '}
                of{' '}
                <span className="font-medium text-foreground">
                  {cards.length}
                </span>{' '}
                cards
              </p>
            </div>
          )}

          {/* Collection Table */}
          <section>
            <h2 className="sr-only">Card Collection</h2>
            <CollectionTable
              cards={filteredCards}
              onEdit={handleEditCard}
              onDelete={deleteCard}
            />
          </section>
        </div>
      </main>

      {/* Card Form Modal */}
      <CardForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        editCard={editingCard}
      />
    </div>
  );
}
