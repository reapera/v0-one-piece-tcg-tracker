'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ColorBadge } from './color-badge';
import { MoreHorizontal, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ImageIcon } from 'lucide-react';
import type { Card } from '@/lib/types';
import { RARITY_LABELS } from '@/lib/types';

interface CollectionTableProps {
  cards: Card[];
  onEdit: (card: Card) => void;
  onDelete: (id: string) => void;
}

type SortKey = keyof Card | 'totalValue';
type SortOrder = 'asc' | 'desc';

export function CollectionTable({ cards, onEdit, onDelete }: CollectionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('cardNumber');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortKey === 'totalValue') {
        aVal = a.buyPrice * a.quantity;
        bVal = b.buyPrice * b.quantity;
      } else if (sortKey === 'colors') {
        aVal = a.colors.join(',');
        bVal = b.colors.join(',');
      } else {
        aVal = a[sortKey] as string | number;
        bVal = b[sortKey] as string | number;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [cards, sortKey, sortOrder]);

  const SortButton = ({ column, label }: { column: SortKey; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 text-xs font-medium text-foreground hover:bg-transparent hover:text-primary"
      onClick={() => handleSort(column)}
    >
      {label}
      {sortKey === column ? (
        sortOrder === 'asc' ? (
          <ArrowUp className="ml-1 h-3 w-3" />
        ) : (
          <ArrowDown className="ml-1 h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
      )}
    </Button>
  );

  const confirmDelete = () => {
    if (deleteCardId) {
      onDelete(deleteCardId);
      setDeleteCardId(null);
    }
  };

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-16">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">No cards found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first card to start tracking your collection!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead className="w-[100px]">
                <SortButton column="cardNumber" label="Card #" />
              </TableHead>
              <TableHead>
                <SortButton column="cardName" label="Name" />
              </TableHead>
              <TableHead>
                <SortButton column="category" label="Category" />
              </TableHead>
              <TableHead>Color</TableHead>
              <TableHead>
                <SortButton column="rarity" label="Rarity" />
              </TableHead>
              <TableHead>
                <SortButton column="variant" label="Variant" />
              </TableHead>
              <TableHead>
                <SortButton column="language" label="Lang" />
              </TableHead>
              <TableHead className="text-right">
                <SortButton column="quantity" label="Qty" />
              </TableHead>
              <TableHead>
                <SortButton column="condition" label="Condition" />
              </TableHead>
              <TableHead className="text-right">
                <SortButton column="buyPrice" label="Price" />
              </TableHead>
              <TableHead className="text-right">
                <SortButton column="totalValue" label="Total" />
              </TableHead>
              <TableHead>
                <SortButton column="datePurchased" label="Purchased" />
              </TableHead>
              <TableHead>PSA</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCards.map((card) => (
              <TableRow key={card.id} className="border-border hover:bg-secondary/30">
                <TableCell>
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.cardName}
                      className="h-12 w-auto rounded border border-border object-contain"
                    />
                  ) : (
                    <div className="flex h-12 w-9 items-center justify-center rounded border border-dashed border-border bg-muted/30">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm text-primary">
                  {card.cardNumber}
                </TableCell>
                <TableCell className="font-medium">{card.cardName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {card.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {card.colors.map((color) => (
                      <ColorBadge key={color} color={color} />
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                    {card.rarity}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{card.variant}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {card.language}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {card.quantity}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {card.condition}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  Rp{card.buyPrice.toLocaleString('id-ID')}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-primary">
                  Rp{(card.buyPrice * card.quantity).toLocaleString('id-ID')}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(card.datePurchased).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {card.psaGrade ? (
                    <Badge className="bg-chart-4/20 text-chart-4">
                      PSA {card.psaGrade}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(card)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteCardId(card.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deleteCardId}
        onOpenChange={(open) => !open && setDeleteCardId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this card from your collection?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
