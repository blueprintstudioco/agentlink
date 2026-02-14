import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nanoid } from 'nanoid';

// Ensure user exists in our DB
async function ensureUser(clerkId: string) {
  const clerkUser = await currentUser();
  
  const { data: existingUser } = await supabaseAdmin
    .from('ocv_users')
    .select()
    .eq('clerk_id', clerkId)
    .single();

  if (existingUser) return existingUser;

  const { data: newUser, error } = await supabaseAdmin
    .from('ocv_users')
    .insert({
      clerk_id: clerkId,
      email: clerkUser?.primaryEmailAddress?.emailAddress,
      name: clerkUser?.fullName || clerkUser?.firstName,
      avatar_url: clerkUser?.imageUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return newUser;
}

// GET /api/agents - List user's agents
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await ensureUser(userId);

  const { data: agents, error } = await supabaseAdmin
    .from('ocv_agents')
    .select(`
      *,
      sessions:ocv_sessions(count)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch agents error:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }

  // Get last activity for each agent
  const agentsWithStats = await Promise.all(
    (agents || []).map(async (agent) => {
      const { data: lastSession } = await supabaseAdmin
        .from('ocv_sessions')
        .select('updated_at')
        .eq('agent_id', agent.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      return {
        ...agent,
        session_count: agent.sessions?.[0]?.count || 0,
        last_activity: lastSession?.updated_at,
      };
    })
  );

  return NextResponse.json({ agents: agentsWithStats });
}

// POST /api/agents - Create new agent
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await ensureUser(userId);
  const body = await request.json();
  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  // Generate API key
  const apiKey = `ocv_${nanoid(32)}`;

  const { data: agent, error } = await supabaseAdmin
    .from('ocv_agents')
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      api_key: apiKey,
    })
    .select()
    .single();

  if (error) {
    console.error('Create agent error:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }

  return NextResponse.json({ agent });
}
