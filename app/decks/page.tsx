'use client';

import { useState } from 'react';
import { useDecks } from '@/hooks/use-decks';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  Table2,
  DollarSign,
  Layers,
  Plus,
  Trash2,
  Menu,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function NewDeckDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate(name.trim(), description.trim());
      setName('');
      setDescription('');
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Deck</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder="Deck name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || saving}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DecksPage() {
  const { decks, isLoaded, createDeck, deleteDeck } = useDecks();
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const router = useRouter();

  const handleCreate = async (name: string, description: string) => {
    const deck = await createDeck(name, description || undefined);
    router.push(`/decks/${deck.id}`);
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
              <h1 className="hidden text-xl font-bold text-foreground sm:block">My One Piece TCG</h1>
            </div>

            {/* Mobile nav */}
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
                <DropdownMenuItem asChild>
                  <Link href="/sells" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />Sells
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 bg-secondary" disabled>
                  <Layers className="h-4 w-4" />Decks
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
              <Link href="/sells">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />Sells
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="gap-2 bg-secondary text-foreground">
                <Layers className="h-4 w-4" />Decks
              </Button>
            </nav>
          </div>

          <Button onClick={() => setNewDeckOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Deck</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
            <Layers className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground">No decks yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a deck and import cards using the NxSET-NNN format
            </p>
            <Button onClick={() => setNewDeckOpen(true)} className="mt-6 gap-2">
              <Plus className="h-4 w-4" />New Deck
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <div
                key={deck.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
              >
                <Link href={`/decks/${deck.id}`} className="block p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-foreground">{deck.name}</h2>
                      {deck.description && (
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {deck.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                      <Layers className="h-3 w-3" />
                      {deck.cardCount ?? 0} cards
                    </span>
                    <span>
                      {new Date(deck.updatedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm(`Delete "${deck.name}"?`)) deleteDeck(deck.id);
                  }}
                  className="absolute right-3 top-3 hidden rounded-md p-1.5 text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:flex"
                  title="Delete deck"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <NewDeckDialog
        open={newDeckOpen}
        onOpenChange={setNewDeckOpen}
        onCreate={handleCreate}
      />
    </div>
  );
}
