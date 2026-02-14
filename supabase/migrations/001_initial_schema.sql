-- OpenClaw Viewer Schema
-- Multi-tenant agent communication platform

-- Users (synced from Clerk)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents registered by users
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  api_key TEXT UNIQUE NOT NULL, -- for pushing messages
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT FALSE, -- can other users see this agent?
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions (conversations)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_key TEXT NOT NULL, -- from OpenClaw
  kind TEXT, -- main, cron, group, etc.
  label TEXT,
  channel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, session_key)
);

-- Messages within sessions
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user, assistant, system, tool
  content TEXT,
  content_json JSONB, -- for complex content (tool calls, etc.)
  metadata JSONB, -- model, tokens, cost, etc.
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-agent conversations (for agent-to-agent messaging)
CREATE TABLE agent_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_thread_members (
  thread_id UUID NOT NULL REFERENCES agent_threads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, agent_id)
);

CREATE TABLE agent_thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES agent_threads(id) ON DELETE CASCADE,
  from_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agents_user ON agents(user_id);
CREATE INDEX idx_agents_api_key ON agents(api_key);
CREATE INDEX idx_sessions_agent ON sessions(agent_id);
CREATE INDEX idx_sessions_key ON sessions(session_key);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_thread_messages_thread ON agent_thread_messages(thread_id);

-- RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_thread_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_own ON users FOR ALL USING (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY agents_own ON agents FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub')
);

CREATE POLICY sessions_own ON sessions FOR ALL USING (
  agent_id IN (
    SELECT id FROM agents WHERE user_id IN (
      SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

CREATE POLICY messages_own ON messages FOR ALL USING (
  session_id IN (
    SELECT id FROM sessions WHERE agent_id IN (
      SELECT id FROM agents WHERE user_id IN (
        SELECT id FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  )
);
