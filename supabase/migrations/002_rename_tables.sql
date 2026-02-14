-- Drop the conflicting stuff and recreate with prefixed names
-- Viewer tables will be prefixed with 'ocv_' (OpenClaw Viewer)

-- Drop what we just created (cleanup)
DROP TABLE IF EXISTS agent_thread_messages CASCADE;
DROP TABLE IF EXISTS agent_thread_members CASCADE;
DROP TABLE IF EXISTS agent_threads CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP POLICY IF EXISTS users_own ON users;
DROP POLICY IF EXISTS agents_own ON agents;
DROP POLICY IF EXISTS sessions_own ON sessions;
DROP POLICY IF EXISTS messages_own ON messages;

-- Recreate with ocv_ prefix
CREATE TABLE ocv_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ocv_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES ocv_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  api_key TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ocv_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ocv_agents(id) ON DELETE CASCADE,
  session_key TEXT NOT NULL,
  kind TEXT,
  label TEXT,
  channel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, session_key)
);

CREATE TABLE ocv_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ocv_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT,
  content_json JSONB,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ocv_agent_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ocv_agent_thread_members (
  thread_id UUID NOT NULL REFERENCES ocv_agent_threads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ocv_agents(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, agent_id)
);

CREATE TABLE ocv_agent_thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES ocv_agent_threads(id) ON DELETE CASCADE,
  from_agent_id UUID NOT NULL REFERENCES ocv_agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ocv_agents_user ON ocv_agents(user_id);
CREATE INDEX idx_ocv_agents_api_key ON ocv_agents(api_key);
CREATE INDEX idx_ocv_sessions_agent ON ocv_sessions(agent_id);
CREATE INDEX idx_ocv_sessions_key ON ocv_sessions(session_key);
CREATE INDEX idx_ocv_messages_session ON ocv_messages(session_id);
CREATE INDEX idx_ocv_messages_timestamp ON ocv_messages(timestamp);
CREATE INDEX idx_ocv_thread_messages_thread ON ocv_agent_thread_messages(thread_id);

-- RLS
ALTER TABLE ocv_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocv_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocv_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocv_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocv_agent_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocv_agent_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocv_agent_thread_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY ocv_users_own ON ocv_users FOR ALL USING (
  clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
);

CREATE POLICY ocv_agents_own ON ocv_agents FOR ALL USING (
  user_id IN (SELECT id FROM ocv_users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
);

CREATE POLICY ocv_sessions_own ON ocv_sessions FOR ALL USING (
  agent_id IN (
    SELECT id FROM ocv_agents WHERE user_id IN (
      SELECT id FROM ocv_users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

CREATE POLICY ocv_messages_own ON ocv_messages FOR ALL USING (
  session_id IN (
    SELECT id FROM ocv_sessions WHERE agent_id IN (
      SELECT id FROM ocv_agents WHERE user_id IN (
        SELECT id FROM ocv_users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  )
);
