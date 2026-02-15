import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { matchAgentsToTask, suggestCapabilities, type Agent, type MatchResult } from '@/lib/skill-matcher';

// POST /api/agents/match - Find agents matching a task description
export async function POST(request: NextRequest) {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { taskDescription, requireOnline = false, maxResults = 10 } = body;

  if (!taskDescription || typeof taskDescription !== 'string') {
    return NextResponse.json(
      { error: 'taskDescription is required' },
      { status: 400 }
    );
  }

  // Get user's agents with intelligence fields
  const { data: agents, error } = await supabaseAdmin
    .from('ocv_agents')
    .select(`
      id,
      name,
      capabilities,
      availability,
      total_tasks_completed,
      avg_task_duration_seconds,
      hourly_rate_limit
    `)
    .eq('user_id', authUser.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }

  // Type assertion for the query result
  const typedAgents: Agent[] = (agents || []).map(a => ({
    id: a.id,
    name: a.name,
    capabilities: a.capabilities || [],
    availability: a.availability || 'online',
    total_tasks_completed: a.total_tasks_completed || 0,
  }));

  // Match task to agents
  const matches = matchAgentsToTask(taskDescription, typedAgents, {
    onlineOnly: requireOnline,
    limit: maxResults,
  });

  // Also suggest capabilities for this task
  const suggestedCapabilities = suggestCapabilities(taskDescription);

  return NextResponse.json({
    matches: matches.map((m: MatchResult) => ({
      agentId: m.agent.id,
      agentName: m.agent.name,
      score: Math.round(m.score * 100) / 100,
      matchedCapabilities: m.matchedCapabilities,
      availability: m.agent.availability,
      tasksCompleted: m.agent.total_tasks_completed,
      availabilityBonus: m.availabilityBonus,
      experienceBonus: m.experienceBonus,
    })),
    suggestedCapabilities,
    totalAgents: typedAgents.length,
    onlineAgents: typedAgents.filter(a => a.availability === 'online').length,
  });
}
