-- Phase 3: Orchestration - Workflows
-- Create workflows and workflow_runs tables

CREATE TABLE ocv_workflows (
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

CREATE TABLE ocv_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES ocv_workflows(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  current_step INT DEFAULT 0,
  context JSONB DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_ocv_workflows_user_id ON ocv_workflows(user_id);
CREATE INDEX idx_ocv_workflows_trigger_type ON ocv_workflows(trigger_type);
CREATE INDEX idx_ocv_workflows_enabled ON ocv_workflows(enabled);
CREATE INDEX idx_ocv_workflow_runs_workflow_id ON ocv_workflow_runs(workflow_id);
CREATE INDEX idx_ocv_workflow_runs_status ON ocv_workflow_runs(status);

-- Updated_at trigger for workflows
CREATE OR REPLACE FUNCTION update_ocv_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ocv_workflows_updated_at
  BEFORE UPDATE ON ocv_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_ocv_workflows_updated_at();

-- RLS policies
ALTER TABLE ocv_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocv_workflow_runs ENABLE ROW LEVEL SECURITY;

-- Workflows: users can manage their own
CREATE POLICY ocv_workflows_own ON ocv_workflows FOR ALL USING (
  user_id IN (SELECT id FROM ocv_users WHERE id = auth.uid())
);

-- Workflow runs: inherit access from parent workflow
CREATE POLICY ocv_workflow_runs_own ON ocv_workflow_runs FOR ALL USING (
  workflow_id IN (
    SELECT id FROM ocv_workflows WHERE user_id IN (
      SELECT id FROM ocv_users WHERE id = auth.uid()
    )
  )
);
