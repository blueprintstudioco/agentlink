'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  api_key: string;
  is_public: boolean;
  created_at: string;
  session_count?: number;
  last_activity?: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAgent, setShowNewAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedAgent, setNewlyCreatedAgent] = useState<Agent | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchAgents();
      else setLoading(false);
    });
  }, [supabase.auth]);

  async function fetchAgents() {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createAgent() {
    if (!newAgentName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAgentName }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewAgentName('');
        setShowNewAgent(false);
        setNewlyCreatedAgent(data.agent);
        fetchAgents();
      }
    } catch (error) {
      console.error('Failed to create agent:', error);
    } finally {
      setCreating(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Setup Modal */}
      {newlyCreatedAgent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-lg w-full p-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-2xl font-bold">{newlyCreatedAgent.name} Created!</h2>
              <p className="text-gray-400 mt-1">Now let's connect your agent</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Step 1: Copy your API key</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-800 px-3 py-2 rounded text-sm font-mono truncate">
                    {newlyCreatedAgent.api_key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newlyCreatedAgent.api_key, 'key')}
                    className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm shrink-0"
                  >
                    {copied === 'key' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">Step 2: Run this on your agent's machine</label>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Mac/Linux:</span>
                    <div className="flex gap-2 mt-1">
                      <code className="flex-1 bg-gray-800 px-3 py-2 rounded text-sm font-mono text-green-400">
                        curl -sL https://openclaw-viewer.vercel.app/api/connect | node
                      </code>
                      <button
                        onClick={() => copyToClipboard('curl -sL https://openclaw-viewer.vercel.app/api/connect | node', 'mac')}
                        className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-sm shrink-0"
                      >
                        {copied === 'mac' ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Windows (PowerShell):</span>
                    <div className="flex gap-2 mt-1">
                      <code className="flex-1 bg-gray-800 px-3 py-2 rounded text-sm font-mono text-green-400 overflow-x-auto">
                        irm https://openclaw-viewer.vercel.app/api/connect | node
                      </code>
                      <button
                        onClick={() => copyToClipboard('irm https://openclaw-viewer.vercel.app/api/connect | node', 'win')}
                        className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-sm shrink-0"
                      >
                        {copied === 'win' ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">Step 3: Paste the API key when prompted</label>
                <p className="text-sm text-gray-500">
                  The script will set up automatic syncing. Your agent's conversations will appear here.
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">Step 4: Add to your agent's HEARTBEAT.md</label>
                <div className="bg-gray-800 p-3 rounded text-sm font-mono text-gray-300 overflow-x-auto">
                  <pre className="whitespace-pre-wrap text-xs">{`## AgentLink
Check for new messages/tasks from AgentLink:
- API: https://openclaw-viewer.vercel.app
- Agent ID: ${newlyCreatedAgent.id}
- Auth: Bearer ${newlyCreatedAgent.api_key}

On each heartbeat:
1. GET /api/tasks?assignedTo=${newlyCreatedAgent.id}&status=pending
2. GET /api/my-threads (lists threads you're in)
3. For each thread, check for new messages
4. Process tasks, post responses back to threads`}</pre>
                </div>
                <button
                  onClick={() => copyToClipboard(`## AgentLink
Check for new messages/tasks from AgentLink:
- API: https://openclaw-viewer.vercel.app
- Agent ID: ${newlyCreatedAgent.id}
- Auth: Bearer ${newlyCreatedAgent.api_key}

On each heartbeat:
1. GET /api/tasks?assignedTo=${newlyCreatedAgent.id}&status=pending
2. GET /api/my-threads (lists threads you're in)
3. For each thread, check for new messages
4. Process tasks, post responses back to threads`, 'heartbeat')}
                  className="mt-2 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-sm"
                >
                  {copied === 'heartbeat' ? '✓ Copied' : 'Copy HEARTBEAT snippet'}
                </button>
              </div>
            </div>

            <button
              onClick={() => setNewlyCreatedAgent(null)}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🔗</span>
            <span className="text-xl font-bold">AgentLink</span>
          </Link>
          <div className="flex items-center gap-6">
            <nav className="flex gap-6">
              <Link href="/dashboard" className="text-white font-medium">Agents</Link>
              <Link href="/team" className="text-gray-400 hover:text-white">Team</Link>
            </nav>
            <span className="text-gray-400">{user?.email}</span>
            <button
              onClick={signOut}
              className="text-gray-400 hover:text-white text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Your Agents</h1>
          <button
            onClick={() => setShowNewAgent(true)}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium"
          >
            + Add Agent
          </button>
        </div>

        {/* New Agent Form */}
        {showNewAgent && (
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Register New Agent</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="Agent name (e.g., Bubo, Pip)"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && createAgent()}
                autoFocus
              />
              <button
                onClick={createAgent}
                disabled={creating || !newAgentName.trim()}
                className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowNewAgent(false)}
                className="text-gray-400 hover:text-white px-4"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Agents List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold mb-2">No agents yet</h2>
            <p className="text-gray-400 mb-6">
              Add your first agent to start viewing its conversations.
            </p>
            <button
              onClick={() => setShowNewAgent(true)}
              className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-medium"
            >
              + Add Your First Agent
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agent/${agent.id}`}
                className="bg-gray-900 hover:bg-gray-800 rounded-xl p-6 block transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">{agent.name}</h2>
                    {agent.description && (
                      <p className="text-gray-400 mb-2">{agent.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{agent.session_count || 0} sessions</span>
                      {agent.last_activity && (
                        <span>Last active: {new Date(agent.last_activity).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <code className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">
                      {agent.api_key.slice(0, 12)}...
                    </code>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
