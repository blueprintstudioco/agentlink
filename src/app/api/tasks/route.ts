import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/tasks - List tasks (optionally filtered by thread)
// Supports both user auth (cookies) and agent auth (API key)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get('threadId');
  const status = searchParams.get('status');
  const assignedTo = searchParams.get('assignedTo');
  
  // Check for API key auth first (for agents)
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  let agentIds: string[] = [];
  
  if (apiKey?.startsWith('ocv_')) {
    // Agent auth - get the agent making the request
    const { data: agent } = await supabaseAdmin
      .from('ocv_agents')
      .select('id, user_id')
      .eq('api_key', apiKey)
      .single();
    
    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    // Get all agents owned by the same user (so agent can see tasks in shared threads)
    const { data: userAgents } = await supabaseAdmin
      .from('ocv_agents')
      .select('id')
      .eq('user_id', agent.user_id);
    
    agentIds = userAgents?.map(a => a.id) || [];
  } else {
    // User auth (cookies)
    const authUser = await getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's agents to filter accessible tasks
    const { data: agents } = await supabaseAdmin
      .from('ocv_agents')
      .select('id')
      .eq('user_id', authUser.id);

    agentIds = agents?.map(a => a.id) || [];
  }
  
  if (agentIds.length === 0) {
    return NextResponse.json({ tasks: [] });
  }

  // Get threads the user has access to
  const { data: memberships } = await supabaseAdmin
    .from('ocv_agent_thread_members')
    .select('thread_id')
    .in('agent_id', agentIds);

  const threadIds = [...new Set(memberships?.map(m => m.thread_id) || [])];
  
  if (threadIds.length === 0) {
    return NextResponse.json({ tasks: [] });
  }

  // Build query
  let query = supabaseAdmin
    .from('ocv_tasks')
    .select(`
      *,
      assigned_agent:ocv_agents!ocv_tasks_assigned_to_fkey(id, name, avatar_url),
      created_agent:ocv_agents!ocv_tasks_created_by_fkey(id, name, avatar_url),
      thread:ocv_agent_threads(id, name)
    `)
    .in('thread_id', threadIds)
    .order('created_at', { ascending: false });

  // Apply filters
  if (threadId) {
    query = query.eq('thread_id', threadId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (assignedTo) {
    query = query.eq('assigned_to', assignedTo);
  }

  const { data: tasks, error } = await query;

  if (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }

  return NextResponse.json({ tasks: tasks || [] });
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { 
    threadId, 
    title, 
    description, 
    assignedTo, 
    createdBy,
    priority = 'medium',
    dueDate,
    requiresApproval = false
  } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // Verify user has access to the thread (if specified)
  if (threadId) {
    const { data: agents } = await supabaseAdmin
      .from('ocv_agents')
      .select('id')
      .eq('user_id', authUser.id);

    const agentIds = agents?.map(a => a.id) || [];
    
    const { data: membership } = await supabaseAdmin
      .from('ocv_agent_thread_members')
      .select('thread_id')
      .eq('thread_id', threadId)
      .in('agent_id', agentIds)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No access to this thread' }, { status: 403 });
    }
  }

  // Create task
  const { data: task, error } = await supabaseAdmin
    .from('ocv_tasks')
    .insert({
      thread_id: threadId || null,
      title,
      description: description || null,
      assigned_to: assignedTo || null,
      created_by: createdBy || null,
      priority,
      due_date: dueDate || null,
      requires_approval: requiresApproval,
      status: 'pending'
    })
    .select(`
      *,
      assigned_agent:ocv_agents!ocv_tasks_assigned_to_fkey(id, name, avatar_url),
      created_agent:ocv_agents!ocv_tasks_created_by_fkey(id, name, avatar_url),
      thread:ocv_agent_threads(id, name)
    `)
    .single();

  if (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }

  return NextResponse.json({ task }, { status: 201 });
}
