'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, rowToCard, cardToRow, type CardRow } from '@/lib/supabase';
import type { Card } from '@/lib/types';

export function useCollection() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Failed to load collection:', error.message);
        } else {
          setCards((data as CardRow[]).map(rowToCard));
        }
        setIsLoaded(true);
      });

    return () => { cancelled = true; };
  }, []);

  const addCard = useCallback(async (card: Omit<Card, 'id'>) => {
    const { data, error } = await supabase
      .from('cards')
      .insert(cardToRow(card))
      .select()
      .single();

    if (error) {
      console.error('Failed to add card:', error.message);
      return;
    }

    setCards((prev) => [...prev, rowToCard(data as CardRow)]);
    return rowToCard(data as CardRow);
  }, []);

  const updateCard = useCallback(async (id: string, updates: Partial<Omit<Card, 'id'>>) => {
    const partial: Partial<ReturnType<typeof cardToRow>> = {};

    if (updates.cardNumber   !== undefined) partial.card_number   = updates.cardNumber;
    if (updates.cardName     !== undefined) partial.card_name     = updates.cardName;
    if (updates.category     !== undefined) partial.category      = updates.category;
    if (updates.colors       !== undefined) partial.colors        = updates.colors;
    if (updates.rarity       !== undefined) partial.rarity        = updates.rarity;
    if (updates.variant      !== undefined) partial.variant       = updates.variant;
    if (updates.language     !== undefined) partial.language      = updates.language;
    if (updates.quantity     !== undefined) partial.quantity      = updates.quantity;
    if (updates.condition    !== undefined) partial.condition     = updates.condition;
    if (updates.buyPrice     !== undefined) partial.buy_price     = updates.buyPrice;
    if (updates.datePurchased !== undefined) partial.date_purchased = updates.datePurchased;
    if (updates.whereBought  !== undefined) partial.where_bought  = updates.whereBought;
    if (updates.psaGrade     !== undefined) partial.psa_grade     = updates.psaGrade ?? null;
    if (updates.notes        !== undefined) partial.notes         = updates.notes ?? null;
    if (updates.imageUrl     !== undefined) partial.image_url     = updates.imageUrl ?? null;

    const { data, error } = await supabase
      .from('cards')
      .update(partial)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update card:', error.message);
      return;
    }

    setCards((prev) =>
      prev.map((c) => (c.id === id ? rowToCard(data as CardRow) : c))
    );
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    const { error } = await supabase.from('cards').delete().eq('id', id);

    if (error) {
      console.error('Failed to delete card:', error.message);
      return;
    }

    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getCard = useCallback(
    (id: string) => cards.find((c) => c.id === id),
    [cards]
  );

  return { cards, isLoaded, addCard, updateCard, deleteCard, getCard };
}
