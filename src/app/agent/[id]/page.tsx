'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  api_key: string;
  is_public: boolean;
}

interface Session {
  id: string;
  session_key: string;
  kind: string | null;
  label: string | null;
  channel: string | null;
  updated_at: string;
  message_count: number;
  last_message?: string;
}

export default function AgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAgent();
  }, [agentId]);

  async function fetchAgent() {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      const data = await res.json();
      setAgent(data.agent);
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch agent:', error);
    } finally {
      setLoading(false);
    }
  }

  function copyApiKey() {
    if (agent) {
      navigator.clipboard.writeText(agent.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function deleteAgent() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Agent not found</h1>
          <Link href="/dashboard" className="text-blue-400 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-400 hover:text-white">
              ← Back
            </Link>
            <span className="text-xl font-bold">{agent.name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Agent Info */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Connection Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Webhook URL</label>
              <code className="bg-gray-800 px-3 py-2 rounded block text-sm">
                {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/messages
              </code>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">API Key</label>
              <div className="flex items-center gap-2">
                <code className="bg-gray-800 px-3 py-2 rounded flex-1 text-sm font-mono">
                  {showApiKey ? agent.api_key : '•'.repeat(32)}
                </code>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-gray-400 hover:text-white px-3 py-2"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={copyApiKey}
                  className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-sm"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <p className="text-sm text-gray-400 mb-3">
                Run this on your agent's machine to connect:
              </p>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500">Mac/Linux:</span>
                  <code className="block bg-gray-800 px-3 py-2 rounded text-sm text-green-400 mt-1">
                    curl -sL https://openclaw-viewer.vercel.app/connect.js | node
                  </code>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Windows (PowerShell):</span>
                  <code className="block bg-gray-800 px-3 py-2 rounded text-sm text-green-400 mt-1">
                    irm https://openclaw-viewer.vercel.app/connect.js | node
                  </code>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                It will ask for your API key and set up automatic syncing.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete this agent
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-2">Delete {agent.name}?</h2>
              <p className="text-gray-400 mb-6">
                This will permanently delete this agent and all its session data. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAgent}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-500 py-2 rounded-lg disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sessions */}
        <h2 className="text-2xl font-bold mb-4">Sessions</h2>
        
        {sessions.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">No sessions yet</h3>
            <p className="text-gray-400">
              Configure your agent to push messages and they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/agent/${agentId}/session/${session.id}`}
                className="bg-gray-900 hover:bg-gray-800 rounded-xl p-5 block transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {session.label || session.session_key}
                      </span>
                      {session.kind && (
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                          {session.kind}
                        </span>
                      )}
                      {session.channel && (
                        <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">
                          {session.channel}
                        </span>
                      )}
                    </div>
                    {session.last_message && (
                      <p className="text-sm text-gray-500 truncate">
                        {session.last_message}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="text-sm text-gray-400">
                      {session.message_count} messages
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(session.updated_at).toLocaleString()}
                    </div>
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
