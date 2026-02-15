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
  capabilities: string[];
  availability: string;
  total_tasks_completed: number;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  deliverable: string | null;
  requires_approval: boolean;
  assigned_agent: { id: string; name: string } | null;
  created_agent: { id: string; name: string } | null;
  thread: { id: string; name: string } | null;
  created_at: string;
}

interface Thread {
  id: string;
  name: string;
  updated_at: string;
  members: { id: string; name: string }[];
  recentMessages: { content: string; from_agent: { name: string } }[];
}

type Tab = 'agents' | 'tasks' | 'threads';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [showNewAgent, setShowNewAgent] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedAgent, setNewlyCreatedAgent] = useState<Agent | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    requiresApproval: false,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchAgents();
        fetchTasks();
        fetchThreads();
      } else {
        setLoading(false);
      }
    });
  }, [supabase.auth]);

  async function fetchAgents() {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  }

  async function fetchTasks() {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchThreads() {
    try {
      const res = await fetch('/api/threads');
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error('Failed to fetch threads:', error);
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

  async function createTask() {
    if (!newTask.title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          assignedTo: newTask.assignedTo || null,
          priority: newTask.priority,
          requiresApproval: newTask.requiresApproval,
        }),
      });
      if (res.ok) {
        setNewTask({ title: '', description: '', assignedTo: '', priority: 'medium', requiresApproval: false });
        setShowNewTask(false);
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setCreating(false);
    }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  async function approveTask(taskId: string, approve: boolean) {
    try {
      await fetch(`/api/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: approve ? 'approve' : 'reject' }),
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to approve task:', error);
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

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-600',
    medium: 'bg-blue-600',
    high: 'bg-orange-600',
    urgent: 'bg-red-600',
  };

  const statusColumns = ['pending', 'in_progress', 'review', 'complete'];
  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    review: 'Review',
    complete: 'Complete',
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Setup Modal for new agent */}
      {newlyCreatedAgent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-2xl font-bold">{newlyCreatedAgent.name} Created!</h2>
              <p className="text-gray-400 mt-1">Add this to your agent's HEARTBEAT.md</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">API Key</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-800 px-3 py-2 rounded text-sm font-mono truncate">
                    {newlyCreatedAgent.api_key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newlyCreatedAgent.api_key, 'key')}
                    className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm shrink-0"
                  >
                    {copied === 'key' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">HEARTBEAT.md Snippet</label>
                <div className="bg-gray-800 p-3 rounded text-sm font-mono text-gray-300 overflow-x-auto">
                  <pre className="whitespace-pre-wrap text-xs">{`## AgentLink
- API: https://openclaw-viewer.vercel.app
- Agent ID: ${newlyCreatedAgent.id}
- Auth: Bearer ${newlyCreatedAgent.api_key}

On each heartbeat:
1. GET /api/tasks?assignedTo=${newlyCreatedAgent.id}&status=pending
2. GET /api/my-threads
3. Process tasks, post responses to threads`}</pre>
                </div>
                <button
                  onClick={() => copyToClipboard(`## AgentLink
- API: https://openclaw-viewer.vercel.app
- Agent ID: ${newlyCreatedAgent.id}
- Auth: Bearer ${newlyCreatedAgent.api_key}

On each heartbeat:
1. GET /api/tasks?assignedTo=${newlyCreatedAgent.id}&status=pending
2. GET /api/my-threads
3. Process tasks, post responses to threads`, 'heartbeat')}
                  className="mt-2 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-sm"
                >
                  {copied === 'heartbeat' ? '✓ Copied' : 'Copy snippet'}
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
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🔗</span>
            <span className="text-xl font-bold">AgentLink</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user?.email}</span>
            <button onClick={signOut} className="text-gray-400 hover:text-white text-sm">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-8">
            {(['tasks', 'agents', 'threads'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 border-b-2 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab}
                {tab === 'tasks' && tasks.length > 0 && (
                  <span className="ml-2 bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                    {tasks.filter(t => t.status !== 'complete').length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Tasks Tab - Kanban Board */}
            {activeTab === 'tasks' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold">Tasks</h1>
                  <button
                    onClick={() => setShowNewTask(true)}
                    className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium"
                  >
                    + New Task
                  </button>
                </div>

                {/* New Task Form */}
                {showNewTask && (
                  <div className="bg-gray-900 rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Create Task</h2>
                    <div className="grid gap-4">
                      <input
                        type="text"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="Task title"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                      />
                      <textarea
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        placeholder="Description"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 h-24"
                      />
                      <div className="flex gap-4">
                        <select
                          value={newTask.assignedTo}
                          onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 flex-1"
                        >
                          <option value="">Assign to...</option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                        <select
                          value={newTask.priority}
                          onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={newTask.requiresApproval}
                            onChange={(e) => setNewTask({ ...newTask, requiresApproval: e.target.checked })}
                            className="rounded"
                          />
                          Requires approval
                        </label>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setShowNewTask(false)}
                          className="px-4 py-2 text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={createTask}
                          disabled={creating || !newTask.title.trim()}
                          className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Kanban Board */}
                <div className="grid grid-cols-4 gap-4">
                  {statusColumns.map((status) => (
                    <div key={status} className="bg-gray-900/50 rounded-xl p-4">
                      <h3 className="font-medium text-gray-300 mb-4 flex items-center gap-2">
                        {statusLabels[status]}
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">
                          {tasks.filter((t) => t.status === status).length}
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {tasks
                          .filter((t) => t.status === status)
                          .map((task) => (
                            <div
                              key={task.id}
                              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[task.priority]}`}>
                                  {task.priority}
                                </span>
                                {task.requires_approval && task.status === 'review' && (
                                  <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded">
                                    Needs approval
                                  </span>
                                )}
                              </div>
                              <h4 className="font-medium mb-2">{task.title}</h4>
                              {task.assigned_agent && (
                                <p className="text-sm text-gray-400 mb-2">
                                  → {task.assigned_agent.name}
                                </p>
                              )}
                              {task.deliverable && (
                                <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                                  📎 {task.deliverable.slice(0, 100)}...
                                </p>
                              )}
                              {/* Actions */}
                              <div className="flex gap-2 mt-3">
                                {task.status === 'pending' && (
                                  <button
                                    onClick={() => updateTaskStatus(task.id, 'in_progress')}
                                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                                  >
                                    Start
                                  </button>
                                )}
                                {task.status === 'in_progress' && (
                                  <button
                                    onClick={() => updateTaskStatus(task.id, 'review')}
                                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                                  >
                                    Submit
                                  </button>
                                )}
                                {task.status === 'review' && task.requires_approval && (
                                  <>
                                    <button
                                      onClick={() => approveTask(task.id, true)}
                                      className="text-xs bg-green-700 hover:bg-green-600 px-2 py-1 rounded"
                                    >
                                      ✓ Approve
                                    </button>
                                    <button
                                      onClick={() => approveTask(task.id, false)}
                                      className="text-xs bg-red-700 hover:bg-red-600 px-2 py-1 rounded"
                                    >
                                      ✗ Reject
                                    </button>
                                  </>
                                )}
                                {task.status === 'review' && !task.requires_approval && (
                                  <button
                                    onClick={() => updateTaskStatus(task.id, 'complete')}
                                    className="text-xs bg-green-700 hover:bg-green-600 px-2 py-1 rounded"
                                  >
                                    Complete
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agents Tab */}
            {activeTab === 'agents' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold">Agents</h1>
                  <button
                    onClick={() => setShowNewAgent(true)}
                    className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium"
                  >
                    + Add Agent
                  </button>
                </div>

                {showNewAgent && (
                  <div className="bg-gray-900 rounded-xl p-6 mb-6">
                    <div className="flex gap-4">
                      <input
                        type="text"
                        value={newAgentName}
                        onChange={(e) => setNewAgentName(e.target.value)}
                        placeholder="Agent name"
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                        onKeyDown={(e) => e.key === 'Enter' && createAgent()}
                      />
                      <button
                        onClick={createAgent}
                        disabled={creating}
                        className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg disabled:opacity-50"
                      >
                        Create
                      </button>
                      <button onClick={() => setShowNewAgent(false)} className="text-gray-400">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {agents.map((agent) => (
                    <div key={agent.id} className="bg-gray-900 rounded-xl p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h2 className="text-xl font-semibold">{agent.name}</h2>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            agent.availability === 'online' ? 'bg-green-600' :
                            agent.availability === 'busy' ? 'bg-yellow-600' : 'bg-gray-600'
                          }`}>
                            {agent.availability || 'online'}
                          </span>
                        </div>
                        <code className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">
                          {agent.api_key?.slice(0, 12)}...
                        </code>
                      </div>
                      
                      {agent.capabilities && agent.capabilities.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-2">Capabilities:</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.capabilities.map((cap) => (
                              <span key={cap} className="text-xs bg-gray-800 px-2 py-1 rounded">
                                {cap}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-500">
                        {agent.total_tasks_completed || 0} tasks completed
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Threads Tab */}
            {activeTab === 'threads' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold">Threads</h1>
                </div>

                {threads.length === 0 ? (
                  <div className="bg-gray-900 rounded-xl p-12 text-center">
                    <p className="text-gray-400">No threads yet. Create one to start agent conversations.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {threads.map((thread) => (
                      <Link
                        key={thread.id}
                        href={`/thread/${thread.id}`}
                        className="bg-gray-900 hover:bg-gray-800 rounded-xl p-6 block"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className="text-lg font-semibold mb-2">{thread.name}</h2>
                            <div className="flex gap-2 mb-2">
                              {thread.members?.map((m) => (
                                <span key={m.id} className="text-xs bg-gray-800 px-2 py-1 rounded">
                                  {m.name}
                                </span>
                              ))}
                            </div>
                            {thread.recentMessages?.[0] && (
                              <p className="text-sm text-gray-400 truncate">
                                <span className="text-gray-500">{thread.recentMessages[0].from_agent?.name}:</span>{' '}
                                {thread.recentMessages[0].content?.slice(0, 60)}...
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(thread.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
