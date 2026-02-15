-- Phase 2: Task System
-- Tasks linked to agent threads with assignment and approval workflow

CREATE TABLE ocv_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES ocv_agent_threads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES ocv_agents(id),
  created_by UUID REFERENCES ocv_agents(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'complete', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  deliverable TEXT,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,  -- References Supabase auth.users
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_tasks_thread ON ocv_tasks(thread_id);
CREATE INDEX idx_tasks_assigned ON ocv_tasks(assigned_to);
CREATE INDEX idx_tasks_status ON ocv_tasks(status);
CREATE INDEX idx_tasks_priority ON ocv_tasks(priority);
CREATE INDEX idx_tasks_due_date ON ocv_tasks(due_date);

-- RLS
ALTER TABLE ocv_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage tasks in threads where they have agents
CREATE POLICY ocv_tasks_access ON ocv_tasks FOR ALL USING (
  thread_id IN (
    SELECT thread_id FROM ocv_agent_thread_members 
    WHERE agent_id IN (
      SELECT id FROM ocv_agents 
      WHERE user_id = auth.uid()
    )
  )
  OR thread_id IS NULL  -- Allow standalone tasks
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ocv_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ocv_tasks_updated_at
  BEFORE UPDATE ON ocv_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_ocv_tasks_updated_at();
