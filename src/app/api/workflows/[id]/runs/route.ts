import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/workflows/[id]/runs - Get workflow run history
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  // Get workflow and verify ownership
  const { data: workflow, error: fetchError } = await supabaseAdmin
    .from('ocv_workflows')
    .select('user_id, name')
    .eq('id', id)
    .single();

  if (fetchError || !workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  const { data: ocvUser } = await supabaseAdmin
    .from('ocv_users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!ocvUser || workflow.user_id !== ocvUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse query params
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const status = url.searchParams.get('status');

  // Build query
  let query = supabaseAdmin
    .from('ocv_workflow_runs')
    .select('*', { count: 'exact' })
    .eq('workflow_id', id)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: runs, error, count } = await query;

  if (error) {
    console.error('Fetch workflow runs error:', error);
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
  }

  return NextResponse.json({ 
    runs,
    workflow_name: workflow.name,
    pagination: {
      total: count,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    },
  });
}
