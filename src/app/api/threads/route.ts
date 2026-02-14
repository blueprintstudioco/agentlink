import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/threads - List threads for user's agents
export async function GET() {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's agents
  const { data: agents } = await supabaseAdmin
    .from('ocv_agents')
    .select('id')
    .eq('user_id', authUser.id);

  const agentIds = agents?.map(a => a.id) || [];
  
  if (agentIds.length === 0) {
    return NextResponse.json({ threads: [] });
  }

  // Get threads that have at least one of user's agents
  const { data: memberships } = await supabaseAdmin
    .from('ocv_agent_thread_members')
    .select('thread_id')
    .in('agent_id', agentIds);

  const threadIds = [...new Set(memberships?.map(m => m.thread_id) || [])];
  
  if (threadIds.length === 0) {
    return NextResponse.json({ threads: [] });
  }

  // Get thread details
  const { data: threads } = await supabaseAdmin
    .from('ocv_agent_threads')
    .select(`
      *,
      members:ocv_agent_thread_members(
        agent:ocv_agents(id, name)
      )
    `)
    .in('id', threadIds)
    .order('updated_at', { ascending: false });

  return NextResponse.json({ threads: threads || [] });
}

// POST /api/threads - Create new thread
export async function POST(request: NextRequest) {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, agentIds } = await request.json();

  // Verify all agents belong to user
  const { data: agents } = await supabaseAdmin
    .from('ocv_agents')
    .select('id')
    .eq('user_id', authUser.id)
    .in('id', agentIds);

  if (!agents || agents.length !== agentIds.length) {
    return NextResponse.json({ error: 'Invalid agent IDs' }, { status: 400 });
  }

  // Create thread
  const { data: thread, error } = await supabaseAdmin
    .from('ocv_agent_threads')
    .insert({ name: name || 'New Thread' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 });
  }

  // Add members
  await supabaseAdmin
    .from('ocv_agent_thread_members')
    .insert(agentIds.map((id: string) => ({ thread_id: thread.id, agent_id: id })));

  return NextResponse.json({ thread });
}
