'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compress-image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, ImageIcon, X, Link, ClipboardPaste, ScanLine, Loader2, ChevronDown, Minus, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import type {
  Card,
  CardColor,
  CardRarity,
  CardCategory,
  CardVariant,
  CardLanguage,
  CardCondition,
} from '@/lib/types';
import {
  CARD_COLORS,
  CARD_RARITIES,
  CARD_CATEGORIES,
  CARD_VARIANTS,
  CARD_LANGUAGES,
  CARD_CONDITIONS,
  RARITY_LABELS,
} from '@/lib/types';

interface CardFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (card: Omit<Card, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<Omit<Card, 'id'>>) => void;
  editCard?: Card | null;
}

const defaultFormData = {
  cardNumber: '',
  cardName: '',
  category: 'Character' as CardCategory,
  colors: [] as CardColor[],
  rarity: 'C' as CardRarity,
  variant: 'Standard' as CardVariant,
  language: 'JP' as CardLanguage,
  quantity: 1,
  condition: 'Near Mint' as CardCondition,
  buyPrice: 0,
  datePurchased: new Date().toISOString().split('T')[0],
  whereBought: '',
  psaGrade: undefined as number | undefined,
  notes: '',
  imageUrl: '' as string,
};

export function CardForm({
  open,
  onOpenChange,
  onSubmit,
  onUpdate,
  editCard,
}: CardFormProps) {
  const [formData, setFormData] = useState(defaultFormData);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [scanImageData, setScanImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [showCardDetails, setShowCardDetails] = useState(true);
  const [duplicateCard, setDuplicateCard] = useState<Card | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editCard) {
      setFormData({
        cardNumber: editCard.cardNumber,
        cardName: editCard.cardName,
        category: editCard.category,
        colors: editCard.colors,
        rarity: editCard.rarity,
        variant: editCard.variant,
        language: editCard.language,
        quantity: editCard.quantity,
        condition: editCard.condition,
        buyPrice: editCard.buyPrice,
        datePurchased: editCard.datePurchased,
        whereBought: editCard.whereBought,
        psaGrade: editCard.psaGrade,
        notes: editCard.notes || '',
        imageUrl: editCard.imageUrl || '',
      });
    } else {
      setFormData(defaultFormData);
    }
    setUrlInput('');
    setShowUrlInput(false);
    setLocalPreview(null);
    setScanImageData(null);
    setScanStatus('idle');
    setShowCardDetails(true);
    setDuplicateCard(null);
    setIsCheckingDuplicate(false);
  }, [editCard, open]);

  const uploadImageFile = async (file: File) => {
    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);
    setIsUploading(true);
    setScanImageData(null);
    setScanStatus('idle');
    try {
      const compressed = await compressImage(file, 200 * 1024);

      // Store base64 of compressed image for scanning
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });
      setScanImageData({ base64, mimeType: 'image/jpeg' });

      const path = `${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from('card-images')
        .upload(path, compressed, { contentType: 'image/jpeg' });
      if (error) { console.error('Failed to upload image:', error.message); return; }
      const { data: { publicUrl } } = supabase.storage.from('card-images').getPublicUrl(path);
      setFormData((prev) => ({ ...prev, imageUrl: publicUrl }));
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(preview);
      setLocalPreview(null);
    }
  };

  // Listen for Cmd+V / Ctrl+V while the modal is open
  useEffect(() => {
    if (!open || formData.imageUrl) return;
    const handlePaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith('image/'),
      );
      if (!item) return;
      const file = item.getAsFile();
      if (file) uploadImageFile(file);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [open, formData.imageUrl]);

  const handleClipboardPaste = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          await uploadImageFile(new File([blob], 'clipboard.png', { type: imageType }));
          break;
        }
      }
    } catch {
      console.error('Clipboard access denied — try Cmd+V instead.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadImageFile(file);
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    setUrlInput('');
    setShowUrlInput(false);
    setScanImageData(null);
    setScanStatus('idle');
  };

  const handleUrlConfirm = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      setFormData((prev) => ({ ...prev, imageUrl: trimmed }));
      setShowUrlInput(false);
    }
  };

  const handleScanCard = async () => {
    if (!scanImageData) return;
    setScanStatus('scanning');
    try {
      const res = await fetch('/api/scan-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: scanImageData.base64, mimeType: scanImageData.mimeType }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        ...(data.cardNumber ? { cardNumber: String(data.cardNumber).toUpperCase() } : {}),
        ...(data.cardName ? { cardName: data.cardName } : {}),
        ...(data.category && CARD_CATEGORIES.includes(data.category)
          ? { category: data.category as CardCategory } : {}),
        ...(data.color
          ? { colors: (Array.isArray(data.color) ? data.color : [data.color])
              .filter((c: string) => CARD_COLORS.includes(c as CardColor)) as CardColor[] }
          : {}),
        ...(data.rarity && CARD_RARITIES.includes(data.rarity)
          ? { rarity: data.rarity as CardRarity } : {}),
        ...(data.language && CARD_LANGUAGES.includes(data.language)
          ? { language: data.language as CardLanguage } : {}),
      }));
      setScanStatus('success');
      setShowCardDetails(false);
    } catch (err) {
      console.error('Scan failed:', err);
      setScanStatus('error');
    }
  };

  const handleColorToggle = (color: CardColor) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter((c) => c !== color)
        : [...prev.colors, color],
    }));
  };

  const buildCardPayload = () => ({
    ...formData,
    cardName: formData.cardName
      .trim()
      .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
    cardNumber: formData.cardNumber.trim().toUpperCase(),
    psaGrade: formData.psaGrade || undefined,
    notes: formData.notes || undefined,
    imageUrl: formData.imageUrl || undefined,
  });

  const closeAndReset = () => {
    setFormData(defaultFormData);
    setDuplicateCard(null);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateCard) return; // already showing duplicate prompt

    // Skip duplicate check when editing an existing card
    if (editCard) {
      onSubmit(buildCardPayload());
      closeAndReset();
      return;
    }

    const cardNumber = formData.cardNumber.trim().toUpperCase();
    const { language, variant } = formData;

    if (!cardNumber) {
      onSubmit(buildCardPayload());
      closeAndReset();
      return;
    }

    setIsCheckingDuplicate(true);
    try {
      const res = await fetch(
        `/api/cards/duplicate?cardNumber=${encodeURIComponent(cardNumber)}&language=${encodeURIComponent(language)}&variant=${encodeURIComponent(variant)}`,
      );
      const data = await res.json();
      if (data.duplicate) {
        setDuplicateCard(data.duplicate as Card);
        return; // show inline confirmation — don't submit yet
      }
    } catch {
      // If the check fails, proceed with normal save
    } finally {
      setIsCheckingDuplicate(false);
    }

    onSubmit(buildCardPayload());
    closeAndReset();
  };

  const handleBumpQty = () => {
    if (!duplicateCard || !onUpdate) return;
    const newQty = duplicateCard.quantity + 1;
    const avgPrice =
      Math.round(((duplicateCard.buyPrice * duplicateCard.quantity + formData.buyPrice) / newQty) * 100) / 100;
    onUpdate(duplicateCard.id, { quantity: newQty, buyPrice: avgPrice });
    closeAndReset();
  };

  const handleSaveAsNew = () => {
    onSubmit(buildCardPayload());
    closeAndReset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[100dvh] w-full flex-col overflow-y-auto sm:max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-primary">
            {editCard ? 'Edit Card' : 'Add New Card'}
          </DialogTitle>
          <DialogDescription>
            {editCard
              ? 'Update the details of your card below.'
              : 'Fill in the details to add a new card to your collection.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card Image + Scan */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Card Image</span>
              <span className="text-xs text-muted-foreground">— upload to scan and auto-fill</span>
            </div>

            {formData.imageUrl || isUploading ? (
              <div className="flex items-start gap-3">
                {/* Preview */}
                <div className="relative shrink-0">
                  {formData.imageUrl ? (
                    <img
                      src={formData.imageUrl}
                      alt="Card preview"
                      className="h-24 w-auto rounded-lg border border-border object-contain"
                    />
                  ) : (
                    <div className="flex h-24 w-16 items-center justify-center rounded-lg border border-border bg-muted/30">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!isUploading && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                      onClick={removeImage}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove image</span>
                    </Button>
                  )}
                </div>

                {/* Status + scan button */}
                <div className="flex-1 space-y-2 pt-1">
                  {isUploading && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading...
                    </p>
                  )}
                  {!isUploading && scanImageData && scanStatus !== 'scanning' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={handleScanCard}
                    >
                      <ScanLine className="h-4 w-4" />
                      Scan Card
                    </Button>
                  )}
                  {scanStatus === 'scanning' && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Scanning card...
                    </p>
                  )}
                  {scanStatus === 'success' && (
                    <p className="rounded-md border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-400">
                      Card scanned successfully — please review the fields
                    </p>
                  )}
                  {scanStatus === 'error' && (
                    <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                      Scan failed — please fill in manually
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()} className="flex-1" disabled={isUploading}>
                    <Camera className="mr-2 h-4 w-4" />
                    Take Photo
                  </Button>
                  <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => galleryInputRef.current?.click()} className="flex-1" disabled={isUploading}>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Choose from Gallery
                  </Button>
                  <Button type="button" variant="outline" onClick={handleClipboardPaste} disabled={isUploading} className="gap-2 sm:px-3" title="Paste image (Cmd+V)">
                    <ClipboardPaste className="h-4 w-4" />
                    <span className="sm:hidden">Paste Image</span>
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowUrlInput((v) => !v)} disabled={isUploading} className="gap-2 sm:px-3">
                    <Link className="h-4 w-4" />
                    <span className="sm:hidden">Paste URL</span>
                  </Button>
                </div>
                {showUrlInput && (
                  <div className="flex gap-2">
                    <Input placeholder="https://example.com/card.jpg" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlConfirm())} autoFocus />
                    <Button type="button" onClick={handleUrlConfirm} disabled={!urlInput.trim()}>Use</Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Quick Fill (always visible, always manual) ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel>Buy Price (Rp) *</FieldLabel>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={formData.buyPrice}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, buyPrice: parseFloat(e.target.value) || 0 }))
                }
                required
              />
            </Field>
            <Field>
              <FieldLabel>Condition *</FieldLabel>
              <Select
                value={formData.condition}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, condition: value as CardCondition }))
                }
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARD_CONDITIONS.map((cond) => (
                    <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Quantity *</FieldLabel>
              <div className="flex items-center rounded-md border border-input bg-background">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-none rounded-l-md border-r border-input"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))
                  }
                  disabled={formData.quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))
                  }
                  required
                  className="h-9 rounded-none border-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-none rounded-r-md border-l border-input"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, quantity: prev.quantity + 1 }))
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Date Purchased *</FieldLabel>
              <Input
                type="date"
                value={formData.datePurchased}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, datePurchased: e.target.value }))
                }
                required
              />
            </Field>
            <Field>
              <FieldLabel>Where Bought</FieldLabel>
              <Input
                placeholder="e.g., TCGPlayer, Local Shop"
                value={formData.whereBought}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, whereBought: e.target.value }))
                }
              />
            </Field>
          </div>

          {/* ── Card Details (auto-filled, collapsible) ── */}
          <div className="rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCardDetails((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">Card Details</span>
                {!showCardDetails && (formData.cardNumber || formData.cardName) && (
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {[formData.cardNumber, formData.cardName, formData.rarity, formData.language]
                      .filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${showCardDetails ? 'rotate-180' : ''}`}
              />
            </button>

            {showCardDetails && (
              <div className="space-y-4 border-t border-border px-4 pb-4 pt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Card Number *</FieldLabel>
                    <Input
                      placeholder="e.g., OP01-001"
                      value={formData.cardNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, cardNumber: e.target.value }))
                      }
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Card Name *</FieldLabel>
                    <Input
                      placeholder="e.g., Monkey D. Luffy"
                      value={formData.cardName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, cardName: e.target.value }))
                      }
                      required
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Category *</FieldLabel>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, category: value as CardCategory }))
                      }
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CARD_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Rarity *</FieldLabel>
                    <Select
                      value={formData.rarity}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, rarity: value as CardRarity }))
                      }
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CARD_RARITIES.map((rarity) => (
                          <SelectItem key={rarity} value={rarity}>
                            {rarity} - {RARITY_LABELS[rarity]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field>
                  <FieldLabel>Colors *</FieldLabel>
                  <div className="flex flex-wrap gap-3 rounded-md border border-border bg-input/30 p-3">
                    {CARD_COLORS.map((color) => (
                      <label key={color} className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                          checked={formData.colors.includes(color)}
                          onCheckedChange={() => handleColorToggle(color)}
                        />
                        <span className={`rounded px-2 py-0.5 text-xs font-medium badge-${color.toLowerCase()}`}>
                          {color}
                        </span>
                      </label>
                    ))}
                  </div>
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Language *</FieldLabel>
                    <Select
                      value={formData.language}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, language: value as CardLanguage }))
                      }
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CARD_LANGUAGES.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang === 'EN' ? 'English' : 'Japanese'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Variant *</FieldLabel>
                    <Select
                      value={formData.variant}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, variant: value as CardVariant }))
                      }
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CARD_VARIANTS.map((variant) => (
                          <SelectItem key={variant} value={variant}>{variant}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            )}
          </div>

          {/* ── More Details (always visible) ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>PSA Grade</FieldLabel>
              <Input
                type="number"
                min={1}
                max={10}
                placeholder="1-10"
                value={formData.psaGrade || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    psaGrade: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel>Notes</FieldLabel>
              <Textarea
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
              />
            </Field>
          </div>

          {/* Duplicate card warning */}
          {duplicateCard && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-yellow-400">Duplicate card detected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You already own <span className="font-medium text-foreground">{duplicateCard.quantity}×</span>{' '}
                  <span className="font-medium text-foreground">{duplicateCard.cardName}</span>{' '}
                  ({duplicateCard.cardNumber} · {duplicateCard.variant} · {duplicateCard.language}) at{' '}
                  Rp{duplicateCard.buyPrice.toLocaleString('id-ID')}/card
                </p>
                {onUpdate && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    New avg price:{' '}
                    <span className="font-medium text-foreground">
                      Rp{(
                        Math.round(
                          ((duplicateCard.buyPrice * duplicateCard.quantity + formData.buyPrice) /
                            (duplicateCard.quantity + 1)) * 100,
                        ) / 100
                      ).toLocaleString('id-ID')}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {onUpdate && (
                  <Button type="button" size="sm" onClick={handleBumpQty}>
                    +1 Qty (avg price)
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" onClick={handleSaveAsNew}>
                  Save as new entry
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setDuplicateCard(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formData.colors.length === 0 || isUploading || isCheckingDuplicate || !!duplicateCard}
            >
              {isCheckingDuplicate ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : editCard ? 'Update Card' : 'Add Card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
