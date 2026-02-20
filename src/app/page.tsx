'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { 
  Card, StatCard, Button, Badge, Input, SectionHeader, 
  EmptyState, ListRow, Avatar, QuickAction, NavItem 
} from '@/components/ui';

const USER_ID = '9452a23f-a139-42cd-83e4-732f188a07ff';
type TabType = 'dashboard' | 'calendar' | 'memory' | 'team';

// Simple auth
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

// Types
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_agent: string | null;
}

interface QuickActionData {
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
  isMainMemory?: boolean;
}

export default function MissionControl() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [actions, setActions] = useState<QuickActionData[]>([]);
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
    setAuthed(isAuthed());
  }, []);

  useEffect(() => {
    if (authed) loadDashboardData();
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    if (activeTab === 'calendar') loadCronJobs();
    if (activeTab === 'team') loadAgents();
    if (activeTab === 'memory') loadMemories();
  }, [activeTab, authed]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setAuth();
      setAuthed(true);
      setAuthError('');
    } else {
      setAuthError('Wrong password');
    }
  }

  async function loadDashboardData() {
    const [tasksRes, actionsRes, contentRes, activityRes, cronRes, agentsRes] = await Promise.all([
      supabase.from('mc_tasks').select('*').eq('user_id', USER_ID).neq('status', 'done').order('created_at', { ascending: false }).limit(10),
      supabase.from('mc_actions').select('*').eq('user_id', USER_ID).order('sort_order'),
      supabase.from('mc_content').select('*').eq('user_id', USER_ID).neq('status', 'published').order('created_at', { ascending: false }).limit(5),
      supabase.from('mc_activity').select('*').eq('user_id', USER_ID).order('created_at', { ascending: false }).limit(10),
      supabase.from('mc_cron_jobs').select('*').eq('user_id', USER_ID),
      supabase.from('mc_agents').select('*').eq('user_id', USER_ID),
    ]);

    setTasks(tasksRes.data || []);
    setActions(actionsRes.data || []);
    setContent(contentRes.data || []);
    setActivity(activityRes.data || []);
    setCronJobs(cronRes.data || []);
    setAgents(agentsRes.data || []);
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
    const { data: task } = await supabase.from('mc_tasks').insert({ user_id: USER_ID, title: newTask }).select().single();
    if (task) {
      setTasks([task, ...tasks]);
      setNewTask('');
    }
  }

  async function completeTask(taskId: string) {
    await supabase.from('mc_tasks').update({ status: 'done' }).eq('id', taskId);
    setTasks(tasks.filter(t => t.id !== taskId));
  }

  const filteredMemories = memories.filter(m => 
    memorySearch === '' || 
    m.filename.toLowerCase().includes(memorySearch.toLowerCase()) ||
    m.content.toLowerCase().includes(memorySearch.toLowerCase())
  );

  const onlineAgents = agents.filter(a => a.status === 'online').length;
  const activeJobs = cronJobs.filter(j => j.status === 'active').length;

  // Auth loading
  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  // Login
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[var(--accent-subtle)] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
              🎛️
            </div>
            <h1 className="text-xl font-semibold mb-1">Mission Control</h1>
            <p className="text-meta">Enter password to continue</p>
          </div>
          <form onSubmit={handleLogin}>
            <Input
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Password"
              className="mb-4"
            />
            {authError && <p className="text-red-400 text-sm mb-4">{authError}</p>}
            <Button type="submit" className="w-full">
              Enter
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading Mission Control...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[var(--border-subtle)] p-4 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 mb-6">
          <div className="w-9 h-9 bg-[var(--accent)] rounded-xl flex items-center justify-center text-lg">
            🎛️
          </div>
          <span className="font-semibold text-lg">Mission Control</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          <NavItem icon="📊" label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon="📅" label="Calendar" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
          <NavItem icon="🧠" label="Memory" active={activeTab === 'memory'} onClick={() => setActiveTab('memory')} />
          <NavItem icon="👥" label="Team" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
        </nav>

        {/* User */}
        <div className="pt-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={() => { clearAuth(); setAuthed(false); }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <span className="text-lg">👤</span>
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Header */}
              <div>
                <h1 className="text-title mb-1">Welcome back</h1>
                <p className="text-body">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-4">
                <StatCard label="Agents Online" value={onlineAgents} subtitle={`${agents.length} total`} icon="🤖" />
                <StatCard label="Scheduled Jobs" value={activeJobs} subtitle={`${cronJobs.length} configured`} icon="📅" />
                <StatCard label="Tasks Active" value={tasks.length} subtitle="0 due today" icon="✓" />
                <StatCard label="Content Drafts" value={content.length} subtitle="In pipeline" icon="📝" />
              </div>

              {/* Quick Actions + Today */}
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <SectionHeader title="Quick Actions" />
                  <div className="grid grid-cols-2 gap-3">
                    {actions.slice(0, 6).map((action) => (
                      <QuickAction 
                        key={action.id}
                        icon={action.icon || '⚡'} 
                        title={action.name} 
                        subtitle={action.description || undefined}
                      />
                    ))}
                    {actions.length === 0 && (
                      <Card className="col-span-2">
                        <EmptyState icon="⚡" title="No quick actions" description="Add shortcuts to common commands" />
                      </Card>
                    )}
                  </div>
                </div>

                <div>
                  <SectionHeader title="Today's Focus" />
                  <Card className="p-4 space-y-4">
                    {cronJobs.slice(0, 3).map((job) => (
                      <div key={job.id} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{job.name}</div>
                          <div className="text-meta">{job.next_run ? new Date(job.next_run).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not scheduled'}</div>
                        </div>
                      </div>
                    ))}
                    {cronJobs.length === 0 && (
                      <p className="text-meta text-center py-4">No scheduled jobs</p>
                    )}
                  </Card>
                </div>
              </div>

              {/* Tasks + Activity */}
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <SectionHeader title="Tasks" subtitle={`${tasks.length} active`} />
                  <Card>
                    <form onSubmit={addTask} className="p-4 border-b border-[var(--border-subtle)]">
                      <Input 
                        value={newTask} 
                        onChange={setNewTask} 
                        placeholder="Add a new task..." 
                        icon={<span className="text-lg">+</span>}
                      />
                    </form>
                    {tasks.length === 0 ? (
                      <EmptyState icon="✓" title="All caught up" description="No active tasks right now" />
                    ) : (
                      <div>
                        {tasks.map((task) => (
                          <ListRow key={task.id}>
                            <button
                              onClick={() => completeTask(task.id)}
                              className="w-5 h-5 rounded-md border-2 border-[var(--border-default)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{task.title}</div>
                              {task.description && <div className="text-meta truncate">{task.description}</div>}
                            </div>
                            {task.assigned_agent && (
                              <Badge variant="accent">{task.assigned_agent}</Badge>
                            )}
                            <Badge variant={task.status === 'in_progress' ? 'accent' : task.status === 'blocked' ? 'error' : 'default'}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </ListRow>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                <div>
                  <SectionHeader title="Activity Feed" />
                  <Card className="p-4">
                    {activity.length === 0 ? (
                      <p className="text-meta text-center py-8">No recent activity</p>
                    ) : (
                      <div className="space-y-4">
                        {activity.map((item) => (
                          <div key={item.id} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-sm">
                              {item.agent ? '🤖' : '👤'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm">{item.summary || item.action}</div>
                              <div className="text-meta">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>

              {/* Content Pipeline */}
              <div>
                <SectionHeader title="Content Pipeline" subtitle={`${content.length} drafts`} />
                <Card>
                  {content.length === 0 ? (
                    <EmptyState icon="📝" title="No content in pipeline" description="Drafts and scheduled posts will appear here" />
                  ) : (
                    <div>
                      {content.map((item) => (
                        <ListRow key={item.id}>
                          <div className="w-10 h-10 bg-[var(--bg-elevated)] rounded-lg flex items-center justify-center text-lg">
                            {item.platform === 'twitter' ? '𝕏' : item.platform === 'linkedin' ? '💼' : '📝'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{item.title || item.body.slice(0, 50)}</div>
                            <div className="text-meta">{item.platform || 'Draft'}</div>
                          </div>
                          <Badge>{item.status}</Badge>
                        </ListRow>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* Calendar */}
          {activeTab === 'calendar' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-title mb-1">Calendar</h1>
                <p className="text-body">Scheduled jobs and cron tasks</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Active Jobs" value={activeJobs} icon="✓" />
                <StatCard label="Total Configured" value={cronJobs.length} icon="📅" />
                <StatCard label="Next Run" value={cronJobs[0]?.next_run ? new Date(cronJobs[0].next_run).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'} icon="⏰" />
              </div>

              <Card>
                {cronJobs.length === 0 ? (
                  <EmptyState icon="📅" title="No scheduled jobs" description="Cron jobs will appear here when configured" />
                ) : (
                  <div>
                    {cronJobs.map((job) => (
                      <ListRow key={job.id}>
                        <div className={`w-3 h-3 rounded-full ${job.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{job.name}</div>
                          <div className="text-meta">{job.description}</div>
                        </div>
                        <code className="text-xs bg-[var(--bg-elevated)] px-2 py-1 rounded font-mono">{job.schedule}</code>
                        <div className="text-right">
                          <div className="text-sm">{job.next_run ? new Date(job.next_run).toLocaleString() : '-'}</div>
                          <div className="text-meta">Next run</div>
                        </div>
                        <Badge variant={job.status === 'active' ? 'success' : 'default'}>{job.status}</Badge>
                      </ListRow>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Memory */}
          {activeTab === 'memory' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-title mb-1">Memory</h1>
                  <p className="text-body">Your knowledge base and daily notes</p>
                </div>
                <Input 
                  value={memorySearch} 
                  onChange={setMemorySearch} 
                  placeholder="Search memories..."
                  className="w-64"
                  icon={<span>🔍</span>}
                />
              </div>

              <div className="grid grid-cols-3 gap-6" style={{ height: 'calc(100vh - 220px)' }}>
                <Card className="overflow-auto">
                  <div className="p-4 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-surface)]">
                    <div className="text-section">{filteredMemories.length} files</div>
                  </div>
                  {filteredMemories.map((mem) => (
                    <ListRow 
                      key={mem.filename} 
                      onClick={() => setSelectedMemory(mem)}
                      className={selectedMemory?.filename === mem.filename ? 'bg-[var(--accent-subtle)]' : ''}
                    >
                      <span className="text-lg">{mem.isMainMemory ? '📌' : '📝'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{mem.filename}</div>
                        <div className="text-meta truncate">{mem.preview}</div>
                      </div>
                      {mem.isMainMemory && <Badge variant="accent">pinned</Badge>}
                    </ListRow>
                  ))}
                </Card>

                <Card className="col-span-2 overflow-auto p-6">
                  {selectedMemory ? (
                    <>
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border-subtle)]">
                        <span className="text-2xl">{selectedMemory.isMainMemory ? '📌' : '📝'}</span>
                        <div>
                          <h2 className="font-semibold text-lg">{selectedMemory.filename}</h2>
                          <div className="text-meta">{selectedMemory.lastModified}</div>
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-[var(--text-secondary)]">
                        {selectedMemory.content}
                      </pre>
                    </>
                  ) : (
                    <EmptyState icon="🧠" title="Select a memory file" description="Choose a file from the list to view its contents" />
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* Team */}
          {activeTab === 'team' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-title mb-1">Team</h1>
                <p className="text-body">Your AI agent roster</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Agents Online" value={onlineAgents} subtitle={`of ${agents.length}`} icon="🤖" />
                <StatCard label="Total Capabilities" value={agents.reduce((acc, a) => acc + (a.capabilities?.length || 0), 0)} icon="⚡" />
                <StatCard label="Tasks Assigned" value={tasks.filter(t => t.assigned_agent).length} icon="📋" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                {agents.length === 0 ? (
                  <Card className="col-span-2">
                    <EmptyState icon="👥" title="No agents configured" description="Add your AI agents to the team" />
                  </Card>
                ) : (
                  agents.map((agent) => (
                    <Card key={agent.id} className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar emoji={agent.avatar_emoji || '🤖'} size="lg" status={agent.status as 'online' | 'offline'} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{agent.name}</h3>
                          <p className="text-body">{agent.role}</p>
                        </div>
                        <Badge variant={agent.status === 'online' ? 'success' : 'default'}>{agent.status}</Badge>
                      </div>
                      <p className="text-body mb-4">{agent.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {agent.capabilities?.map((cap) => (
                          <Badge key={cap}>{cap}</Badge>
                        ))}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
