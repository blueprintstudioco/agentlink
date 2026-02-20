import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Singleton browser client to maintain session across realtime
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

// Browser client for client components
export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
  
  return browserClient;
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

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  trigger_type: 'manual' | 'schedule' | 'webhook' | 'task_complete' | 'message';
  trigger_config: Record<string, unknown>;
  steps: WorkflowStep[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  type: 'agent_call' | 'condition' | 'transform' | 'delay' | 'webhook' | 'set_context';
  name: string;
  config: Record<string, unknown>;
  on_success?: string;
  on_failure?: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  current_step: number;
  context: Record<string, unknown>;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface Task {
  id: string;
  thread_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string | null;
  status: 'pending' | 'in_progress' | 'review' | 'complete' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  deliverable: string | null;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}
