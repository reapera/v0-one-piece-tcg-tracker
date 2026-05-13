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
import { Pencil, Trash2, ImageIcon, ZoomIn, ZoomOut, DollarSign } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { Card } from '@/lib/types';
import { RARITY_LABELS } from '@/lib/types';
import { SellDialog } from '@/components/sell-dialog';

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
  onSell?: (updatedCard: Card) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="text-sm font-medium text-foreground text-right">{children}</div>
    </div>
  );
}

export function CardDetail({ card, open, onOpenChange, onEdit, onDelete, onSell }: CardDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const interactionRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const touchLastPos = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  function openLightbox() {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsDragging(false);
  }

  // Reset if outer dialog closes
  useEffect(() => {
    if (!open) closeLightbox();
  }, [open]);

  // Non-passive wheel + touch listeners
  useEffect(() => {
    const el = interactionRef.current;
    if (!el || !lightboxOpen) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setScale((prev) => {
        const next = Math.min(5, Math.max(1, prev * factor));
        const cx = e.clientX - window.innerWidth / 2;
        const cy = e.clientY - window.innerHeight / 2;
        setTranslate((t) => ({
          x: cx - (cx - t.x) * (next / prev),
          y: cy - (cy - t.y) * (next / prev),
        }));
        return next;
      });
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist.current = Math.hypot(dx, dy);
        pinchStartScale.current = scaleRef.current;
      } else if (e.touches.length === 1) {
        touchLastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist.current !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const next = Math.min(5, Math.max(1, pinchStartScale.current * (dist / pinchStartDist.current)));
        setScale(next);
        if (next <= 1) setTranslate({ x: 0, y: 0 });
      } else if (e.touches.length === 1 && scaleRef.current > 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - touchLastPos.current.x;
        const dy = e.touches[0].clientY - touchLastPos.current.y;
        touchLastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setTranslate((t) => ({ x: t.x + dx, y: t.y + dy }));
      }
    };

    const handleTouchEnd = () => { pinchStartDist.current = null; };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [lightboxOpen]);

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    setTranslate({
      x: dragStart.current.tx + e.clientX - dragStart.current.x,
      y: dragStart.current.ty + e.clientY - dragStart.current.y,
    });
  }

  function handleMouseUp() { setIsDragging(false); }

  function handleDoubleClick() {
    if (scale > 1) { setScale(1); setTranslate({ x: 0, y: 0 }); }
    else { setScale(2.5); }
  }

  function zoomIn() { setScale((p) => Math.min(5, p * 1.3)); }
  function zoomOut() {
    setScale((p) => {
      const next = Math.max(1, p / 1.3);
      if (next <= 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }

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
      {/* Card detail dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[100dvh] w-full flex-col overflow-y-auto sm:max-h-[90vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary pr-6">{card.cardName}</DialogTitle>
            <p className="font-mono text-xs text-muted-foreground">{card.cardNumber}</p>
          </DialogHeader>

          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="flex shrink-0 justify-center sm:justify-start">
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt={card.cardName}
                  className="h-56 w-auto rounded-lg border border-border object-contain sm:h-72 cursor-zoom-in"
                  onClick={openLightbox}
                  draggable={false}
                />
              ) : (
                <div className="flex h-56 w-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 sm:h-72 sm:w-48">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <Row label="Category"><Badge variant="outline">{card.category}</Badge></Row>
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
                {card.datePurchased
                  ? new Date(card.datePurchased).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </Row>
              <Row label="Where Bought">{card.whereBought || '—'}</Row>
              {card.psaGrade && (
                <Row label="PSA Grade">
                  <Badge className="bg-chart-4/20 text-chart-4">PSA {card.psaGrade}</Badge>
                </Row>
              )}
              {card.notes && (
                <Row label="Notes"><span className="whitespace-pre-wrap text-left">{card.notes}</span></Row>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setSellDialogOpen(true)}
              disabled={card.quantity === 0}
              className="gap-2 mr-auto"
              title={card.quantity === 0 ? 'No stock to sell' : undefined}
            >
              <DollarSign className="h-4 w-4" />Sell
            </Button>
            <Button variant="outline" onClick={handleEdit} className="gap-2">
              <Pencil className="h-4 w-4" />Edit
            </Button>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)} className="gap-2">
              <Trash2 className="h-4 w-4" />Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sell dialog */}
      <SellDialog
        card={card}
        open={sellDialogOpen}
        onOpenChange={setSellDialogOpen}
        onSell={(updatedCard) => {
          onSell?.(updatedCard);
          setSellDialogOpen(false);
        }}
      />

      {/* Lightbox — nested Radix Dialog so Radix manages the layer stack:
          Escape closes only the lightbox, not the card-detail dialog underneath */}
      {card.imageUrl && (
        <Dialog open={lightboxOpen} onOpenChange={(v) => { if (!v) closeLightbox(); }}>
          <DialogContent
            className="fixed inset-0 left-0 top-0 m-0 flex h-screen w-screen max-w-none translate-x-0 translate-y-0 flex-col items-stretch justify-stretch overflow-hidden rounded-none border-0 bg-black p-0 select-none [&>button:last-child]:z-20 [&>button:last-child]:text-white [&>button:last-child]:opacity-80 [&>button:last-child]:hover:opacity-100 [&>button:last-child]:focus:ring-white"
          >
            {/* Interaction layer: covers full area, backdrop click closes */}
            <div
              ref={interactionRef}
              className="absolute inset-0 flex items-center justify-center"
              onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                style={{
                  transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'zoom-in',
                  willChange: 'transform',
                }}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={card.imageUrl}
                  alt={card.cardName}
                  className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
                  draggable={false}
                />
              </div>
            </div>

            {/* Zoom controls — above the interaction layer */}
            <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
              <button
                className="text-white transition-colors hover:text-white/60 disabled:opacity-30"
                onClick={zoomOut}
                disabled={scale <= 1}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="min-w-[3.5rem] text-center text-sm tabular-nums text-white">
                {Math.round(scale * 100)}%
              </span>
              <button
                className="text-white transition-colors hover:text-white/60 disabled:opacity-30"
                onClick={zoomIn}
                disabled={scale >= 5}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>

            {scale === 1 && (
              <p className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 pointer-events-none text-xs text-white/40">
                scroll or pinch to zoom · double-click to toggle
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
