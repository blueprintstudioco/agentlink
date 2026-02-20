'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

const USER_ID = '9452a23f-a139-42cd-83e4-732f188a07ff';
type TabType = 'dashboard' | 'calendar' | 'memory' | 'team';

const AUTH_COOKIE = 'mc_auth';
const CORRECT_PASSWORD = 'brushworks2026';

function isAuthed(): boolean {
  if (typeof window === 'undefined') return false;
  return document.cookie.includes(`${AUTH_COOKIE}=1`);
}
function setAuth() {
  document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}`;
}
function clearAuth() {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}

interface Task { id: string; title: string; description: string | null; status: string; assigned_agent: string | null; }
interface QuickActionData { id: string; name: string; description: string | null; icon: string | null; }
interface CronJob { id: string; name: string; schedule: string; next_run: string | null; status: string; description: string | null; }
interface Agent { id: string; name: string; role: string; description: string | null; avatar_emoji: string | null; status: string; capabilities: string[] | null; }
interface MemoryFile { filename: string; content: string; preview: string; lastModified: string; isMainMemory?: boolean; }
interface Activity { id: string; agent: string | null; summary: string | null; created_at: string; }
interface Content { id: string; title: string | null; body: string; platform: string | null; status: string; }

export default function MissionControl() {
  const [authed, setAuthedState] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [actions, setActions] = useState<QuickActionData[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [memories, setMemories] = useState<MemoryFile[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MemoryFile | null>(null);
  const [memorySearch, setMemorySearch] = useState('');
  const [activity, setActivity] = useState<Activity[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  
  const supabase = createSupabaseBrowserClient();

  useEffect(() => { setAuthedState(isAuthed()); }, []);
  useEffect(() => { if (authed) loadData(); }, [authed]);
  useEffect(() => {
    if (!authed) return;
    if (activeTab === 'memory') loadMemories();
  }, [activeTab, authed]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) { setAuth(); setAuthedState(true); }
    else { setAuthError('Wrong password'); }
  }

  async function loadData() {
    const [t, a, c, cr, ag, act] = await Promise.all([
      supabase.from('mc_tasks').select('*').eq('user_id', USER_ID).neq('status', 'done').limit(10),
      supabase.from('mc_actions').select('*').eq('user_id', USER_ID).order('sort_order'),
      supabase.from('mc_content').select('*').eq('user_id', USER_ID).neq('status', 'published').limit(5),
      supabase.from('mc_cron_jobs').select('*').eq('user_id', USER_ID),
      supabase.from('mc_agents').select('*').eq('user_id', USER_ID),
      supabase.from('mc_activity').select('*').eq('user_id', USER_ID).order('created_at', { ascending: false }).limit(10),
    ]);
    setTasks(t.data || []);
    setActions(a.data || []);
    setContent(c.data || []);
    setCronJobs(cr.data || []);
    setAgents(ag.data || []);
    setActivity(act.data || []);
    setLoading(false);
  }

  async function loadMemories() {
    try {
      const res = await fetch('/api/memories');
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (e) { console.error(e); }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    const { data } = await supabase.from('mc_tasks').insert({ user_id: USER_ID, title: newTask }).select().single();
    if (data) { setTasks([data, ...tasks]); setNewTask(''); }
  }

  async function completeTask(id: string) {
    await supabase.from('mc_tasks').update({ status: 'done' }).eq('id', id);
    setTasks(tasks.filter(t => t.id !== id));
  }

  const filteredMemories = memories.filter(m => !memorySearch || m.filename.toLowerCase().includes(memorySearch.toLowerCase()) || m.content.toLowerCase().includes(memorySearch.toLowerCase()));

  if (authed === null) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Loading...</div>;

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎛️</div>
            <h1 className="text-xl font-semibold text-white">Mission Control</h1>
            <p className="text-zinc-500 text-sm mt-1">Enter password to continue</p>
          </div>
          <form onSubmit={handleLogin}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 mb-4" />
            {authError && <p className="text-red-400 text-sm mb-4">{authError}</p>}
            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium py-3 rounded-xl transition-colors">Enter</button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Loading...</div>;

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: '📊' },
    { id: 'calendar' as TabType, label: 'Calendar', icon: '📅' },
    { id: 'memory' as TabType, label: 'Memory', icon: '🧠' },
    { id: 'team' as TabType, label: 'Team', icon: '👥' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-zinc-900/50 border-r border-zinc-800/50 flex flex-col">
        <div className="p-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-sm">🎛️</div>
            <span className="font-semibold">Mission Control</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-orange-600/20 text-orange-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-800/50">
          <button onClick={() => { clearAuth(); setAuthedState(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300">
            <span>🚪</span><span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">

          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold">Welcome back</h1>
                <p className="text-zinc-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Agents Online', value: agents.filter(a => a.status === 'online').length, sub: `${agents.length} total` },
                  { label: 'Scheduled Jobs', value: cronJobs.filter(j => j.status === 'active').length, sub: `${cronJobs.length} configured` },
                  { label: 'Tasks Active', value: tasks.length, sub: '0 due today' },
                  { label: 'Content Drafts', value: content.length, sub: 'In pipeline' },
                ].map(s => (
                  <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="text-xs text-zinc-500 mb-1">{s.label}</div>
                    <div className="text-2xl font-semibold">{s.value}</div>
                    <div className="text-xs text-zinc-600">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Quick Actions + Focus */}
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Quick Actions</div>
                  <div className="grid grid-cols-3 gap-3">
                    {actions.slice(0, 6).map(a => (
                      <button key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left hover:bg-zinc-800 hover:border-zinc-700 transition-colors group">
                        <div className="text-xl mb-2">{a.icon || '⚡'}</div>
                        <div className="font-medium text-sm">{a.name}</div>
                        {a.description && <div className="text-xs text-zinc-500 mt-1">{a.description}</div>}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Today's Focus</div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                    {cronJobs.slice(0, 4).map(j => (
                      <div key={j.id} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{j.name}</div>
                          <div className="text-xs text-zinc-500">{j.next_run ? new Date(j.next_run).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                        </div>
                      </div>
                    ))}
                    {cronJobs.length === 0 && <div className="text-zinc-500 text-sm text-center py-2">No scheduled jobs</div>}
                  </div>
                </div>
              </div>

              {/* Tasks + Activity */}
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Tasks <span className="text-zinc-600">({tasks.length})</span></div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <form onSubmit={addTask} className="p-3 border-b border-zinc-800">
                      <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Add a new task..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-orange-500" />
                    </form>
                    {tasks.length === 0 ? (
                      <div className="py-8 text-center text-zinc-500 text-sm">All caught up</div>
                    ) : (
                      <div className="divide-y divide-zinc-800">
                        {tasks.map(t => (
                          <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50">
                            <button onClick={() => completeTask(t.id)} className="w-4 h-4 rounded border border-zinc-600 hover:border-orange-500 hover:bg-orange-500/20 flex-shrink-0"></button>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm">{t.title}</div>
                            </div>
                            {t.assigned_agent && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">{t.assigned_agent}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Activity</div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    {activity.length === 0 ? (
                      <div className="text-zinc-500 text-sm text-center py-4">No recent activity</div>
                    ) : (
                      <div className="space-y-3">
                        {activity.slice(0, 5).map(a => (
                          <div key={a.id} className="flex items-start gap-2">
                            <div className="text-sm">{a.agent ? '🤖' : '👤'}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-zinc-300">{a.summary}</div>
                              <div className="text-xs text-zinc-600">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Pipeline */}
              <div>
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Content Pipeline</div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
                  {content.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500 text-sm">No content in pipeline</div>
                  ) : (
                    <div className="divide-y divide-zinc-800">
                      {content.map(c => (
                        <div key={c.id} className="flex items-center gap-4 px-4 py-3">
                          <div className="text-xl">{c.platform === 'twitter' ? '𝕏' : '📝'}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm">{c.title || c.body.slice(0, 50)}</div>
                            <div className="text-xs text-zinc-500">{c.platform || 'Draft'}</div>
                          </div>
                          <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded">{c.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold">Calendar</h1>
                <p className="text-zinc-500">Scheduled jobs and cron tasks</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
                {cronJobs.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500">No scheduled jobs</div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {cronJobs.map(j => (
                      <div key={j.id} className="flex items-center gap-4 px-4 py-4">
                        <div className={`w-2 h-2 rounded-full ${j.status === 'active' ? 'bg-green-500' : 'bg-zinc-600'}`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{j.name}</div>
                          <div className="text-sm text-zinc-500">{j.description}</div>
                        </div>
                        <code className="text-xs bg-zinc-800 px-2 py-1 rounded font-mono">{j.schedule}</code>
                        <div className="text-right text-sm">
                          <div>{j.next_run ? new Date(j.next_run).toLocaleString() : '—'}</div>
                          <div className="text-xs text-zinc-500">Next run</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${j.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>{j.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MEMORY */}
          {activeTab === 'memory' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">Memory</h1>
                  <p className="text-zinc-500">Knowledge base and daily notes</p>
                </div>
                <input value={memorySearch} onChange={e => setMemorySearch(e.target.value)} placeholder="Search..."
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm w-48 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500" />
              </div>
              <div className="grid grid-cols-3 gap-6" style={{ height: 'calc(100vh - 200px)' }}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-auto">
                  {filteredMemories.map(m => (
                    <button key={m.filename} onClick={() => setSelectedMemory(m)}
                      className={`w-full text-left px-4 py-3 border-b border-zinc-800 last:border-b-0 hover:bg-zinc-800 ${selectedMemory?.filename === m.filename ? 'bg-orange-500/10' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span>{m.isMainMemory ? '📌' : '📝'}</span>
                        <span className="font-medium text-sm">{m.filename}</span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1 truncate">{m.preview}</div>
                    </button>
                  ))}
                </div>
                <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6 overflow-auto">
                  {selectedMemory ? (
                    <>
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-800">
                        <span className="text-2xl">{selectedMemory.isMainMemory ? '📌' : '📝'}</span>
                        <div>
                          <div className="font-semibold">{selectedMemory.filename}</div>
                          <div className="text-xs text-zinc-500">{selectedMemory.lastModified}</div>
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap text-sm font-mono text-zinc-400 leading-relaxed">{selectedMemory.content}</pre>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-500">Select a file</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TEAM */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold">Team</h1>
                <p className="text-zinc-500">Your AI agent roster</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {agents.map(a => (
                  <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 bg-zinc-800 rounded-xl flex items-center justify-center text-3xl">{a.avatar_emoji || '🤖'}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{a.name}</div>
                        <div className="text-zinc-500">{a.role}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${a.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>{a.status}</span>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4">{a.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {a.capabilities?.map(c => <span key={c} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">{c}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
