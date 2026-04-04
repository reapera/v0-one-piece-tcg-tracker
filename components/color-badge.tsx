'use client';

import { cn } from '@/lib/utils';
import type { CardColor } from '@/lib/types';

interface ColorBadgeProps {
  color: CardColor;
  className?: string;
}

const colorClasses: Record<CardColor, string> = {
  Red: 'badge-red',
  Green: 'badge-green',
  Blue: 'badge-blue',
  Purple: 'badge-purple',
  Black: 'badge-black',
  Yellow: 'badge-yellow',
};

export function ColorBadge({ color, className }: ColorBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        colorClasses[color],
        className
      )}
    >
      {color}
    </span>
  );
}
