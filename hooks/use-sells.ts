'use client';

import { useState, useEffect } from 'react';
import type { Sell } from '@/lib/sells-service';
import { supabase } from '@/lib/supabase';

export function useSells() {
  const [sells, setSells] = useState<Sell[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setIsLoaded(true);
        return;
      }
      const headers = { Authorization: `Bearer ${session.access_token}` };
      fetch('/api/sells', { headers })
        .then((res) => res.json())
        .then((data: { sells: Sell[] }) => {
          if (!cancelled) setSells(data.sells ?? []);
        })
        .catch((err) => console.error('Failed to load sells:', err))
        .finally(() => { if (!cancelled) setIsLoaded(true); });
    })();

    return () => { cancelled = true; };
  }, []);

  return { sells, isLoaded };
}
