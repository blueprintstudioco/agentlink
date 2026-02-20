'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import CronVisualizer from '@/components/CronVisualizer';
import MemoryBrowser from '@/components/MemoryBrowser';

// Alex's hardcoded user ID - single user app
const USER_ID = '9452a23f-a139-42cd-83e4-732f188a07ff';

type TabType = 'dashboard' | 'calendar' | 'memory' | 'team';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  assigned_agent: string | null;
  tags: string[] | null;
}

interface QuickAction {
  id: string;
  name: string;
  description: string | null;
  command: string;
  icon: string | null;
}

interface Content {
  id: string;
  title: string | null;
  body: string;
  platform: string | null;
  status: string;
  scheduled_for: string | null;
}

interface Activity {
  id: string;
  agent: string | null;
  action: string;
  summary: string | null;
  created_at: string;
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  next_run: string | null;
  last_run: string | null;
  status: string;
  description: string | null;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string | null;
  avatar_emoji: string | null;
  status: string;
  capabilities: string[] | null;
}

interface MemoryFile {
  filename: string;
  content: string;
  preview: string;
  lastModified: string;
}

export default function MissionControl() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [memories, setMemories] = useState<MemoryFile[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MemoryFile | null>(null);
  const [memorySearch, setMemorySearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'calendar') loadCronJobs();
    if (activeTab === 'team') loadAgents();
    if (activeTab === 'memory') loadMemories();
  }, [activeTab]);

  async function loadDashboardData() {
    const [tasksRes, actionsRes, contentRes, activityRes] = await Promise.all([
      supabase.from('mc_tasks').select('*').eq('user_id', USER_ID).neq('status', 'done').order('created_at', { ascending: false }).limit(10),
      supabase.from('mc_actions').select('*').eq('user_id', USER_ID).order('sort_order'),
      supabase.from('mc_content').select('*').eq('user_id', USER_ID).neq('status', 'published').order('created_at', { ascending: false }).limit(5),
      supabase.from('mc_activity').select('*').eq('user_id', USER_ID).order('created_at', { ascending: false }).limit(10),
    ]);

    setTasks(tasksRes.data || []);
    setActions(actionsRes.data || []);
    setContent(contentRes.data || []);
    setActivity(activityRes.data || []);
    setLoading(false);
  }

  async function loadCronJobs() {
    const { data } = await supabase.from('mc_cron_jobs').select('*').eq('user_id', USER_ID).order('next_run');
    setCronJobs(data || []);
  }

  async function loadAgents() {
    const { data } = await supabase.from('mc_agents').select('*').eq('user_id', USER_ID);
    setAgents(data || []);
  }

  async function loadMemories() {
    try {
      const res = await fetch('/api/memories');
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (e) {
      console.error('Failed to load memories:', e);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;

    const { data: task } = await supabase
      .from('mc_tasks')
      .insert({ user_id: USER_ID, title: newTask })
      .select()
      .single();

    if (task) {
      setTasks([task, ...tasks]);
      setNewTask('');
    }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    await supabase.from('mc_tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId);
    if (status === 'done') {
      setTasks(tasks.filter(t => t.id !== taskId));
    } else {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: status as Task['status'] } : t));
    }
  }

  const statusColors = {
    todo: 'bg-gray-700',
    in_progress: 'bg-blue-600',
    blocked: 'bg-red-600',
    done: 'bg-green-600',
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '🎛️' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'memory', label: 'Memory', icon: '🧠' },
    { id: 'team', label: 'Team', icon: '👥' },
  ];

  const filteredMemories = memories.filter(m => 
    memorySearch === '' || 
    m.filename.toLowerCase().includes(memorySearch.toLowerCase()) ||
    m.content.toLowerCase().includes(memorySearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading Mission Control...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎛️</span>
            <span className="text-2xl font-bold">Mission Control</span>
          </div>
          <div className="flex items-center gap-6">
            {/* Tab Navigation */}
            <nav className="flex gap-1 bg-gray-900 rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-orange-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
            <span className="text-sm text-gray-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Quick Actions */}
            <section className="mb-10">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-4 text-left transition-colors"
                    title={action.description || action.command}
                  >
                    <div className="text-2xl mb-2">{action.icon || '⚡'}</div>
                    <div className="font-medium text-sm">{action.name}</div>
                  </button>
                ))}
              </div>
            </section>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Tasks */}
              <section className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Tasks</h2>
                  <span className="text-xs text-gray-500">{tasks.length} active</span>
                </div>
                
                <form onSubmit={addTask} className="mb-4">
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Add a task..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </form>

                <div className="space-y-2">
                  {tasks.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">No active tasks</div>
                  ) : (
                    tasks.map((task) => (
                      <div key={task.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-4">
                        <button
                          onClick={() => updateTaskStatus(task.id, 'done')}
                          className="w-5 h-5 rounded border-2 border-gray-600 hover:border-green-500 hover:bg-green-500/20 flex-shrink-0"
                        />
                        <div className="flex-grow min-w-0">
                          <div className="font-medium truncate">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-gray-400 truncate">{task.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {task.assigned_agent && (
                            <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded">
                              {task.assigned_agent}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded ${statusColors[task.status]}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Sidebar */}
              <aside className="space-y-8">
                <section>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Content Pipeline</h2>
                  <div className="space-y-2">
                    {content.length === 0 ? (
                      <div className="text-gray-500 text-sm">No drafts</div>
                    ) : (
                      content.map((item) => (
                        <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs uppercase text-gray-500">{item.platform || 'draft'}</span>
                            <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">{item.status}</span>
                          </div>
                          <div className="text-sm truncate">{item.title || item.body.slice(0, 50)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Recent Activity</h2>
                  <div className="space-y-2">
                    {activity.length === 0 ? (
                      <div className="text-gray-500 text-sm">No recent activity</div>
                    ) : (
                      activity.map((item) => (
                        <div key={item.id} className="text-sm text-gray-400">
                          <span className="text-gray-500">
                            {item.agent ? `🤖 ${item.agent}` : '👤 You'}
                          </span>
                          {' '}{item.summary || item.action}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-6">Scheduled Tasks & Cron Jobs</h2>
            {cronJobs.length === 0 ? (
              <div className="text-gray-500 text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
                <div className="text-4xl mb-4">📅</div>
                <div>No scheduled jobs yet</div>
                <div className="text-sm text-gray-600 mt-2">Cron jobs will appear here</div>
              </div>
            ) : (
              <div className="grid gap-4">
                {cronJobs.map((job) => (
                  <div key={job.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{job.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${job.status === 'active' ? 'bg-green-600' : 'bg-gray-700'}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{job.description}</p>
                    <div className="flex gap-6 text-xs text-gray-500">
                      <div><span className="text-gray-600">Schedule:</span> {job.schedule}</div>
                      {job.next_run && <div><span className="text-gray-600">Next:</span> {new Date(job.next_run).toLocaleString()}</div>}
                      {job.last_run && <div><span className="text-gray-600">Last:</span> {new Date(job.last_run).toLocaleString()}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Memory Tab */}
        {activeTab === 'memory' && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Memory Browser</h2>
              <input
                type="text"
                value={memorySearch}
                onChange={(e) => setMemorySearch(e.target.value)}
                placeholder="Search memories..."
                className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 w-64"
              />
            </div>
            
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Memory List */}
              <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto">
                {filteredMemories.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">No memories found</div>
                ) : (
                  filteredMemories.map((mem) => (
                    <button
                      key={mem.filename}
                      onClick={() => setSelectedMemory(mem)}
                      className={`w-full text-left bg-gray-900 border rounded-lg p-3 transition-colors ${
                        selectedMemory?.filename === mem.filename 
                          ? 'border-orange-500' 
                          : 'border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="font-medium text-sm">{mem.filename}</div>
                      <div className="text-xs text-gray-500 mt-1 truncate">{mem.preview}</div>
                      <div className="text-xs text-gray-600 mt-1">{mem.lastModified}</div>
                    </button>
                  ))
                )}
              </div>
              
              {/* Memory Content */}
              <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6 max-h-[70vh] overflow-y-auto">
                {selectedMemory ? (
                  <>
                    <h3 className="font-semibold text-lg mb-4 text-orange-400">{selectedMemory.filename}</h3>
                    <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
                      {selectedMemory.content}
                    </pre>
                  </>
                ) : (
                  <div className="text-gray-500 text-center py-12">
                    <div className="text-4xl mb-4">🧠</div>
                    <div>Select a memory file to view</div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-6">Your AI Team</h2>
            {agents.length === 0 ? (
              <div className="text-gray-500 text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
                <div className="text-4xl mb-4">👥</div>
                <div>No agents configured</div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <div key={agent.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-5xl">{agent.avatar_emoji || '🤖'}</div>
                      <div>
                        <h3 className="font-semibold text-lg">{agent.name}</h3>
                        <p className="text-sm text-gray-400">{agent.role}</p>
                      </div>
                      <div className={`ml-auto w-3 h-3 rounded-full ${agent.status === 'online' ? 'bg-green-500' : 'bg-gray-600'}`} />
                    </div>
                    <p className="text-sm text-gray-400 mb-4">{agent.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {agent.capabilities?.map((cap) => (
                        <span key={cap} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
