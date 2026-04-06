'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Card } from '@/lib/types';

export function useCollection() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/cards')
      .then((res) => res.json())
      .then((data: Card[]) => {
        if (!cancelled) setCards(data);
      })
      .catch((err) => console.error('Failed to load collection:', err))
      .finally(() => { if (!cancelled) setIsLoaded(true); });

    return () => { cancelled = true; };
  }, []);

  const addCard = useCallback(async (card: Omit<Card, 'id'>) => {
    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });

    if (!res.ok) {
      console.error('Failed to add card:', await res.text());
      return;
    }

    const created: Card = await res.json();
    setCards((prev) => [...prev, created]);
    return created;
  }, []);

  const updateCard = useCallback(async (id: string, updates: Partial<Omit<Card, 'id'>>) => {
    const res = await fetch(`/api/cards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      console.error('Failed to update card:', await res.text());
      return;
    }

    const updated: Card = await res.json();
    setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });

    if (!res.ok) {
      console.error('Failed to delete card:', await res.text());
      return;
    }

    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getCard = useCallback(
    (id: string) => cards.find((c) => c.id === id),
    [cards],
  );

  return { cards, isLoaded, addCard, updateCard, deleteCard, getCard };
}
