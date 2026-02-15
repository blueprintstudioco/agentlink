import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { getRateLimitStatus, rateLimitHeaders } from '@/lib/rate-limiter';

// GET /api/agents/[id] - Get agent details and sessions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: agentId } = await params;

  // Get agent (verify ownership) - include intelligence fields
  const { data: agent, error: agentError } = await supabaseAdmin
    .from('ocv_agents')
    .select('*')
    .eq('id', agentId)
    .eq('user_id', authUser.id)
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

  // Get rate limit status
  const rateLimitStatus = await getRateLimitStatus(agentId);

  return NextResponse.json({
    agent,
    sessions: sessionsWithLastMessage,
    rateLimit: {
      currentCount: rateLimitStatus.currentCount,
      maxLimit: rateLimitStatus.maxLimit,
      resetAt: rateLimitStatus.resetAt.toISOString(),
      allowed: rateLimitStatus.allowed,
    },
  });
}

// PATCH /api/agents/[id] - Update agent (capabilities, availability, rate limit, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: agentId } = await params;

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate allowed fields
  const allowedFields = [
    'name',
    'description',
    'avatar_url',
    'is_public',
    'capabilities',
    'availability',
    'hourly_rate_limit',
  ];

  const updates: Record<string, unknown> = {};
  
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      // Validate specific fields
      if (field === 'capabilities') {
        if (!Array.isArray(body[field])) {
          return NextResponse.json(
            { error: 'capabilities must be an array of strings' },
            { status: 400 }
          );
        }
        // Sanitize capabilities - trim, lowercase, unique
        updates[field] = Array.from(new Set(
          body[field]
            .filter((c: unknown) => typeof c === 'string' && c.trim())
            .map((c: string) => c.trim().toLowerCase())
        ));
      } else if (field === 'availability') {
        const validStatuses = ['online', 'offline', 'busy', 'away'];
        if (!validStatuses.includes(body[field])) {
          return NextResponse.json(
            { error: `availability must be one of: ${validStatuses.join(', ')}` },
            { status: 400 }
          );
        }
        updates[field] = body[field];
      } else if (field === 'hourly_rate_limit') {
        const limit = parseInt(body[field], 10);
        if (isNaN(limit) || limit < 1 || limit > 10000) {
          return NextResponse.json(
            { error: 'hourly_rate_limit must be between 1 and 10000' },
            { status: 400 }
          );
        }
        updates[field] = limit;
      } else {
        updates[field] = body[field];
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Add updated_at timestamp
  updates.updated_at = new Date().toISOString();

  // Update agent (verify ownership)
  const { data: agent, error } = await supabaseAdmin
    .from('ocv_agents')
    .update(updates)
    .eq('id', agentId)
    .eq('user_id', authUser.id)
    .select()
    .single();

  if (error || !agent) {
    return NextResponse.json({ error: 'Agent not found or update failed' }, { status: 404 });
  }

  // Include rate limit status in response
  const rateLimitStatus = await getRateLimitStatus(agentId);

  const response = NextResponse.json({
    agent,
    rateLimit: {
      currentCount: rateLimitStatus.currentCount,
      maxLimit: rateLimitStatus.maxLimit,
      resetAt: rateLimitStatus.resetAt.toISOString(),
    },
  });

  // Add rate limit headers
  const headers = rateLimitHeaders(rateLimitStatus);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// DELETE /api/agents/[id] - Delete agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: agentId } = await params;

  // Delete agent (cascade will delete sessions and messages)
  const { error } = await supabaseAdmin
    .from('ocv_agents')
    .delete()
    .eq('id', agentId)
    .eq('user_id', authUser.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
