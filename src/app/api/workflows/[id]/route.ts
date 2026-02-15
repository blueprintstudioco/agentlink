import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/workflows/[id] - Get a specific workflow
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const { data: workflow, error } = await supabaseAdmin
    .from('ocv_workflows')
    .select()
    .eq('id', id)
    .single();

  if (error || !workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  // Check ownership
  const { data: ocvUser } = await supabaseAdmin
    .from('ocv_users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!ocvUser || workflow.user_id !== ocvUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ workflow });
}

// PATCH /api/workflows/[id] - Update a workflow
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  // Get workflow and verify ownership
  const { data: existing } = await supabaseAdmin
    .from('ocv_workflows')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  const { data: ocvUser } = await supabaseAdmin
    .from('ocv_users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!ocvUser || existing.user_id !== ocvUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  // Only allow updating specific fields
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.trigger_type !== undefined) {
    const validTriggers = ['manual', 'schedule', 'webhook', 'task_complete', 'message'];
    if (!validTriggers.includes(body.trigger_type)) {
      return NextResponse.json({ error: 'Invalid trigger_type' }, { status: 400 });
    }
    updates.trigger_type = body.trigger_type;
  }
  if (body.trigger_config !== undefined) updates.trigger_config = body.trigger_config;
  if (body.steps !== undefined) {
    if (!Array.isArray(body.steps)) {
      return NextResponse.json({ error: 'steps must be an array' }, { status: 400 });
    }
    updates.steps = body.steps;
  }
  if (body.enabled !== undefined) updates.enabled = Boolean(body.enabled);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: workflow, error } = await supabaseAdmin
    .from('ocv_workflows')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update workflow error:', error);
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
  }

  return NextResponse.json({ workflow });
}

// DELETE /api/workflows/[id] - Delete a workflow
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  // Get workflow and verify ownership
  const { data: existing } = await supabaseAdmin
    .from('ocv_workflows')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  const { data: ocvUser } = await supabaseAdmin
    .from('ocv_users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!ocvUser || existing.user_id !== ocvUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('ocv_workflows')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete workflow error:', error);
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
