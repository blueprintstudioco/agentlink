-- Update ocv_users to use Supabase auth user ID directly
-- (instead of clerk_id)

ALTER TABLE ocv_users DROP COLUMN IF EXISTS clerk_id;

-- The id column is now the Supabase auth.users.id directly
-- No need for a separate clerk_id

-- Update RLS policies to use auth.uid()
DROP POLICY IF EXISTS ocv_users_own ON ocv_users;
DROP POLICY IF EXISTS ocv_agents_own ON ocv_agents;
DROP POLICY IF EXISTS ocv_sessions_own ON ocv_sessions;
DROP POLICY IF EXISTS ocv_messages_own ON ocv_messages;

CREATE POLICY ocv_users_own ON ocv_users FOR ALL USING (id = auth.uid());

CREATE POLICY ocv_agents_own ON ocv_agents FOR ALL USING (user_id = auth.uid());

CREATE POLICY ocv_sessions_own ON ocv_sessions FOR ALL USING (
  agent_id IN (SELECT id FROM ocv_agents WHERE user_id = auth.uid())
);

CREATE POLICY ocv_messages_own ON ocv_messages FOR ALL USING (
  session_id IN (
    SELECT id FROM ocv_sessions WHERE agent_id IN (
      SELECT id FROM ocv_agents WHERE user_id = auth.uid()
    )
  )
);
