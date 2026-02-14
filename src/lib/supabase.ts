import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Browser client for client components
export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Server-side Supabase client with service role (bypasses RLS)
// Lazy initialization to avoid client-side errors
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabaseAdmin;
}

// For backwards compatibility
export const supabaseAdmin = typeof window === 'undefined' 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  : (null as unknown as SupabaseClient);

// Types
export interface User {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  api_key: string;
  avatar_url: string | null;
  is_public: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  agent_id: string;
  session_key: string;
  kind: string | null;
  label: string | null;
  channel: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: string;
  content: string | null;
  content_json: unknown;
  metadata: unknown;
  timestamp: string;
  created_at: string;
}
