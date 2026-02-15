-- Phase 4: Agent Intelligence
-- Extend agents with capabilities, availability, usage tracking, and rate limiting

-- Add intelligence columns to ocv_agents
ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS capabilities TEXT[] DEFAULT '{}';
ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'online';
ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS total_tokens_used BIGINT DEFAULT 0;
ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS total_tasks_completed INT DEFAULT 0;
ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS avg_task_duration_seconds INT;
ALTER TABLE ocv_agents ADD COLUMN IF NOT EXISTS hourly_rate_limit INT DEFAULT 100;

-- Add check constraint for availability (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ocv_agents_availability_check'
  ) THEN
    ALTER TABLE ocv_agents ADD CONSTRAINT ocv_agents_availability_check 
      CHECK (availability IN ('online', 'offline', 'busy', 'away'));
  END IF;
END $$;

-- Rate limiting tracking table
CREATE TABLE IF NOT EXISTS ocv_agent_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ocv_agents(id) ON DELETE CASCADE,
  hour_bucket TIMESTAMPTZ NOT NULL,
  request_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, hour_bucket)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_agent_hour ON ocv_agent_rate_limits(agent_id, hour_bucket);
CREATE INDEX IF NOT EXISTS idx_agents_capabilities ON ocv_agents USING GIN (capabilities);
CREATE INDEX IF NOT EXISTS idx_agents_availability ON ocv_agents(availability);

-- RLS for rate limits
ALTER TABLE ocv_agent_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ocv_rate_limits_access ON ocv_agent_rate_limits;
CREATE POLICY ocv_rate_limits_access ON ocv_agent_rate_limits FOR ALL USING (
  agent_id IN (
    SELECT id FROM ocv_agents 
    WHERE user_id IN (
      SELECT id FROM ocv_users 
      WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

-- Function to check and increment rate limit (atomic operation)
CREATE OR REPLACE FUNCTION check_agent_rate_limit(p_agent_id UUID)
RETURNS TABLE (allowed BOOLEAN, current_count INT, max_limit INT) AS $$
DECLARE
  v_hour_bucket TIMESTAMPTZ;
  v_current_count INT;
  v_max_limit INT;
BEGIN
  v_hour_bucket := date_trunc('hour', NOW());
  
  SELECT hourly_rate_limit INTO v_max_limit FROM ocv_agents WHERE id = p_agent_id;
  IF v_max_limit IS NULL THEN v_max_limit := 100; END IF;
  
  INSERT INTO ocv_agent_rate_limits (agent_id, hour_bucket, request_count)
  VALUES (p_agent_id, v_hour_bucket, 1)
  ON CONFLICT (agent_id, hour_bucket) 
  DO UPDATE SET request_count = ocv_agent_rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;
  
  RETURN QUERY SELECT 
    v_current_count <= v_max_limit AS allowed,
    v_current_count AS current_count,
    v_max_limit AS max_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to update agent stats after task completion
CREATE OR REPLACE FUNCTION update_agent_task_stats(
  p_agent_id UUID, 
  p_duration_seconds INT,
  p_tokens_used BIGINT DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
  v_current_total INT;
  v_current_avg INT;
  v_new_avg INT;
BEGIN
  SELECT total_tasks_completed, COALESCE(avg_task_duration_seconds, 0) 
  INTO v_current_total, v_current_avg
  FROM ocv_agents WHERE id = p_agent_id;
  
  IF v_current_total IS NULL THEN v_current_total := 0; END IF;
  
  v_new_avg := ((v_current_avg * v_current_total) + p_duration_seconds) / (v_current_total + 1);
  
  UPDATE ocv_agents SET
    total_tasks_completed = COALESCE(total_tasks_completed, 0) + 1,
    total_tokens_used = COALESCE(total_tokens_used, 0) + p_tokens_used,
    avg_task_duration_seconds = v_new_avg,
    updated_at = NOW()
  WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for old rate limit records (run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM ocv_agent_rate_limits 
  WHERE hour_bucket < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON COLUMN ocv_agents.capabilities IS 'Array of skill tags for capability-based task matching';
COMMENT ON COLUMN ocv_agents.availability IS 'Agent status: online, busy, away, offline';
COMMENT ON COLUMN ocv_agents.total_tokens_used IS 'Cumulative LLM token usage';
COMMENT ON COLUMN ocv_agents.total_tasks_completed IS 'Number of tasks completed';
COMMENT ON COLUMN ocv_agents.avg_task_duration_seconds IS 'Rolling average task duration';
COMMENT ON COLUMN ocv_agents.hourly_rate_limit IS 'Max requests per hour (default 100)';
COMMENT ON TABLE ocv_agent_rate_limits IS 'Tracks hourly request counts for rate limiting';
