CREATE TABLE IF NOT EXISTS mc_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES mc_users(id) ON DELETE CASCADE,
  from_agent TEXT,
  to_agent TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mc_messages_user_agent_idx ON mc_messages(user_id, to_agent);
CREATE INDEX IF NOT EXISTS mc_messages_pending_idx ON mc_messages(to_agent, status) WHERE status = 'pending';
