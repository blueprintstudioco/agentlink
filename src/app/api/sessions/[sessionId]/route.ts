import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/sessions/[sessionId] - Get session with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;

  // Get user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get session with agent info to verify ownership
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select(`
      *,
      agent:agents!inner(user_id)
    `)
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Verify ownership
  if (session.agent.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Get messages
  const { data: messages } = await supabaseAdmin
    .from('messages')
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
