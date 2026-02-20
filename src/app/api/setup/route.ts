import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create mc_messages table
export async function POST() {
  // Use raw SQL via rpc or just try to create
  // Since we can't run raw DDL easily, let's check if table exists
  // and return instructions
  
  const { data, error } = await supabase
    .from('mc_messages')
    .select('id')
    .limit(1);

  if (error && error.code === 'PGRST205') {
    // Table doesn't exist - return SQL to run
    const sql = `
CREATE TABLE mc_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES mc_users(id) ON DELETE CASCADE,
  from_agent TEXT,
  to_agent TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX mc_messages_user_agent_idx ON mc_messages(user_id, to_agent);
CREATE INDEX mc_messages_pending_idx ON mc_messages(to_agent, status) WHERE status = 'pending';
ALTER PUBLICATION supabase_realtime ADD TABLE mc_messages;
`;
    return NextResponse.json({ 
      exists: false, 
      message: 'Run this SQL in Supabase SQL Editor',
      sql 
    });
  }

  return NextResponse.json({ exists: true, message: 'Table already exists' });
}
