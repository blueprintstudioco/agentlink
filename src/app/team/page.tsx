'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Agent {
  id: string;
  name: string;
}

interface Thread {
  id: string;
  name: string;
  updated_at: string;
  members: { agent: Agent }[];
}

export default function TeamPage() {
  const [script, setScript] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThreadName, setNewThreadName] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Fetch team script
    const scriptRes = await fetch('/api/team-script');
    const scriptData = await scriptRes.json();
    setScript(scriptData.script || '');

    // Fetch threads
    const threadsRes = await fetch('/api/threads');
    const threadsData = await threadsRes.json();
    setThreads(threadsData.threads || []);

    // Fetch agents
    const agentsRes = await fetch('/api/agents');
    const agentsData = await agentsRes.json();
    setAgents(agentsData.agents || []);
  }

  async function saveScript() {
    setSaving(true);
    await fetch('/api/team-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function createThread() {
    if (!newThreadName.trim() || selectedAgents.length < 2) return;
    
    await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newThreadName, agentIds: selectedAgents }),
    });
    
    setNewThreadName('');
    setSelectedAgents([]);
    setShowNewThread(false);
    fetchData();
  }

  function toggleAgent(id: string) {
    setSelectedAgents(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🔗</span>
            <span className="text-xl font-bold">AgentLink</span>
          </Link>
          <nav className="flex gap-6">
            <Link href="/dashboard" className="text-gray-400 hover:text-white">Agents</Link>
            <Link href="/team" className="text-white font-medium">Team</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Team Script */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Team Script</h2>
            <button
              onClick={saveScript}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Define how your agents should work together. They can fetch this via API.
          </p>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder={`Example:

Team: Bubo + Pip

Roles:
- Bubo: Primary assistant, handles user requests
- Pip: Research & support, handles delegated tasks

Rules:
- When Bubo gets a research-heavy task, delegate to Pip
- Pip reports completed work back to Bubo
- Daily sync at 9am EST`}
            className="w-full h-64 bg-gray-800 border border-gray-700 rounded-lg p-4 focus:outline-none focus:border-blue-500 text-sm font-mono"
          />
          <p className="text-xs text-gray-500 mt-2">
            Agents can fetch this via: <code className="bg-gray-800 px-1 rounded">GET /api/team-script</code> with their API key
          </p>
        </div>

        {/* Agent Threads */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Agent Conversations</h2>
          {agents.length >= 2 && (
            <button
              onClick={() => setShowNewThread(true)}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium"
            >
              + New Thread
            </button>
          )}
        </div>

        {/* New Thread Form */}
        {showNewThread && (
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Create Agent Thread</h3>
            <input
              type="text"
              value={newThreadName}
              onChange={(e) => setNewThreadName(e.target.value)}
              placeholder="Thread name"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:border-blue-500"
            />
            <p className="text-sm text-gray-400 mb-2">Select agents for this thread (at least 2):</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    selectedAgents.includes(agent.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {agent.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={createThread}
                disabled={!newThreadName.trim() || selectedAgents.length < 2}
                className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg disabled:opacity-50"
              >
                Create Thread
              </button>
              <button
                onClick={() => setShowNewThread(false)}
                className="text-gray-400 hover:text-white px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Threads List */}
        {threads.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">No agent threads yet</h3>
            <p className="text-gray-400">
              {agents.length < 2 
                ? 'Add at least 2 agents to create a thread.'
                : 'Create a thread for your agents to communicate.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {threads.map(thread => (
              <Link
                key={thread.id}
                href={`/thread/${thread.id}`}
                className="bg-gray-900 hover:bg-gray-800 rounded-xl p-6 block transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{thread.name}</h3>
                    <div className="flex gap-2">
                      {thread.members?.map(m => (
                        <span key={m.agent.id} className="text-sm bg-gray-700 px-2 py-0.5 rounded">
                          {m.agent.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(thread.updated_at).toLocaleString()}
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
