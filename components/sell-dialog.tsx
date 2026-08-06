'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Minus, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import type { Card } from '@/lib/types';

interface SellDialogProps {
  card: Card;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSell: (updatedCard: Card) => void;
}

export function SellDialog({ card, open, onOpenChange, onSell }: SellDialogProps) {
  const [qty, setQty] = useState(1);
  const [sellPrice, setSellPrice] = useState<number>(card.buyPrice);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSell = sellPrice * qty;
  const totalBuy = card.buyPrice * qty;
  const profit = totalSell - totalBuy;
  const profitPct = totalBuy > 0 ? (profit / totalBuy) * 100 : 0;
  const isGain = profit >= 0;

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/sells', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ cardId: card.id, quantitySold: qty, sellPrice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to record sale');
      onSell(data.card);
      onOpenChange(false);
      setQty(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sell Card</DialogTitle>
        </DialogHeader>

        {/* Card info */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="font-semibold text-foreground">{card.cardName}</p>
          <p className="text-xs text-muted-foreground">
            {card.cardNumber} · {card.variant} · {card.language}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            In stock:{' '}
            <span className={`font-semibold ${card.quantity === 0 ? 'text-red-400' : 'text-foreground'}`}>
              {card.quantity}
            </span>
          </p>
        </div>

        {/* Quantity stepper */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Quantity to Sell</label>
          <div className="flex items-center rounded-md border border-input bg-background">
            <Button
              type="button" variant="ghost" size="icon"
              className="h-9 w-9 shrink-0 rounded-none rounded-l-md border-r border-input"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number" min={1} max={card.quantity}
              value={qty}
              onChange={(e) =>
                setQty(Math.min(card.quantity, Math.max(1, parseInt(e.target.value) || 1)))
              }
              className="h-9 rounded-none border-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <Button
              type="button" variant="ghost" size="icon"
              className="h-9 w-9 shrink-0 rounded-none rounded-r-md border-l border-input"
              onClick={() => setQty((q) => Math.min(card.quantity, q + 1))}
              disabled={qty >= card.quantity}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sell price */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Sell Price per Card (Rp)</label>
          <Input
            type="number" min={0}
            value={sellPrice}
            onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* P&L preview */}
        <div className={`rounded-lg border p-3 ${isGain ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className="mb-2 flex items-center gap-2">
            {isGain
              ? <TrendingUp className="h-4 w-4 text-green-400" />
              : <TrendingDown className="h-4 w-4 text-red-400" />}
            <span className="text-sm font-medium">P&amp;L Preview</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <span className="text-muted-foreground">Cost basis</span>
            <span className="text-right text-foreground">Rp{totalBuy.toLocaleString('id-ID')}</span>
            <span className="text-muted-foreground">Revenue</span>
            <span className="text-right text-foreground">Rp{totalSell.toLocaleString('id-ID')}</span>
            <span className="font-medium text-muted-foreground">Profit</span>
            <span className={`text-right font-bold ${isGain ? 'text-green-400' : 'text-red-400'}`}>
              {isGain ? '+' : ''}Rp{profit.toLocaleString('id-ID')}{' '}
              <span className="font-normal opacity-80">({isGain ? '+' : ''}{profitPct.toFixed(1)}%)</span>
            </span>
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || qty < 1 || qty > card.quantity || card.quantity === 0}
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Processing…' : `Sell ${qty} Card${qty !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
