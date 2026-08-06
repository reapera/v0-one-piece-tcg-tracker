'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Deck } from '@/lib/decks-service';
import { supabase } from '@/lib/supabase';

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  return headers;
}

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/decks', { headers });
      if (res.status === 401) { setIsLoaded(true); return; }
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
    const headers = await authHeaders();
    const res = await fetch('/api/decks', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error('Failed to create deck');
    const data = await res.json();
    setDecks((prev) => [data.deck, ...prev]);
    return data.deck;
  }, []);

  const deleteDeck = useCallback(async (id: string) => {
    const headers = await authHeaders();
    await fetch(`/api/decks/${id}`, { method: 'DELETE', headers });
    setDecks((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { decks, isLoaded, reload: load, createDeck, deleteDeck };
}
