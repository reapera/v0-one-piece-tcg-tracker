'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/hooks/use-collection';
import { DashboardStats } from '@/components/dashboard-stats';
import { CollectionFilters, type Filters } from '@/components/collection-filters';
import { CollectionTable } from '@/components/collection-table';
import { CardForm } from '@/components/card-form';
import { BatchScanModal } from '@/components/batch-scan-modal';
import { Button } from '@/components/ui/button';
import { Plus, ScanLine, LayoutGrid, Table2, DollarSign, Layers, Menu } from 'lucide-react';
import Link from 'next/link';
import type { Card } from '@/lib/types';
import { AuthButton } from '@/components/auth-button';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function CardsPage() {
  const { user } = useAuth();
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
                <img src="/onepiece-logo.svg" alt="One Piece" className="h-8 w-8" />
              </div>
              <h1 className="text-xl font-bold text-foreground hidden sm:block">
                My One Piece TCG
              </h1>
            </div>
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
                <DropdownMenuItem className="gap-2 bg-secondary" disabled>
                  <Table2 className="h-4 w-4" />Table
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
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <LayoutGrid className="h-4 w-4" />Gallery
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="gap-2 text-foreground bg-secondary">
                <Table2 className="h-4 w-4" />Table
              </Button>
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
          <CollectionTable
            cards={filteredCards}
            onEdit={user ? handleEditCard : undefined}
            onDelete={user ? deleteCard : undefined}
          />
        </div>
      </main>

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
