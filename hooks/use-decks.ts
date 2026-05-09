'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Deck } from '@/lib/decks-service';

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/decks');
      const data = await res.json();
      setDecks(data.decks ?? []);
    } catch {
      // ignore
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createDeck = useCallback(async (name: string, description?: string): Promise<Deck> => {
    const res = await fetch('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error('Failed to create deck');
    const data = await res.json();
    setDecks((prev) => [data.deck, ...prev]);
    return data.deck;
  }, []);

  const deleteDeck = useCallback(async (id: string) => {
    await fetch(`/api/decks/${id}`, { method: 'DELETE' });
    setDecks((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { decks, isLoaded, reload: load, createDeck, deleteDeck };
}
