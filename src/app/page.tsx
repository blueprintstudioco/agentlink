'use client';

import { useEffect, useMemo, useState } from 'react';
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

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assigned_agent: string | null;
}

interface QuickActionData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  next_run: string | null;
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

interface Activity {
  id: string;
  agent: string | null;
  summary: string | null;
  created_at: string;
}

interface Content {
  id: string;
  title: string | null;
  body: string;
  platform: string | null;
  status: string;
}

function Sparkline() {
  return (
    <svg viewBox="0 0 96 24" className="h-6 w-24" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points="0,18 14,16 28,19 42,13 56,12 70,9 84,11 96,6"
      />
    </svg>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <p className="text-sm text-[var(--text-primary)]">{title}</p>
      <p className="text-xs text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

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

  useEffect(() => {
    setAuthedState(isAuthed());
  }, []);

  useEffect(() => {
    if (authed) loadData();
  }, [authed]);

  useEffect(() => {
    if (!authed || activeTab !== 'memory') return;
    loadMemories();
  }, [activeTab, authed]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setAuth();
      setAuthedState(true);
      setAuthError('');
      return;
    }
    setAuthError('Wrong password');
  }

  async function loadData() {
    const [t, a, c, cr, ag, act] = await Promise.all([
      supabase.from('mc_tasks').select('*').eq('user_id', USER_ID).neq('status', 'done').limit(10),
      supabase.from('mc_actions').select('*').eq('user_id', USER_ID).order('sort_order'),
      supabase.from('mc_content').select('*').eq('user_id', USER_ID).neq('status', 'published').limit(10),
      supabase.from('mc_cron_jobs').select('*').eq('user_id', USER_ID),
      supabase.from('mc_agents').select('*').eq('user_id', USER_ID),
      supabase.from('mc_activity').select('*').eq('user_id', USER_ID).order('created_at', { ascending: false }).limit(12),
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
    } catch (error) {
      console.error(error);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    const { data } = await supabase.from('mc_tasks').insert({ user_id: USER_ID, title: newTask }).select().single();
    if (!data) return;
    setTasks([data, ...tasks]);
    setNewTask('');
  }

  async function completeTask(id: string) {
    await supabase.from('mc_tasks').update({ status: 'done' }).eq('id', id);
    setTasks(tasks.filter((task) => task.id !== id));
  }

  const filteredMemories = useMemo(
    () =>
      memories.filter(
        (m) =>
          !memorySearch ||
          m.filename.toLowerCase().includes(memorySearch.toLowerCase()) ||
          m.content.toLowerCase().includes(memorySearch.toLowerCase()),
      ),
    [memorySearch, memories],
  );

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: '◫' },
    { id: 'calendar' as TabType, label: 'Calendar', icon: '◷' },
    { id: 'memory' as TabType, label: 'Memory', icon: '◎' },
    { id: 'team' as TabType, label: 'Team', icon: '◉' },
  ];

  const stats = [
    {
      label: 'Agents Online',
      value: agents.filter((a) => a.status === 'online').length,
      sub: `${agents.length} total agents`,
    },
    {
      label: 'Scheduled Jobs',
      value: cronJobs.filter((j) => j.status === 'active').length,
      sub: `${cronJobs.length} configured`,
    },
    {
      label: 'Tasks Due Today',
      value: tasks.length,
      sub: 'Active queue',
    },
    {
      label: 'Drafts In Pipeline',
      value: content.length,
      sub: 'Awaiting publish',
    },
  ];

  if (authed === null || loading) {
    return (
      <div className="min-h-screen app-shell grid place-items-center text-[var(--text-muted)]">
        Loading Mission Control...
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen app-shell grid place-items-center px-4">
        <div className="surface-card w-full max-w-sm p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">◫</div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Mission Control</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Enter password to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="input-base"
            />
            {authError && <p className="text-sm text-rose-400">{authError}</p>}
            <button type="submit" className="btn-primary w-full">
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell">
      <div className="mx-auto flex w-full max-w-[1320px]">
        <aside className="hidden w-64 shrink-0 border-r border-[var(--border-subtle)]/80 bg-[var(--surface)]/65 p-4 backdrop-blur md:flex md:flex-col">
          <div className="mb-6 rounded-2xl border border-[var(--border-subtle)]/80 bg-[var(--surface-elev)]/70 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent-soft)] text-sm text-[var(--accent)]">◫</div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Mission Control</p>
                <p className="text-xs text-[var(--text-muted)]">Personal Command Center</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item ${activeTab === item.id ? 'nav-item-active' : ''}`}
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6">
            <button
              onClick={() => {
                clearAuth();
                setAuthedState(false);
              }}
              className="nav-item text-[var(--text-muted)]"
            >
              <span className="text-sm">↗</span>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-8">
          <div className="mx-auto w-full max-w-6xl space-y-8">
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <header className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Mission Control</p>
                  <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] md:text-4xl">Daily Operations Dashboard</h1>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </header>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => (
                    <article key={stat.label} className="surface-card p-5">
                      <p className="meta-label">{stat.label}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{stat.value}</p>
                      <div className="mt-4 flex items-center justify-between text-[var(--accent)]">
                        <Sparkline />
                        <span className="text-xs text-[var(--text-muted)]">{stat.sub}</span>
                      </div>
                    </article>
                  ))}
                </section>

                <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <article className="surface-card p-5 xl:col-span-2">
                    <div className="mb-4">
                      <h2 className="section-title">Quick Actions</h2>
                      <p className="section-subtitle">Launch common workflows quickly.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {actions.slice(0, 6).map((action) => (
                        <button key={action.id} className="action-card text-left">
                          <div className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-sm text-[var(--accent)]">
                            {action.icon || '⚡'}
                          </div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{action.name}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{action.description || 'Run a quick operation'}</p>
                        </button>
                      ))}
                      {actions.length === 0 && (
                        <div className="sm:col-span-2 lg:col-span-3">
                          <EmptyState title="No actions configured" detail="Create actions to populate this launcher." />
                        </div>
                      )}
                    </div>
                  </article>

                  <article className="surface-card p-5">
                    <div className="mb-4">
                      <h2 className="section-title">Today&apos;s Focus</h2>
                      <p className="section-subtitle">Upcoming scheduled jobs.</p>
                    </div>
                    {cronJobs.length === 0 ? (
                      <EmptyState title="No jobs scheduled" detail="Your timeline will appear here." />
                    ) : (
                      <div className="space-y-3">
                        {cronJobs.slice(0, 5).map((job) => (
                          <div key={job.id} className="row-item">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{job.name}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {job.next_run
                                  ? new Date(job.next_run).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'Not scheduled'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                </section>

                <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <article className="surface-card p-5 xl:col-span-2">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <h2 className="section-title">Tasks</h2>
                        <p className="section-subtitle">Track active work and add new items.</p>
                      </div>
                      <p className="meta-label">{tasks.length} active</p>
                    </div>

                    <form onSubmit={addTask} className="mb-4 flex gap-2">
                      <input
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder="Add a new task..."
                        className="input-base"
                      />
                      <button type="submit" className="btn-primary shrink-0 px-4">
                        Add
                      </button>
                    </form>

                    {tasks.length === 0 ? (
                      <EmptyState title="All caught up" detail="No active tasks for today." />
                    ) : (
                      <div className="space-y-2">
                        {tasks.map((task) => (
                          <div key={task.id} className="row-item justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <button
                                onClick={() => completeTask(task.id)}
                                className="h-4 w-4 shrink-0 rounded-full border border-[var(--border-subtle)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                                aria-label={`Complete ${task.title}`}
                              />
                              <p className="truncate text-sm text-[var(--text-primary)]">{task.title}</p>
                            </div>
                            {task.assigned_agent && <span className="tag">{task.assigned_agent}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>

                  <article className="surface-card p-5">
                    <div className="mb-4">
                      <h2 className="section-title">Activity Feed</h2>
                      <p className="section-subtitle">Latest agent and operator updates.</p>
                    </div>
                    {activity.length === 0 ? (
                      <EmptyState title="No recent activity" detail="Events will stream in here." />
                    ) : (
                      <div className="space-y-3">
                        {activity.slice(0, 6).map((event) => (
                          <div key={event.id} className="timeline-item">
                            <span className="timeline-dot" />
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm text-[var(--text-primary)]">{event.summary || 'Activity update'}</p>
                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                </section>

                <section className="surface-card p-5">
                  <div className="mb-4">
                    <h2 className="section-title">Content Pipeline</h2>
                    <p className="section-subtitle">Drafts and queued content across channels.</p>
                  </div>
                  {content.length === 0 ? (
                    <EmptyState title="No drafts in pipeline" detail="Create content to start tracking status." />
                  ) : (
                    <div className="space-y-2">
                      {content.map((item) => (
                        <div key={item.id} className="row-item justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-elev)] text-xs text-[var(--text-secondary)]">
                              {item.platform === 'twitter' ? '𝕏' : 'TXT'}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{item.title || item.body.slice(0, 80)}</p>
                              <p className="text-xs text-[var(--text-muted)]">{item.platform || 'Draft'}</p>
                            </div>
                          </div>
                          <span className="tag capitalize">{item.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="space-y-6">
                <header>
                  <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Calendar</h1>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Scheduled jobs and recurring automation windows.</p>
                </header>

                <section className="surface-card p-4">
                  {cronJobs.length === 0 ? (
                    <EmptyState title="No scheduled jobs" detail="Add cron jobs to view timeline details." />
                  ) : (
                    <div className="space-y-2">
                      {cronJobs.map((job) => (
                        <div key={job.id} className="row-item justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={`h-2 w-2 rounded-full ${job.status === 'active' ? 'bg-emerald-400' : 'bg-[var(--text-muted)]'}`} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{job.name}</p>
                              <p className="truncate text-xs text-[var(--text-muted)]">{job.description || 'No description'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="tag font-mono">{job.schedule}</code>
                            <span className="tag capitalize">{job.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'memory' && (
              <div className="space-y-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Memory</h1>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">Knowledge base and daily operational notes.</p>
                  </div>
                  <input
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    placeholder="Search memory"
                    className="input-base w-full md:w-56"
                  />
                </header>

                <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="surface-card max-h-[65vh] overflow-auto p-2">
                    {filteredMemories.length === 0 ? (
                      <EmptyState title="No matching files" detail="Try another search term." />
                    ) : (
                      filteredMemories.map((memory) => (
                        <button
                          key={memory.filename}
                          onClick={() => setSelectedMemory(memory)}
                          className={`mb-1 w-full rounded-xl px-3 py-3 text-left transition ${
                            selectedMemory?.filename === memory.filename
                              ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                              : 'hover:bg-[var(--surface-elev)]'
                          }`}
                        >
                          <p className="text-sm font-medium">{memory.filename}</p>
                          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{memory.preview}</p>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="surface-card col-span-1 max-h-[65vh] overflow-auto p-5 lg:col-span-2">
                    {selectedMemory ? (
                      <>
                        <div className="mb-4 border-b border-[var(--border-subtle)] pb-4">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedMemory.filename}</p>
                          <p className="text-xs text-[var(--text-muted)]">{selectedMemory.lastModified}</p>
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[var(--text-secondary)]">
                          {selectedMemory.content}
                        </pre>
                      </>
                    ) : (
                      <EmptyState title="Select a memory file" detail="Choose an item from the list to inspect content." />
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="space-y-6">
                <header>
                  <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Team</h1>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">AI agent roster, roles, and capabilities.</p>
                </header>

                <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {agents.map((agent) => (
                    <article key={agent.id} className="surface-card p-5">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface-elev)] text-xl">
                            {agent.avatar_emoji || '🤖'}
                          </div>
                          <div>
                            <p className="text-base font-semibold text-[var(--text-primary)]">{agent.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{agent.role}</p>
                          </div>
                        </div>
                        <span className={`tag ${agent.status === 'online' ? 'text-emerald-300' : 'text-[var(--text-muted)]'}`}>
                          {agent.status}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{agent.description || 'No description available.'}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {agent.capabilities?.map((capability) => (
                          <span key={capability} className="tag">
                            {capability}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
