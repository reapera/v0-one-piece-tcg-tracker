'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Card } from '@/lib/types';

const STORAGE_KEY = 'one-piece-tcg-collection';

export function useCollection() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cards from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCards(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load collection from localStorage:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save cards to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
      } catch (error) {
        console.error('Failed to save collection to localStorage:', error);
      }
    }
  }, [cards, isLoaded]);

  const addCard = useCallback((card: Omit<Card, 'id'>) => {
    const newCard: Card = {
      ...card,
      id: crypto.randomUUID(),
    };
    setCards((prev) => [...prev, newCard]);
    return newCard;
  }, []);

  const updateCard = useCallback((id: string, updates: Partial<Omit<Card, 'id'>>) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === id ? { ...card, ...updates } : card
      )
    );
  }, []);

  const deleteCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((card) => card.id !== id));
  }, []);

  const getCard = useCallback(
    (id: string) => cards.find((card) => card.id === id),
    [cards]
  );

  return {
    cards,
    isLoaded,
    addCard,
    updateCard,
    deleteCard,
    getCard,
  };
}
