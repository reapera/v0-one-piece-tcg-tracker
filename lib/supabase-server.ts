import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder';

export function createAnonClient(): SupabaseClient {
  return createClient(url, anonKey);
}

export function createAuthClient(token: string): SupabaseClient {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export interface AuthContext {
  userId: string;
  client: SupabaseClient;
}

export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const client = createAuthClient(token);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  return { userId: user.id, client };
}

export async function requireAuthContext(req: NextRequest): Promise<AuthContext> {
  const ctx = await getAuthContext(req);
  if (!ctx) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  return ctx;
}
