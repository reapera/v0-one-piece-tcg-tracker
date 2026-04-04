'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import {
  CARD_COLORS,
  CARD_RARITIES,
  CARD_CATEGORIES,
  CARD_LANGUAGES,
  CARD_CONDITIONS,
  POPULAR_SETS,
  RARITY_LABELS,
  type CardColor,
  type CardRarity,
  type CardCategory,
  type CardLanguage,
  type CardCondition,
} from '@/lib/types';

export interface Filters {
  search: string;
  set: string;
  color: CardColor | '';
  rarity: CardRarity | '';
  category: CardCategory | '';
  language: CardLanguage | '';
  condition: CardCondition | '';
}

interface CollectionFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function CollectionFilters({
  filters,
  onFiltersChange,
}: CollectionFiltersProps) {
  const hasActiveFilters =
    filters.search ||
    filters.set ||
    filters.color ||
    filters.rarity ||
    filters.category ||
    filters.language ||
    filters.condition;

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      set: '',
      color: '',
      rarity: '',
      category: '',
      language: '',
      condition: '',
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by card name or number..."
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="pl-10"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Select
          value={filters.set}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, set: value === 'all' ? '' : value })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Set" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sets</SelectItem>
            {POPULAR_SETS.map((set) => (
              <SelectItem key={set} value={set}>
                {set}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.color || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              color: value === 'all' ? '' : (value as CardColor),
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colors</SelectItem>
            {CARD_COLORS.map((color) => (
              <SelectItem key={color} value={color}>
                {color}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.rarity || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              rarity: value === 'all' ? '' : (value as CardRarity),
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Rarity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rarities</SelectItem>
            {CARD_RARITIES.map((rarity) => (
              <SelectItem key={rarity} value={rarity}>
                {rarity} - {RARITY_LABELS[rarity]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              category: value === 'all' ? '' : (value as CardCategory),
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CARD_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.language || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              language: value === 'all' ? '' : (value as CardLanguage),
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {CARD_LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang === 'EN' ? 'English' : 'Japanese'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.condition || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              condition: value === 'all' ? '' : (value as CardCondition),
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            {CARD_CONDITIONS.map((cond) => (
              <SelectItem key={cond} value={cond}>
                {cond}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
