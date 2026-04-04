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
import { Camera, ImageIcon, X, Link, ClipboardPaste } from 'lucide-react';
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
  editCard,
}: CardFormProps) {
  const [formData, setFormData] = useState(defaultFormData);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

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
  }, [editCard, open]);

  const uploadImageFile = async (file: File) => {
    setIsUploading(true);
    try {
      const compressed = await compressImage(file, 200 * 1024);
      const path = `${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from('card-images')
        .upload(path, compressed, { contentType: 'image/jpeg' });
      if (error) { console.error('Failed to upload image:', error.message); return; }
      const { data: { publicUrl } } = supabase.storage.from('card-images').getPublicUrl(path);
      setFormData((prev) => ({ ...prev, imageUrl: publicUrl }));
    } finally {
      setIsUploading(false);
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
  };

  const handleUrlConfirm = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      setFormData((prev) => ({ ...prev, imageUrl: trimmed }));
      setShowUrlInput(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      cardName: formData.cardName
        .trim()
        .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
      cardNumber: formData.cardNumber.trim().toUpperCase(),
      psaGrade: formData.psaGrade || undefined,
      notes: formData.notes || undefined,
      imageUrl: formData.imageUrl || undefined,
    });
    setFormData(defaultFormData);
    onOpenChange(false);
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
          {/* Basic Info */}
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

          {/* Category */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Category *</FieldLabel>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: value as CardCategory,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Colors Multi-select */}
          <Field>
            <FieldLabel>Colors *</FieldLabel>
            <div className="flex flex-wrap gap-3 rounded-md border border-border bg-input/30 p-3">
              {CARD_COLORS.map((color) => (
                <label
                  key={color}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Checkbox
                    checked={formData.colors.includes(color)}
                    onCheckedChange={() => handleColorToggle(color)}
                  />
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium badge-${color.toLowerCase()}`}
                  >
                    {color}
                  </span>
                </label>
              ))}
            </div>
          </Field>

          {/* Rarity and Variant */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Rarity *</FieldLabel>
              <Select
                value={formData.rarity}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, rarity: value as CardRarity }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_RARITIES.map((rarity) => (
                    <SelectItem key={rarity} value={rarity}>
                      {rarity} - {RARITY_LABELS[rarity]}
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
                  setFormData((prev) => ({
                    ...prev,
                    variant: value as CardVariant,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_VARIANTS.map((variant) => (
                    <SelectItem key={variant} value={variant}>
                      {variant}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Language and Condition */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Language *</FieldLabel>
              <Select
                value={formData.language}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    language: value as CardLanguage,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
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
              <FieldLabel>Condition *</FieldLabel>
              <Select
                value={formData.condition}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    condition: value as CardCondition,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_CONDITIONS.map((cond) => (
                    <SelectItem key={cond} value={cond}>
                      {cond}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel>Quantity *</FieldLabel>
              <Input
                type="number"
                min={1}
                value={formData.quantity}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 1,
                  }))
                }
                required
              />
            </Field>

            <Field>
              <FieldLabel>Buy Price (Rp) *</FieldLabel>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={formData.buyPrice}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    buyPrice: parseFloat(e.target.value) || 0,
                  }))
                }
                required
              />
            </Field>

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
                    psaGrade: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  }))
                }
              />
            </Field>
          </div>

          {/* Purchase Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Date Purchased *</FieldLabel>
              <Input
                type="date"
                value={formData.datePurchased}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    datePurchased: e.target.value,
                  }))
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
                  setFormData((prev) => ({
                    ...prev,
                    whereBought: e.target.value,
                  }))
                }
              />
            </Field>
          </div>

          {/* Notes */}
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

          {/* Card Image */}
          <Field>
            <FieldLabel>Card Image</FieldLabel>
            <div className="space-y-3">
              {formData.imageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={formData.imageUrl}
                    alt="Card preview"
                    className="h-48 w-auto rounded-lg border border-border object-contain"
                  />
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
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                    {/* Camera Input */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="camera-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1"
                      disabled={isUploading}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {isUploading ? 'Uploading...' : 'Take Photo'}
                    </Button>

                    {/* Gallery Input */}
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="gallery-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex-1"
                      disabled={isUploading}
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      {isUploading ? 'Uploading...' : 'Choose from Gallery'}
                    </Button>

                    {/* Clipboard paste */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClipboardPaste}
                      disabled={isUploading}
                      className="gap-2 sm:px-3"
                      title="Paste image (Cmd+V)"
                    >
                      <ClipboardPaste className="h-4 w-4" />
                      <span className="sm:hidden">Paste Image</span>
                    </Button>

                    {/* URL toggle */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowUrlInput((v) => !v)}
                      disabled={isUploading}
                      className="gap-2 sm:px-3"
                    >
                      <Link className="h-4 w-4" />
                      <span className="sm:hidden">Paste URL</span>
                    </Button>
                  </div>

                  {/* URL input row */}
                  {showUrlInput && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://example.com/card.jpg"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlConfirm())}
                        autoFocus
                      />
                      <Button type="button" onClick={handleUrlConfirm} disabled={!urlInput.trim()}>
                        Use
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={formData.colors.length === 0 || isUploading}>
              {editCard ? 'Update Card' : 'Add Card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
