import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USER_ID = '9452a23f-a139-42cd-83e4-732f188a07ff';

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
  const agent = request.nextUrl.searchParams.get('agent');

  try {
    let query = supabase
      .from('mc_activity')
      .select('*')
      .eq('user_id', USER_ID)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50)); // Cap at 50

    // Optional agent filter
    if (agent) {
      query = query.eq('agent', agent);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Activity fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      activities: data || [],
      count: data?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Activity API error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}

// POST to log new activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent, summary } = body;

    if (!summary) {
      return NextResponse.json({ error: 'Summary required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('mc_activity')
      .insert({
        user_id: USER_ID,
        agent: agent || null,
        summary: summary,
      })
      .select()
      .single();

    if (error) {
      console.error('Activity insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ activity: data, success: true });
  } catch (error) {
    console.error('Activity POST error:', error);
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
  }
}
