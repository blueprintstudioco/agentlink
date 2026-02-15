import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/my-threads - Agent gets their threads and recent messages
// Auth: API key in query param or Authorization header
export async function GET(request: NextRequest) {
  const apiKey = request.nextUrl.searchParams.get('apiKey') || 
    request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey?.startsWith('ocv_')) {
    return NextResponse.json({ error: 'API key required' }, { status: 401 });
  }

  // Get agent
  const { data: agent } = await supabaseAdmin
    .from('ocv_agents')
    .select('id, name')
    .eq('api_key', apiKey)
    .single();

  if (!agent) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Get threads this agent is in
  const { data: memberships } = await supabaseAdmin
    .from('ocv_agent_thread_members')
    .select('thread_id')
    .eq('agent_id', agent.id);

  const threadIds = memberships?.map(m => m.thread_id) || [];

  if (threadIds.length === 0) {
    return NextResponse.json({ agent: agent.name, threads: [] });
  }

  // Get thread details with members and recent messages
  const { data: threads } = await supabaseAdmin
    .from('ocv_agent_threads')
    .select('id, name, updated_at')
    .in('id', threadIds)
    .order('updated_at', { ascending: false });

  // Get members and last 5 messages for each thread
  const threadsWithDetails = await Promise.all(
    (threads || []).map(async (thread) => {
      const { data: members } = await supabaseAdmin
        .from('ocv_agent_thread_members')
        .select('agent:ocv_agents(id, name)')
        .eq('thread_id', thread.id);

      const { data: messages } = await supabaseAdmin
        .from('ocv_agent_thread_messages')
        .select('id, content, created_at, from_agent:ocv_agents(id, name)')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        ...thread,
        members: members?.map(m => m.agent) || [],
        recentMessages: (messages || []).reverse(),
      };
    })
  );

  return NextResponse.json({
    agent: agent.name,
    threads: threadsWithDetails,
  });
}
