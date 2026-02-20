const { Client } = require('pg');

const client = new Client({
  host: 'db.ehuupnmreuktfrarjeqp.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '150fYhV6ey4Xtr3E',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  await client.connect();
  
  // Create the mc_cron_jobs table
  await client.query(`
    CREATE TABLE IF NOT EXISTS mc_cron_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      next_run TIMESTAMPTZ,
      last_run TIMESTAMPTZ,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
      description TEXT,
      category TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Created mc_cron_jobs table');
  
  // Add sample cron jobs
  const userId = '9452a23f-a139-42cd-83e4-732f188a07ff';
  
  await client.query(`
    INSERT INTO mc_cron_jobs (user_id, name, schedule, next_run, last_run, status, description, category)
    VALUES 
      ($1, 'Daily Social Post', '0 9 * * *', NOW() + INTERVAL '10 hours', NOW() - INTERVAL '14 hours', 'active', 'Post daily content to Twitter and LinkedIn', 'social'),
      ($1, 'Morning Email Check', '0 7 * * 1-5', NOW() + INTERVAL '7 hours', NOW() - INTERVAL '17 hours', 'active', 'Scan inbox for urgent emails', 'email'),
      ($1, 'Weekly Report', '0 18 * * 5', NOW() + INTERVAL '4 days', NOW() - INTERVAL '3 days', 'active', 'Generate and send weekly summary report', 'reports'),
      ($1, 'Backup Memory Files', '0 3 * * *', NOW() + INTERVAL '3 hours', NOW() - INTERVAL '21 hours', 'active', 'Backup daily memory files to cloud storage', 'system'),
      ($1, 'Health Data Sync', '30 6 * * *', NOW() + INTERVAL '6 hours', NOW() - INTERVAL '18 hours', 'active', 'Sync Oura ring health data', 'health'),
      ($1, 'Calendar Reminder', '0 8,14,20 * * *', NOW() + INTERVAL '8 hours', NOW() - INTERVAL '4 hours', 'active', 'Check upcoming calendar events', 'calendar'),
      ($1, 'Equipment News Scan', '0 10,16 * * *', NOW() + INTERVAL '10 hours', NOW() - INTERVAL '8 hours', 'paused', 'Scan for equipment industry news', 'social')
    ON CONFLICT DO NOTHING;
  `, [userId]);
  console.log('✅ Added sample cron jobs');
  
  // Enable RLS
  await client.query(`ALTER TABLE mc_cron_jobs ENABLE ROW LEVEL SECURITY;`);
  
  // Create RLS policy (drop if exists first)
  await client.query(`DROP POLICY IF EXISTS "Allow all for user" ON mc_cron_jobs;`);
  await client.query(`
    CREATE POLICY "Allow all for user" ON mc_cron_jobs
    FOR ALL USING (true);
  `);
  console.log('✅ Configured RLS');
  
  await client.end();
  console.log('🎉 Done!');
}

setup().catch(console.error);
