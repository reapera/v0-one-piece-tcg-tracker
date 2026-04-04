'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ColorBadge } from '@/components/color-badge';
import { Pencil, Trash2, ImageIcon } from 'lucide-react';
import { useState } from 'react';
import type { Card } from '@/lib/types';
import { RARITY_LABELS } from '@/lib/types';

const CONDITION_COLOR: Record<string, string> = {
  'Near Mint': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Lightly Played': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Moderately Played': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Heavily Played': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Damaged': 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface CardDetailProps {
  card: Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (card: Card) => void;
  onDelete: (id: string) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="text-sm font-medium text-foreground text-right">{children}</div>
    </div>
  );
}

export function CardDetail({ card, open, onOpenChange, onEdit, onDelete }: CardDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!card) return null;

  const totalValue = card.buyPrice * card.quantity;

  const handleDelete = () => {
    onDelete(card.id);
    setConfirmDelete(false);
    onOpenChange(false);
  };

  const handleEdit = () => {
    onOpenChange(false);
    onEdit(card);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[100dvh] w-full flex-col overflow-y-auto sm:max-h-[90vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary pr-6">{card.cardName}</DialogTitle>
            <p className="font-mono text-xs text-muted-foreground">{card.cardNumber}</p>
          </DialogHeader>

          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Image */}
            <div className="flex shrink-0 justify-center sm:justify-start">
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt={card.cardName}
                  className="h-56 w-auto rounded-lg border border-border object-contain sm:h-72"
                />
              ) : (
                <div className="flex h-56 w-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 sm:h-72 sm:w-48">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <Row label="Category">
                <Badge variant="outline">{card.category}</Badge>
              </Row>
              <Row label="Colors">
                <div className="flex flex-wrap justify-end gap-1">
                  {card.colors.map((c) => <ColorBadge key={c} color={c} />)}
                </div>
              </Row>
              <Row label="Rarity">
                <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                  {card.rarity} — {RARITY_LABELS[card.rarity]}
                </Badge>
              </Row>
              <Row label="Variant">{card.variant}</Row>
              <Row label="Language">
                <Badge variant="secondary">{card.language === 'EN' ? 'English' : 'Japanese'}</Badge>
              </Row>
              <Row label="Condition">
                <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${CONDITION_COLOR[card.condition]}`}>
                  {card.condition}
                </span>
              </Row>
              <Row label="Quantity">{card.quantity}</Row>
              <Row label="Buy Price">Rp{card.buyPrice.toLocaleString('id-ID')}</Row>
              <Row label="Total Value">
                <span className="text-primary">Rp{totalValue.toLocaleString('id-ID')}</span>
              </Row>
              <Row label="Date Purchased">
                {card.datePurchased ? new Date(card.datePurchased).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </Row>
              <Row label="Where Bought">{card.whereBought || '—'}</Row>
              {card.psaGrade && (
                <Row label="PSA Grade">
                  <Badge className="bg-chart-4/20 text-chart-4">PSA {card.psaGrade}</Badge>
                </Row>
              )}
              {card.notes && (
                <Row label="Notes">
                  <span className="whitespace-pre-wrap text-left">{card.notes}</span>
                </Row>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleEdit} className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{card.cardName}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
