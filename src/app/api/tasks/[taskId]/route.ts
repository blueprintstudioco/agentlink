import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

// Helper to verify task access
async function verifyTaskAccess(taskId: string, userId: string) {
  // Get user's agents
  const { data: agents } = await supabaseAdmin
    .from('ocv_agents')
    .select('id')
    .eq('user_id', userId);

  const agentIds = agents?.map(a => a.id) || [];
  
  if (agentIds.length === 0) return null;

  // Get the task
  const { data: task } = await supabaseAdmin
    .from('ocv_tasks')
    .select(`
      *,
      assigned_agent:ocv_agents!ocv_tasks_assigned_to_fkey(id, name, avatar_url),
      created_agent:ocv_agents!ocv_tasks_created_by_fkey(id, name, avatar_url),
      thread:ocv_agent_threads(id, name)
    `)
    .eq('id', taskId)
    .single();

  if (!task) return null;

  // Check if user has access via thread membership
  if (task.thread_id) {
    const { data: membership } = await supabaseAdmin
      .from('ocv_agent_thread_members')
      .select('thread_id')
      .eq('thread_id', task.thread_id)
      .in('agent_id', agentIds)
      .single();

    if (!membership) return null;
  }

  return task;
}

// GET /api/tasks/[taskId] - Get single task
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { taskId } = await params;
  const task = await verifyTaskAccess(taskId, authUser.id);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json({ task });
}

// PATCH /api/tasks/[taskId] - Update task
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { taskId } = await params;
  const existingTask = await verifyTaskAccess(taskId, authUser.id);

  if (!existingTask) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const body = await request.json();
  const allowedFields = [
    'title', 'description', 'assigned_to', 'status', 
    'priority', 'due_date', 'deliverable', 'requires_approval'
  ];

  // Filter to only allowed fields
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  // Validate status transition
  if (updates.status) {
    const validStatuses = ['pending', 'in_progress', 'review', 'complete', 'cancelled'];
    if (!validStatuses.includes(updates.status as string)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
  }

  // Validate priority
  if (updates.priority) {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(updates.priority as string)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }
  }

  const { data: task, error } = await supabaseAdmin
    .from('ocv_tasks')
    .update(updates)
    .eq('id', taskId)
    .select(`
      *,
      assigned_agent:ocv_agents!ocv_tasks_assigned_to_fkey(id, name, avatar_url),
      created_agent:ocv_agents!ocv_tasks_created_by_fkey(id, name, avatar_url),
      thread:ocv_agent_threads(id, name)
    `)
    .single();

  if (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }

  return NextResponse.json({ task });
}

// DELETE /api/tasks/[taskId] - Delete task
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { taskId } = await params;
  const existingTask = await verifyTaskAccess(taskId, authUser.id);

  if (!existingTask) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('ocv_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
