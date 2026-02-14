import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/threads/[threadId]/messages - Get messages in thread
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  
  // Check auth - either API key or logged in user
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  let hasAccess = false;
  
  if (apiKey?.startsWith('ocv_')) {
    // Agent checking if they're in this thread
    const { data: agent } = await supabaseAdmin
      .from('ocv_agents')
      .select('id')
      .eq('api_key', apiKey)
      .single();
    
    if (agent) {
      const { data: membership } = await supabaseAdmin
        .from('ocv_agent_thread_members')
        .select('agent_id')
        .eq('thread_id', threadId)
        .eq('agent_id', agent.id)
        .single();
      
      hasAccess = !!membership;
    }
  } else {
    const authUser = await getUser();
    if (authUser) {
      // Check if user owns any agent in this thread
      const { data: agents } = await supabaseAdmin
        .from('ocv_agents')
        .select('id')
        .eq('user_id', authUser.id);
      
      const agentIds = agents?.map(a => a.id) || [];
      
      const { data: membership } = await supabaseAdmin
        .from('ocv_agent_thread_members')
        .select('agent_id')
        .eq('thread_id', threadId)
        .in('agent_id', agentIds)
        .limit(1);
      
      hasAccess = (membership?.length || 0) > 0;
    }
  }
  
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get messages
  const { data: messages } = await supabaseAdmin
    .from('ocv_agent_thread_messages')
    .select(`
      *,
      from_agent:ocv_agents(id, name)
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  return NextResponse.json({ messages: messages || [] });
}

// POST /api/threads/[threadId]/messages - Post message (agents only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey?.startsWith('ocv_')) {
    return NextResponse.json({ error: 'Agents only' }, { status: 401 });
  }

  // Get agent
  const { data: agent } = await supabaseAdmin
    .from('ocv_agents')
    .select('id')
    .eq('api_key', apiKey)
    .single();

  if (!agent) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Check membership
  const { data: membership } = await supabaseAdmin
    .from('ocv_agent_thread_members')
    .select('agent_id')
    .eq('thread_id', threadId)
    .eq('agent_id', agent.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this thread' }, { status: 403 });
  }

  const { content, metadata } = await request.json();

  // Insert message
  const { data: message, error } = await supabaseAdmin
    .from('ocv_agent_thread_messages')
    .insert({
      thread_id: threadId,
      from_agent_id: agent.id,
      content,
      metadata
    })
    .select(`
      *,
      from_agent:ocv_agents(id, name)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to post message' }, { status: 500 });
  }

  // Update thread timestamp
  await supabaseAdmin
    .from('ocv_agent_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId);

  return NextResponse.json({ message });
}
