'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react';
import Link from 'next/link';

export function AuthButton() {
  const { user, signOut, isLoading } = useAuth();

  if (isLoading) return <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />;

  if (!user) {
    return (
      <Link href="/login">
        <Button variant="outline" size="sm" className="gap-2">
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Sign In</span>
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[120px] truncate text-xs text-muted-foreground sm:inline">
        {user.email}
      </span>
      <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sign Out</span>
      </Button>
    </div>
  );
}
