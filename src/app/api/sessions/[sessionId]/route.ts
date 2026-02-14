import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/sessions/[sessionId] - Get session with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;

  // Get session with agent info to verify ownership
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('ocv_sessions')
    .select(`
      *,
      agent:ocv_agents!inner(user_id)
    `)
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Verify ownership
  if (session.agent.user_id !== authUser.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Get messages
  const { data: messages } = await supabaseAdmin
    .from('ocv_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });

  return NextResponse.json({
    session: {
      id: session.id,
      session_key: session.session_key,
      kind: session.kind,
      label: session.label,
      channel: session.channel,
    },
    messages: messages || [],
  });
}
