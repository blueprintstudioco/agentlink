import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/workflows - List user's workflows
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's internal ID
  const { data: ocvUser } = await supabaseAdmin
    .from('ocv_users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!ocvUser) {
    return NextResponse.json({ workflows: [] });
  }

  const { data: workflows, error } = await supabaseAdmin
    .from('ocv_workflows')
    .select(`
      *,
      runs:ocv_workflow_runs(count)
    `)
    .eq('user_id', ocvUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch workflows error:', error);
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
  }

  // Add run stats
  const workflowsWithStats = await Promise.all(
    (workflows || []).map(async (workflow) => {
      // Get last run
      const { data: lastRun } = await supabaseAdmin
        .from('ocv_workflow_runs')
        .select('status, completed_at')
        .eq('workflow_id', workflow.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      // Count runs by status
      const { data: runStats } = await supabaseAdmin
        .from('ocv_workflow_runs')
        .select('status')
        .eq('workflow_id', workflow.id);

      const stats = {
        total: runStats?.length || 0,
        completed: runStats?.filter(r => r.status === 'completed').length || 0,
        failed: runStats?.filter(r => r.status === 'failed').length || 0,
        running: runStats?.filter(r => r.status === 'running').length || 0,
      };

      return {
        ...workflow,
        run_count: workflow.runs?.[0]?.count || 0,
        last_run: lastRun,
        stats,
      };
    })
  );

  return NextResponse.json({ workflows: workflowsWithStats });
}

// POST /api/workflows - Create a new workflow
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure user exists in our DB
  const { data: existingUser } = await supabaseAdmin
    .from('ocv_users')
    .select('id')
    .eq('id', user.id)
    .single();

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('ocv_users')
      .insert({ id: user.id, email: user.email })
      .select()
      .single();

    if (userError || !newUser) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
    userId = newUser.id;
  }

  const body = await request.json();
  const { name, description, trigger_type, trigger_config, steps, enabled } = body;

  // Validation
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const validTriggers = ['manual', 'schedule', 'webhook', 'task_complete', 'message'];
  if (!trigger_type || !validTriggers.includes(trigger_type)) {
    return NextResponse.json({ 
      error: `trigger_type must be one of: ${validTriggers.join(', ')}` 
    }, { status: 400 });
  }

  if (!Array.isArray(steps)) {
    return NextResponse.json({ error: 'steps must be an array' }, { status: 400 });
  }

  // Validate steps
  const validStepTypes = [
    'agent_call', 'condition', 'transform', 
    'delay', 'webhook', 'set_context'
  ];
  for (const step of steps) {
    if (!step.type || !validStepTypes.includes(step.type)) {
      return NextResponse.json({ 
        error: `Invalid step type: ${step.type}. Must be one of: ${validStepTypes.join(', ')}` 
      }, { status: 400 });
    }
  }

  const { data: workflow, error } = await supabaseAdmin
    .from('ocv_workflows')
    .insert({
      user_id: userId,
      name: name.trim(),
      description: description?.trim() || null,
      trigger_type,
      trigger_config: trigger_config || {},
      steps,
      enabled: enabled !== false,
    })
    .select()
    .single();

  if (error) {
    console.error('Create workflow error:', error);
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
  }

  return NextResponse.json({ workflow }, { status: 201 });
}
