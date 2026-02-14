import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/team-script - Get team script (for agents via API key, or for logged-in users)
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (apiKey?.startsWith('ocv_')) {
    // Agent requesting their team's script
    const { data: agent } = await supabaseAdmin
      .from('ocv_agents')
      .select('user_id')
      .eq('api_key', apiKey)
      .single();
    
    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    
    const { data: user } = await supabaseAdmin
      .from('ocv_users')
      .select('team_script')
      .eq('id', agent.user_id)
      .single();
    
    return NextResponse.json({ script: user?.team_script || '' });
  }
  
  // Logged-in user requesting their script
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { data: user } = await supabaseAdmin
    .from('ocv_users')
    .select('team_script')
    .eq('id', authUser.id)
    .single();
  
  return NextResponse.json({ script: user?.team_script || '' });
}

// POST /api/team-script - Update team script
export async function POST(request: NextRequest) {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { script } = await request.json();
  
  const { error } = await supabaseAdmin
    .from('ocv_users')
    .update({ team_script: script })
    .eq('id', authUser.id);
  
  if (error) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}
