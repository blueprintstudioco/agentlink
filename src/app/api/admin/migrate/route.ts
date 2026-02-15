import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin endpoint to run Phase 4 migration
// Only runs if service role key is valid

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  // Verify admin token from request
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  // Check if columns already exist by trying to select them
  const { data, error: checkError } = await supabase
    .from('ocv_agents')
    .select('capabilities, availability, total_tokens_used, total_tasks_completed')
    .limit(1);

  if (!checkError) {
    return NextResponse.json({ 
      message: 'Migration already applied - columns exist',
      sample: data 
    });
  }

  // If we get here, columns don't exist
  // Unfortunately we can't run DDL via PostgREST
  // Return the SQL that needs to be run manually
  const migrationSQL = `
-- Phase 4: Agent Intelligence columns
ALTER TABLE ocv_agents 
ADD COLUMN IF NOT EXISTS capabilities TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'online',
ADD COLUMN IF NOT EXISTS total_tokens_used BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tasks_completed INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ocv_agents_availability ON ocv_agents(availability);
  `.trim();

  return NextResponse.json({
    error: 'Migration needed',
    message: 'Run this SQL in Supabase Dashboard > SQL Editor',
    sql: migrationSQL,
    dashboard_url: `https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql`
  }, { status: 428 }); // 428 Precondition Required
}
