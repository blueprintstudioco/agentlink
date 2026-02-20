import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USER_ID = '9452a23f-a139-42cd-83e4-732f188a07ff';

// Bootstrap table if needed
async function ensureTable() {
  const { error } = await supabase.rpc('create_mc_messages_if_not_exists');
  if (error && !error.message.includes('already exists')) {
    console.error('Table bootstrap error:', error);
  }
}

// GET - fetch messages for a conversation
export async function GET(request: NextRequest) {
  const agent = request.nextUrl.searchParams.get('agent') || 'pip';
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
  
  const { data, error } = await supabase
    .from('mc_messages')
    .select('*')
    .eq('user_id', USER_ID)
    .or(`to_agent.eq.${agent},from_agent.eq.${agent}`)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    // Table might not exist
    if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
      return NextResponse.json({ messages: [], needsSetup: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data || [] });
}

// POST - send a message
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { content, to_agent = 'pip', from_agent = null } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mc_messages')
    .insert({
      user_id: USER_ID,
      from_agent,
      to_agent,
      content: content.trim(),
      status: from_agent ? 'delivered' : 'pending'
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
