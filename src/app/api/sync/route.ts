import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/sync?since=ISO_TIMESTAMP
// Returns sessions and messages updated since the given timestamp
// Auth: API key required
export async function GET(request: NextRequest) {
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
      .select('id, last_synced_at')
      .eq('api_key', apiKey)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Get ?since= parameter (ISO timestamp)
    const sinceParam = request.nextUrl.searchParams.get('since');
    const since = sinceParam || agent.last_synced_at || '1970-01-01T00:00:00Z';

    // Get sessions updated since timestamp
    const { data: sessions } = await supabaseAdmin
      .from('ocv_sessions')
      .select(`
        id,
        session_key,
        kind,
        label,
        channel,
        updated_at
      `)
      .eq('agent_id', agent.id)
      .gt('updated_at', since)
      .order('updated_at', { ascending: true });

    // Get messages from those sessions that are newer than since
    let messages: Array<Record<string, unknown>> = [];
    if (sessions?.length) {
      const sessionIds = sessions.map(s => s.id);
      const { data: msgs } = await supabaseAdmin
        .from('ocv_messages')
        .select('*')
        .in('session_id', sessionIds)
        .gt('timestamp', since)
        .order('timestamp', { ascending: true });
      messages = msgs || [];
    }

    return NextResponse.json({
      since,
      sessions: sessions || [],
      messages,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
