import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { executeWorkflow } from '@/lib/workflow-executor';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/workflows/[id]/run - Trigger a workflow run
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  // Get workflow
  const { data: workflow, error: fetchError } = await supabaseAdmin
    .from('ocv_workflows')
    .select()
    .eq('id', id)
    .single();

  if (fetchError || !workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  // Verify ownership
  const { data: ocvUser } = await supabaseAdmin
    .from('ocv_users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!ocvUser || workflow.user_id !== ocvUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check if workflow is enabled
  if (!workflow.enabled) {
    return NextResponse.json({ error: 'Workflow is disabled' }, { status: 400 });
  }

  // Get initial context from request body
  let initialContext: Record<string, unknown> = {};
  try {
    const body = await request.json();
    if (body.context && typeof body.context === 'object') {
      initialContext = body.context;
    }
  } catch {
    // No body or invalid JSON - that's fine for manual triggers
  }

  // Add trigger metadata to context
  initialContext._trigger = {
    type: 'manual',
    triggered_by: user.id,
    triggered_at: new Date().toISOString(),
  };

  try {
    // Execute the workflow
    const run = await executeWorkflow(id, initialContext);

    return NextResponse.json({ 
      run,
      message: run.status === 'running' 
        ? 'Workflow started, waiting for external completion' 
        : `Workflow ${run.status}`,
    }, { status: 201 });
  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json({ 
      error: 'Failed to execute workflow',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
