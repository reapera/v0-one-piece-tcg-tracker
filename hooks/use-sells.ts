'use client';

import { useState, useEffect } from 'react';
import type { Sell } from '@/lib/sells-service';

export function useSells() {
  const [sells, setSells] = useState<Sell[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sells')
      .then((res) => res.json())
      .then((data: { sells: Sell[] }) => {
        if (!cancelled) setSells(data.sells);
      })
      .catch((err) => console.error('Failed to load sells:', err))
      .finally(() => { if (!cancelled) setIsLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  return { sells, isLoaded };
}
