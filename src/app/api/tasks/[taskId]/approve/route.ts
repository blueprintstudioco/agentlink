import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

// POST /api/tasks/[taskId]/approve - Human approval endpoint
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { taskId } = await params;

  // Get user's agents to verify access
  const { data: agents } = await supabaseAdmin
    .from('ocv_agents')
    .select('id')
    .eq('user_id', authUser.id);

  const agentIds = agents?.map(a => a.id) || [];
  
  if (agentIds.length === 0) {
    return NextResponse.json({ error: 'No agents found' }, { status: 403 });
  }

  // Get the task
  const { data: task } = await supabaseAdmin
    .from('ocv_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Verify user has access via thread membership
  if (task.thread_id) {
    const { data: membership } = await supabaseAdmin
      .from('ocv_agent_thread_members')
      .select('thread_id')
      .eq('thread_id', task.thread_id)
      .in('agent_id', agentIds)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No access to this task' }, { status: 403 });
    }
  }

  // Check if task requires approval and is in review status
  if (!task.requires_approval) {
    return NextResponse.json({ error: 'Task does not require approval' }, { status: 400 });
  }

  if (task.status !== 'review') {
    return NextResponse.json({ error: 'Task must be in review status to approve' }, { status: 400 });
  }

  // Parse optional body for approval action
  let action = 'approve';
  try {
    const body = await request.json();
    if (body.action === 'reject') {
      action = 'reject';
    }
  } catch {
    // No body or invalid JSON, default to approve
  }

  if (action === 'approve') {
    // Approve and mark complete
    const { data: updatedTask, error } = await supabaseAdmin
      .from('ocv_tasks')
      .update({
        status: 'complete',
        approved_by: authUser.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select(`
        *,
        assigned_agent:ocv_agents!ocv_tasks_assigned_to_fkey(id, name, avatar_url),
        created_agent:ocv_agents!ocv_tasks_created_by_fkey(id, name, avatar_url),
        thread:ocv_agent_threads(id, name)
      `)
      .single();

    if (error) {
      console.error('Error approving task:', error);
      return NextResponse.json({ error: 'Failed to approve task' }, { status: 500 });
    }

    return NextResponse.json({ task: updatedTask, action: 'approved' });
  } else {
    // Reject - send back to in_progress
    const { data: updatedTask, error } = await supabaseAdmin
      .from('ocv_tasks')
      .update({
        status: 'in_progress',
        approved_by: null,
        approved_at: null
      })
      .eq('id', taskId)
      .select(`
        *,
        assigned_agent:ocv_agents!ocv_tasks_assigned_to_fkey(id, name, avatar_url),
        created_agent:ocv_agents!ocv_tasks_created_by_fkey(id, name, avatar_url),
        thread:ocv_agent_threads(id, name)
      `)
      .single();

    if (error) {
      console.error('Error rejecting task:', error);
      return NextResponse.json({ error: 'Failed to reject task' }, { status: 500 });
    }

    return NextResponse.json({ task: updatedTask, action: 'rejected' });
  }
}
