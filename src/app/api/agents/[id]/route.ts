import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/agents/[id] - Get agent details and sessions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: agentId } = await params;

  // Get user
  const { data: user } = await supabaseAdmin
    .from('ocv_users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get agent (verify ownership)
  const { data: agent, error: agentError } = await supabaseAdmin
    .from('ocv_agents')
    .select('*')
    .eq('id', agentId)
    .eq('user_id', user.id)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Get sessions with message counts
  const { data: sessions } = await supabaseAdmin
    .from('ocv_sessions')
    .select(`
      *,
      messages:ocv_messages(count)
    `)
    .eq('agent_id', agentId)
    .order('updated_at', { ascending: false });

  // Get last message for each session
  const sessionsWithLastMessage = await Promise.all(
    (sessions || []).map(async (session) => {
      const { data: lastMessage } = await supabaseAdmin
        .from('ocv_messages')
        .select('content, role')
        .eq('session_id', session.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      return {
        ...session,
        message_count: session.messages?.[0]?.count || 0,
        last_message: lastMessage?.content
          ? `${lastMessage.role}: ${lastMessage.content.slice(0, 100)}...`
          : null,
      };
    })
  );

  return NextResponse.json({
    agent,
    sessions: sessionsWithLastMessage,
  });
}

// DELETE /api/agents/[id] - Delete agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: agentId } = await params;

  // Get user
  const { data: user } = await supabaseAdmin
    .from('ocv_users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Delete agent (cascade will delete sessions and messages)
  const { error } = await supabaseAdmin
    .from('ocv_agents')
    .delete()
    .eq('id', agentId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
