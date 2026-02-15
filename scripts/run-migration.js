const { Client } = require('pg');

const client = new Client({
  host: 'db.ehuupnmreuktfrarjeqp.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'um4waKcy3kwVdT5A',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  
  // Check existing tables
  const { rows: tables } = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'ocv_%'
    ORDER BY table_name
  `);
  console.log('Existing tables:', tables.map(t => t.table_name));
  
  // Run workflows migration
  console.log('\n--- Running workflows migration ---');
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ocv_workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES ocv_users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'schedule', 'webhook', 'task_complete', 'message')),
        trigger_config JSONB DEFAULT '{}',
        steps JSONB NOT NULL DEFAULT '[]',
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Created ocv_workflows');
  } catch (e) {
    console.log('ocv_workflows:', e.message);
  }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ocv_workflow_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID NOT NULL REFERENCES ocv_workflows(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
        current_step INT DEFAULT 0,
        context JSONB DEFAULT '{}',
        error TEXT,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
    `);
    console.log('Created ocv_workflow_runs');
  } catch (e) {
    console.log('ocv_workflow_runs:', e.message);
  }

  // Create indexes
  try {
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ocv_workflows_user_id ON ocv_workflows(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ocv_workflow_runs_workflow_id ON ocv_workflow_runs(workflow_id);`);
    console.log('Created workflow indexes');
  } catch (e) {
    console.log('Workflow indexes:', e.message);
  }

  // Run agent intelligence migration
  console.log('\n--- Running agent intelligence migration ---');
  try {
    await client.query(`ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS capabilities TEXT[] DEFAULT '{}';`);
    await client.query(`ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'online';`);
    await client.query(`ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS total_tokens_used BIGINT DEFAULT 0;`);
    await client.query(`ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS total_tasks_completed INT DEFAULT 0;`);
    await client.query(`ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS avg_task_duration_seconds INT;`);
    await client.query(`ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS hourly_rate_limit INT DEFAULT 100;`);
    console.log('Added agent intelligence columns');
  } catch (e) {
    console.log('Agent columns:', e.message);
  }

  // Add webhook_url and last_synced_at (from Phase 1)
  console.log('\n--- Running Phase 1 additions ---');
  try {
    await client.query(`ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS webhook_url TEXT;`);
    await client.query(`ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;`);
    console.log('Added webhook_url and last_synced_at');
  } catch (e) {
    console.log('Phase 1 columns:', e.message);
  }

  // Verify
  const { rows: cols } = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'ocv_agents' ORDER BY ordinal_position
  `);
  console.log('\nAgent columns:', cols.map(c => c.column_name));

  const { rows: tbls } = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'ocv_%'
    ORDER BY table_name
  `);
  console.log('\nFinal tables:', tbls.map(t => t.table_name));

  await client.end();
  console.log('\n✅ Migrations complete!');
}

run().catch(console.error);
