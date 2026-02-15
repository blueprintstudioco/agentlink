import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/webhook/messages
// Agents push messages here
// Auth: API key in Authorization header
export async function POST(request: NextRequest) {
  try {
    // Get API key from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }
    const apiKey = authHeader.slice(7);

    // Look up agent by API key
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ocv_agents')
      .select('id, user_id, name')
      .eq('api_key', apiKey)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Parse message payload
    const body = await request.json();
    const { sessionKey, kind, label, channel, messages } = body;

    if (!sessionKey || !messages?.length) {
      return NextResponse.json(
        { error: 'Missing sessionKey or messages' },
        { status: 400 }
      );
    }

    // Upsert session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('ocv_sessions')
      .upsert(
        {
          agent_id: agent.id,
          session_key: sessionKey,
          kind,
          label,
          channel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'agent_id,session_key' }
      )
      .select()
      .single();

    if (sessionError) {
      console.error('Session upsert error:', sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Insert messages
    const messageRows = messages.map((msg: {
      role: string;
      content?: string;
      contentJson?: unknown;
      metadata?: unknown;
      timestamp?: string;
    }) => ({
      session_id: session.id,
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : null,
      content_json: typeof msg.content !== 'string' ? msg.content : msg.contentJson,
      metadata: msg.metadata,
      timestamp: msg.timestamp || new Date().toISOString(),
    }));

    const { error: messagesError } = await supabaseAdmin
      .from('ocv_messages')
      .insert(messageRows);

    if (messagesError) {
      console.error('Messages insert error:', messagesError);
      return NextResponse.json({ error: 'Failed to insert messages' }, { status: 500 });
    }

    // Update agent's last_synced_at timestamp
    await supabaseAdmin
      .from('ocv_agents')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', agent.id);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      messagesInserted: messageRows.length,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET for health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'messages webhook' });
}
