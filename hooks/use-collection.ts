'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Card } from '@/lib/types';
import { supabase } from '@/lib/supabase';

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  return headers;
}

export function useCollection() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const headers = await authHeaders();
      fetch('/api/cards', { headers })
        .then((res) => res.json())
        .then((data: Card[]) => {
          if (!cancelled) setCards(data);
        })
        .catch((err) => console.error('Failed to load collection:', err))
        .finally(() => { if (!cancelled) setIsLoaded(true); });
    })();

    return () => { cancelled = true; };
  }, []);

  const addCard = useCallback(async (card: Omit<Card, 'id'>) => {
    const headers = await authHeaders();
    const res = await fetch('/api/cards', {
      method: 'POST',
      headers,
      body: JSON.stringify(card),
    });

    if (!res.ok) {
      console.error('Failed to add card:', await res.text());
      return;
    }

    const created: Card = await res.json();
    setCards((prev) => {
      const exists = prev.some((c) => c.id === created.id);
      return exists ? prev.map((c) => (c.id === created.id ? created : c)) : [...prev, created];
    });
    return created;
  }, []);

  const updateCard = useCallback(async (id: string, updates: Partial<Omit<Card, 'id'>>) => {
    const headers = await authHeaders();
    const res = await fetch(`/api/cards/${id}`, {
      method: 'PATCH',
      headers,
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
    const headers = await authHeaders();
    const res = await fetch(`/api/cards/${id}`, { method: 'DELETE', headers });

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

  const replaceCard = useCallback((card: Card) => {
    setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
  }, []);

  return { cards, isLoaded, addCard, updateCard, deleteCard, getCard, replaceCard };
}
