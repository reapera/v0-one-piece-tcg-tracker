'use client';

import { useState, useEffect } from 'react';
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
  POPULAR_SETS,
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
  set: '',
  category: 'Character' as CardCategory,
  colors: [] as CardColor[],
  rarity: 'C' as CardRarity,
  variant: 'Standard' as CardVariant,
  language: 'EN' as CardLanguage,
  quantity: 1,
  condition: 'Near Mint' as CardCondition,
  buyPrice: 0,
  datePurchased: new Date().toISOString().split('T')[0],
  whereBought: '',
  psaGrade: undefined as number | undefined,
  notes: '',
};

export function CardForm({
  open,
  onOpenChange,
  onSubmit,
  editCard,
}: CardFormProps) {
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (editCard) {
      setFormData({
        cardNumber: editCard.cardNumber,
        cardName: editCard.cardName,
        set: editCard.set,
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
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [editCard, open]);

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
      psaGrade: formData.psaGrade || undefined,
      notes: formData.notes || undefined,
    });
    setFormData(defaultFormData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
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
          <div className="grid grid-cols-2 gap-4">
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

          {/* Set and Category */}
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Set *</FieldLabel>
              <Select
                value={formData.set}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, set: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select set" />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_SETS.map((set) => (
                    <SelectItem key={set} value={set}>
                      {set}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-3 gap-4">
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
              <FieldLabel>Buy Price ($) *</FieldLabel>
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
          <div className="grid grid-cols-2 gap-4">
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={formData.colors.length === 0}>
              {editCard ? 'Update Card' : 'Add Card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
