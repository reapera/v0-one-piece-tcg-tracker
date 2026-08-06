'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Deck, DeckCard } from '@/lib/decks-service';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  Table2,
  DollarSign,
  Layers,
  ArrowLeft,
  Upload,
  Download,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Loader2,
  Menu,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import Link from 'next/link';
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

const COLOR_DOT: Record<string, string> = {
  Red: 'bg-red-500',
  Blue: 'bg-blue-500',
  Green: 'bg-green-500',
  Purple: 'bg-purple-500',
  Black: 'bg-zinc-800',
  Yellow: 'bg-yellow-400',
};

function ColorDot({ color }: { color: string | null }) {
  if (!color) return null;
  const cls = COLOR_DOT[color] ?? 'bg-muted-foreground';
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

function ImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImport: (lines: string[]) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setLoading(true);
    try {
      await onImport(lines);
      setText('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Deck List</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-sm text-muted-foreground">
            Paste your deck list — one card per line in <code className="text-xs">NxSET-NNN</code> format (e.g. <code className="text-xs">4xOP12-013</code>).
          </p>
          <textarea
            className="h-52 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={"4xOP12-013\n1xOP12-020\n2xOP09-001"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!text.trim() || loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? 'Importing…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShoppingListDialog({
  open,
  onOpenChange,
  cards,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cards: DeckCard[];
}) {
  const missing = cards.filter((c) => c.owned < c.quantity);
  const text = missing
    .map((c) => `${c.quantity - c.owned}x${c.cardNumber}${c.cardName ? ` (${c.cardName})` : ''}`)
    .join('\n');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Shopping List</DialogTitle>
        </DialogHeader>
        {missing.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
            <p className="font-medium text-foreground">You own all cards in this deck!</p>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              {missing.length} card type{missing.length !== 1 ? 's' : ''} still needed:
            </p>
            <textarea
              readOnly
              className="h-48 w-full rounded-md border border-input bg-muted/30 px-3 py-2 font-mono text-sm"
              value={text}
            />
          </div>
        )}
        <DialogFooter>
          {missing.length > 0 && (
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(text)}
              className="gap-2"
            >
              Copy
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DeckDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const getAuthHeaders = useCallback(async (extra?: Record<string, string>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
    if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
    return h;
  }, []);

  const load = useCallback(async () => {
    const headers = await getAuthHeaders();
    const [deckRes, cardsRes] = await Promise.all([
      fetch(`/api/decks/${id}`, { headers }),
      fetch(`/api/decks/${id}/cards`, { headers }),
    ]);
    if (!deckRes.ok) { router.push('/decks'); return; }
    const { deck: d } = await deckRes.json();
    const { cards: c } = await cardsRes.json();
    setDeck(d);
    setCards(c ?? []);
    setIsLoaded(true);
  }, [id, router, getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

  const handleImport = async (lines: string[]) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/decks/${id}/cards`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ lines }),
    });
    if (!res.ok) throw new Error('Import failed');
    const { cards: c } = await res.json();
    setCards(c ?? []);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput === deck?.name) { setEditingName(false); return; }
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/decks/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name: nameInput.trim() }),
    });
    if (res.ok) {
      const { deck: d } = await res.json();
      setDeck(d);
    }
    setEditingName(false);
  };

  const exportText = cards.map((c) => `${c.quantity}x${c.cardNumber}`).join('\n');

  const groups = cards.reduce<Record<string, DeckCard[]>>((acc, c) => {
    const key = c.cardType ?? 'Other';
    (acc[key] ??= []).push(c);
    return acc;
  }, {});
  const groupOrder = ['Leader', 'Character', 'Event', 'Stage', 'Other'];
  const orderedKeys = [
    ...groupOrder.filter((k) => groups[k]),
    ...Object.keys(groups).filter((k) => !groupOrder.includes(k)),
  ];

  const totalNeeded = cards.reduce((s, c) => s + c.quantity, 0);
  const totalOwned = cards.reduce((s, c) => s + Math.min(c.owned, c.quantity), 0);
  const allOwned = totalNeeded > 0 && totalOwned >= totalNeeded;

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
          <div className="flex items-center gap-4">
            <Link href="/decks">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
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
              <Link href="/decks">
                <Button variant="ghost" size="sm" className="gap-2 bg-secondary text-foreground">
                  <Layers className="h-4 w-4" />Decks
                </Button>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShopOpen(true)} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Shopping List</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(exportText)}
              disabled={cards.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button size="sm" onClick={() => setImportOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="h-9 text-xl font-bold"
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={handleSaveName}>
                <Check className="h-4 w-4 text-green-400" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setEditingName(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => { setNameInput(deck?.name ?? ''); setEditingName(true); }}
              className="group flex items-center gap-2"
            >
              <h2 className="text-2xl font-bold text-foreground">{deck?.name}</h2>
              <Pencil className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
        </div>

        {cards.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Collection coverage</span>
              <span className={`font-semibold ${allOwned ? 'text-green-400' : 'text-foreground'}`}>
                {totalOwned} / {totalNeeded} cards
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${allOwned ? 'bg-green-500' : 'bg-primary'}`}
                style={{ width: `${totalNeeded > 0 ? Math.round((totalOwned / totalNeeded) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
            <Layers className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground">Empty deck</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Import a deck list using the NxSET-NNN format
            </p>
            <Button onClick={() => setImportOpen(true)} className="mt-6 gap-2">
              <Upload className="h-4 w-4" />Import Deck List
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {orderedKeys.map((type) => (
              <div key={type}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {type} ({groups[type].reduce((s, c) => s + c.quantity, 0)})
                </h3>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <tbody>
                      {groups[type].map((card, i) => {
                        const have = Math.min(card.owned, card.quantity);
                        const complete = have >= card.quantity;
                        return (
                          <tr
                            key={card.id}
                            className={`border-border/50 transition-colors hover:bg-muted/20 ${
                              i < groups[type].length - 1 ? 'border-b' : ''
                            }`}
                          >
                            <td className="w-10 px-3 py-2.5 text-center">
                              {complete ? (
                                <CheckCircle2 className="mx-auto h-4 w-4 text-green-400" />
                              ) : (
                                <XCircle className="mx-auto h-4 w-4 text-muted-foreground/40" />
                              )}
                            </td>
                            {card.cardImageUrl && (
                              <td className="w-10 py-1.5 pl-0 pr-2">
                                <img
                                  src={card.cardImageUrl}
                                  alt={card.cardName ?? card.cardNumber}
                                  className="h-10 w-7 rounded object-cover"
                                />
                              </td>
                            )}
                            <td className="py-2.5 pr-4">
                              <p className="font-medium text-foreground">
                                {card.cardName ?? card.cardNumber}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <ColorDot color={card.cardColor} />
                                <span>{card.cardNumber}</span>
                                {card.cardRarity && <span>· {card.cardRarity}</span>}
                              </div>
                            </td>
                            <td className="whitespace-nowrap py-2.5 pr-4 text-right">
                              <span
                                className={`text-sm font-semibold ${
                                  complete ? 'text-green-400' : 'text-amber-400'
                                }`}
                              >
                                {have}/{card.quantity}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 text-right text-xs text-muted-foreground">
                              ×{card.quantity}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />
      <ShoppingListDialog open={shopOpen} onOpenChange={setShopOpen} cards={cards} />
    </div>
  );
}
