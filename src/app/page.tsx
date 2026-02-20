'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import {
  LayoutDashboard, Inbox, FolderKanban, Calendar, Brain, Users, Building2,
  LogOut, Check, X, Clock, Zap, Send, ChevronRight, Activity, MessageCircle,
  Loader2
} from 'lucide-react';

const USER_ID = '9452a23f-a139-42cd-83e4-732f188a07ff';
type TabType = 'dashboard' | 'approvals' | 'projects' | 'calendar' | 'memory' | 'team' | 'office' | 'chat';

interface Task { id: string; title: string; status: string; assigned_agent: string | null; }
interface QuickActionData { id: string; name: string; description: string | null; icon: string | null; }
interface CronJob { id: string; name: string; schedule: string; next_run: string | null; status: string; description: string | null; }
interface Agent { id: string; name: string; role: string; description: string | null; avatar_emoji: string | null; status: string; capabilities: string[] | null; }
interface MemoryFile { filename: string; content: string; preview: string; lastModified: string; isMainMemory?: boolean; }
interface Activity { id: string; agent: string | null; summary: string | null; created_at: string; }
interface Content { id: string; title: string | null; body: string; platform: string | null; status: string; }
interface Approval { id: string; type: string; content: string; recipient: string | null; status: string; created_at: string; }
interface Project { id: string; name: string; description: string | null; status: string; due_date: string | null; }
interface ChatMessage { id: string; from_agent: string | null; to_agent: string; content: string; status: string; created_at: string; }

// Pixel Art Components for Office
function OwlSprite({ working }: { working: boolean }) {
  return (
    <div className="relative">
      <div className="w-8 h-8 relative">
        {/* Owl body */}
        <div className="absolute inset-0 bg-amber-700 rounded-full" />
        {/* Eyes */}
        <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-300 rounded-full" />
        <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-300 rounded-full" />
        {/* Pupils */}
        <div className="absolute top-1.5 left-1.5 w-1 h-1 bg-black rounded-full" />
        <div className="absolute top-1.5 right-1.5 w-1 h-1 bg-black rounded-full" />
        {/* Beak */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent border-t-orange-400" />
        {/* Ear tufts */}
        <div className="absolute -top-1 left-0 w-2 h-2 bg-amber-800 rounded-tl-full" />
        <div className="absolute -top-1 right-0 w-2 h-2 bg-amber-800 rounded-tr-full" />
      </div>
      {/* Status indicator */}
      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[var(--surface)] ${working ? 'bg-green-500' : 'bg-gray-500'}`} />
    </div>
  );
}

function BirdSprite({ working }: { working: boolean }) {
  return (
    <div className="relative">
      <div className="w-6 h-6 relative">
        {/* Bird body */}
        <div className="absolute inset-0 bg-sky-400 rounded-full" />
        {/* Eye */}
        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full" />
        <div className="absolute top-1.5 right-1 w-0.5 h-0.5 bg-black rounded-full" />
        {/* Beak */}
        <div className="absolute top-2 -right-1 w-0 h-0 border-t-[3px] border-b-[3px] border-l-[4px] border-t-transparent border-b-transparent border-l-orange-400" />
        {/* Wing */}
        <div className="absolute bottom-0 left-0 w-3 h-2 bg-sky-500 rounded-bl-full" />
      </div>
      <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface)] ${working ? 'bg-green-500' : 'bg-gray-500'}`} />
    </div>
  );
}

function Desk() {
  return (
    <div className="relative">
      {/* Desk surface */}
      <div className="w-16 h-3 bg-amber-900 rounded-t" />
      {/* Monitor */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
        <div className="w-8 h-6 bg-gray-800 rounded-t border-2 border-gray-700" />
        <div className="w-6 h-5 bg-blue-900 mx-auto -mt-5 rounded-sm" />
        <div className="w-2 h-1 bg-gray-700 mx-auto" />
        <div className="w-4 h-0.5 bg-gray-700 mx-auto" />
      </div>
      {/* Desk legs */}
      <div className="flex justify-between px-1">
        <div className="w-1 h-4 bg-amber-800" />
        <div className="w-1 h-4 bg-amber-800" />
      </div>
    </div>
  );
}

export default function MissionControl() {
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
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatAgent, setChatAgent] = useState<'team' | 'pip' | 'bubo'>('team');
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const supabase = createSupabaseBrowserClient();

  // Load data on mount (middleware ensures we're authenticated)
  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (activeTab === 'memory') loadMemories();
    if (activeTab === 'approvals') loadApprovals();
    if (activeTab === 'projects') loadProjects();
    if (activeTab === 'chat') loadChatMessages();
  }, [activeTab, chatAgent]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Poll for new messages every 3 seconds (fallback since WebSocket isn't working)
  useEffect(() => {
    if (activeTab !== 'chat') return;
    
    const pollMessages = async () => {
      try {
        const res = await fetch(`/api/chat?agent=${chatAgent}&limit=100`);
        const data = await res.json();
        if (data.messages) {
          setChatMessages(prev => {
            // Only update if there are new messages
            if (data.messages.length !== prev.length) {
              return data.messages;
            }
            // Check if last message is different
            const lastNew = data.messages[data.messages.length - 1];
            const lastOld = prev[prev.length - 1];
            if (lastNew?.id !== lastOld?.id) {
              return data.messages;
            }
            return prev;
          });
        }
      } catch (e) {
        console.error('Poll error:', e);
      }
    };

    // Initial load
    pollMessages();
    
    // Poll every 3 seconds
    const interval = setInterval(pollMessages, 3000);
    
    return () => clearInterval(interval);
  }, [activeTab, chatAgent]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
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
    } catch (e) { console.error(e); }
  }

  async function loadApprovals() {
    const { data } = await supabase.from('mc_approvals').select('*').eq('user_id', USER_ID).eq('status', 'pending').order('created_at', { ascending: false });
    setApprovals(data || []);
  }

  async function loadProjects() {
    const { data } = await supabase.from('mc_projects').select('*').eq('user_id', USER_ID).order('created_at', { ascending: false });
    setProjects(data || []);
  }

  async function loadChatMessages() {
    setChatError('');
    try {
      const res = await fetch(`/api/chat?agent=${chatAgent}&limit=100`);
      const data = await res.json();
      if (data.needsSetup) {
        setChatError('Chat table not set up yet. Run the SQL migration.');
        return;
      }
      if (data.error) {
        setChatError(data.error);
        return;
      }
      setChatMessages(data.messages || []);
    } catch (e) {
      setChatError('Failed to load messages');
    }
  }

  async function sendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || chatSending) return;
    
    setChatSending(true);
    setChatError('');
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: chatInput, to_agent: chatAgent })
      });
      const data = await res.json();
      
      if (data.error) {
        setChatError(data.error);
      } else if (data.message) {
        setChatMessages(prev => [...prev, data.message]);
        setChatInput('');
      }
    } catch (e) {
      setChatError('Failed to send message');
    } finally {
      setChatSending(false);
    }
  }

  async function handleApproval(id: string, status: 'approved' | 'rejected') {
    await supabase.from('mc_approvals').update({ status }).eq('id', id);
    setApprovals(approvals.filter(a => a.id !== id));
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

  const filteredMemories = useMemo(() => memories.filter(m => !memorySearch || m.filename.toLowerCase().includes(memorySearch.toLowerCase()) || m.content.toLowerCase().includes(memorySearch.toLowerCase())), [memorySearch, memories]);

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={18} /> },
    { id: 'approvals', label: 'Approvals', icon: <Inbox size={18} /> },
    { id: 'projects', label: 'Projects', icon: <FolderKanban size={18} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
    { id: 'memory', label: 'Memory', icon: <Brain size={18} /> },
    { id: 'team', label: 'Team', icon: <Users size={18} /> },
    { id: 'office', label: 'Office', icon: <Building2 size={18} /> },
  ];

  const stats = [
    { label: 'Agents Online', value: agents.filter(a => a.status === 'online').length, sub: `${agents.length} total` },
    { label: 'Pending Approvals', value: approvals.length, sub: 'Awaiting review' },
    { label: 'Active Projects', value: projects.filter(p => p.status === 'active').length, sub: `${projects.length} total` },
    { label: 'Tasks Active', value: tasks.length, sub: 'In queue' },
  ];

  const bubo = agents.find(a => a.name.toLowerCase() === 'bubo');
  const subAgents = agents.filter(a => a.name.toLowerCase() !== 'bubo');

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-[var(--text-muted)]">Loading Mission Control...</div>;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--surface)]/80 p-4 flex flex-col">
        <div className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elev)] p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent-soft)]">
              <LayoutDashboard size={18} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Mission Control</p>
              <p className="text-xs text-[var(--text-muted)]">Command Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`nav-item ${activeTab === item.id ? 'nav-item-active' : ''}`}>
              {item.icon}
              <span>{item.label}</span>
              {item.id === 'approvals' && approvals.length > 0 && (
                <span className="ml-auto text-xs bg-[var(--accent)] text-white px-1.5 py-0.5 rounded-full">{approvals.length}</span>
              )}
            </button>
          ))}
        </nav>

        <button onClick={handleLogout} className="nav-item text-[var(--text-muted)] mt-4">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              <header>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Mission Control</p>
                <h1 className="text-3xl font-bold mt-1">Daily Operations</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </header>

              <div className="grid grid-cols-4 gap-4">
                {stats.map(s => (
                  <div key={s.label} className="surface-card p-4">
                    <p className="meta-label">{s.label}</p>
                    <p className="text-3xl font-semibold mt-2">{s.value}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 surface-card p-5">
                  <h2 className="section-title">Quick Actions</h2>
                  <p className="section-subtitle mb-4">Launch common workflows</p>
                  <div className="grid grid-cols-3 gap-3">
                    {actions.slice(0, 6).map(a => (
                      <button key={a.id} className="action-card text-left">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] grid place-items-center mb-2">
                          <Zap size={16} className="text-[var(--accent)]" />
                        </div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{a.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="surface-card p-5">
                  <h2 className="section-title">Today's Focus</h2>
                  <p className="section-subtitle mb-4">Upcoming jobs</p>
                  <div className="space-y-3">
                    {cronJobs.slice(0, 4).map(j => (
                      <div key={j.id} className="row-item">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{j.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{j.next_run ? new Date(j.next_run).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 surface-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="section-title">Tasks</h2>
                      <p className="section-subtitle">Active work items</p>
                    </div>
                    <span className="meta-label">{tasks.length} active</span>
                  </div>
                  <form onSubmit={addTask} className="flex gap-2 mb-4">
                    <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Add a task..." className="input-base flex-1" />
                    <button type="submit" className="btn-primary px-4">Add</button>
                  </form>
                  {tasks.length === 0 ? (
                    <div className="empty-state">All caught up</div>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map(t => (
                        <div key={t.id} className="row-item justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <button onClick={() => completeTask(t.id)} className="w-4 h-4 rounded-full border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]" />
                            <p className="text-sm truncate">{t.title}</p>
                          </div>
                          {t.assigned_agent && <span className="tag">{t.assigned_agent}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="surface-card p-5">
                  <h2 className="section-title">Activity</h2>
                  <p className="section-subtitle mb-4">Recent updates</p>
                  {activity.length === 0 ? (
                    <div className="empty-state text-sm">No recent activity</div>
                  ) : (
                    <div className="space-y-3">
                      {activity.slice(0, 5).map(a => (
                        <div key={a.id} className="timeline-item">
                          <span className="timeline-dot" />
                          <div className="min-w-0">
                            <p className="text-sm line-clamp-2">{a.summary}</p>
                            <p className="text-xs text-[var(--text-muted)]">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* CHAT */}
          {activeTab === 'chat' && (
            <>
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Chat</h1>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Live conversation with your agents</p>
                </div>
                <div className="flex gap-2">
                  {(['team', 'bubo', 'pip'] as const).map(agent => (
                    <button
                      key={agent}
                      onClick={() => setChatAgent(agent)}
                      className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                        chatAgent === agent
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--surface-elev)] text-[var(--text-secondary)] hover:bg-[var(--surface-elev)]/80'
                      }`}
                    >
                      {agent === 'team' ? '👥 Team' : agent === 'pip' ? '🐦 Pip' : '🦉 Bubo'}
                    </button>
                  ))}
                </div>
              </header>

              <div className="surface-card flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
                {/* Messages */}
                <div className="flex-1 overflow-auto p-4 space-y-3">
                  {chatError && (
                    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-4 text-sm">
                      {chatError}
                    </div>
                  )}
                  {chatMessages.length === 0 && !chatError && (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                      <div className="text-center">
                        <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm mt-1">Start a conversation with {chatAgent === 'team' ? 'the team' : chatAgent === 'pip' ? 'Pip' : 'Bubo'}</p>
                      </div>
                    </div>
                  )}
                  {chatMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.from_agent ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          msg.from_agent
                            ? 'bg-[var(--surface-elev)] text-[var(--text-primary)]'
                            : 'bg-[var(--accent)] text-white'
                        }`}
                      >
                        {msg.from_agent && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {msg.from_agent === 'pip' ? '🐦 Pip' : '🦉 Bubo'}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.from_agent ? 'text-[var(--text-muted)]' : 'text-white/60'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {!msg.from_agent && msg.status === 'pending' && ' • Pending'}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendChatMessage} className="p-4 border-t border-[var(--border-subtle)]">
                  <div className="flex gap-3">
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder={`Message ${chatAgent === 'team' ? 'the team' : chatAgent === 'pip' ? 'Pip' : 'Bubo'}...`}
                      className="input-base flex-1"
                      disabled={chatSending}
                    />
                    <button
                      type="submit"
                      disabled={chatSending || !chatInput.trim()}
                      className="btn-primary px-6 flex items-center gap-2 disabled:opacity-50"
                    >
                      {chatSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* APPROVALS */}
          {activeTab === 'approvals' && (
            <>
              <header>
                <h1 className="text-3xl font-bold">Approvals</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Items awaiting your review before sending</p>
              </header>

              <div className="surface-card">
                {approvals.length === 0 ? (
                  <div className="p-8 text-center">
                    <Inbox size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                    <p className="text-[var(--text-primary)]">All clear!</p>
                    <p className="text-sm text-[var(--text-muted)]">No items pending approval</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {approvals.map(a => (
                      <div key={a.id} className="p-4 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[var(--surface-elev)] grid place-items-center shrink-0">
                          {a.type === 'email' ? '📧' : a.type === 'tweet' ? '𝕏' : '📄'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="tag capitalize">{a.type}</span>
                            {a.recipient && <span className="text-xs text-[var(--text-muted)]">→ {a.recipient}</span>}
                          </div>
                          <p className="text-sm">{a.content}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(a.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleApproval(a.id, 'approved')} className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30">
                            <Check size={18} />
                          </button>
                          <button onClick={() => handleApproval(a.id, 'rejected')} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* PROJECTS */}
          {activeTab === 'projects' && (
            <>
              <header>
                <h1 className="text-3xl font-bold">Projects</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Track active initiatives and milestones</p>
              </header>

              <div className="grid grid-cols-3 gap-4">
                {['active', 'paused', 'complete'].map(status => (
                  <div key={status}>
                    <h3 className="meta-label mb-3 capitalize">{status} ({projects.filter(p => p.status === status).length})</h3>
                    <div className="space-y-3">
                      {projects.filter(p => p.status === status).map(p => (
                        <div key={p.id} className="surface-card p-4">
                          <h4 className="font-medium">{p.name}</h4>
                          <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{p.description}</p>
                          {p.due_date && (
                            <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1">
                              <Calendar size={12} />
                              Due {new Date(p.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                      {projects.filter(p => p.status === status).length === 0 && (
                        <div className="empty-state text-sm">No {status} projects</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* CALENDAR */}
          {activeTab === 'calendar' && (
            <>
              <header>
                <h1 className="text-3xl font-bold">Calendar</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Scheduled jobs and automation</p>
              </header>

              <div className="surface-card">
                {cronJobs.length === 0 ? (
                  <div className="empty-state p-8">No scheduled jobs</div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {cronJobs.map(j => (
                      <div key={j.id} className="p-4 flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${j.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{j.name}</p>
                          <p className="text-sm text-[var(--text-muted)]">{j.description}</p>
                        </div>
                        <code className="tag font-mono">{j.schedule}</code>
                        <span className="tag capitalize">{j.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* MEMORY */}
          {activeTab === 'memory' && (
            <>
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Memory</h1>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Knowledge base and notes</p>
                </div>
                <input value={memorySearch} onChange={e => setMemorySearch(e.target.value)} placeholder="Search..." className="input-base w-48" />
              </header>

              <div className="grid grid-cols-3 gap-6" style={{ height: 'calc(100vh - 200px)' }}>
                <div className="surface-card overflow-auto">
                  {filteredMemories.map(m => (
                    <button key={m.filename} onClick={() => setSelectedMemory(m)}
                      className={`w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--surface-elev)] ${selectedMemory?.filename === m.filename ? 'bg-[var(--accent-soft)]' : ''}`}>
                      <p className="text-sm font-medium">{m.filename}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-1">{m.preview}</p>
                    </button>
                  ))}
                </div>
                <div className="col-span-2 surface-card p-5 overflow-auto">
                  {selectedMemory ? (
                    <>
                      <div className="mb-4 pb-4 border-b border-[var(--border-subtle)]">
                        <p className="font-semibold">{selectedMemory.filename}</p>
                        <p className="text-xs text-[var(--text-muted)]">{selectedMemory.lastModified}</p>
                      </div>
                      <pre className="whitespace-pre-wrap text-sm font-mono text-[var(--text-secondary)]">{selectedMemory.content}</pre>
                    </>
                  ) : (
                    <div className="h-full grid place-items-center text-[var(--text-muted)]">Select a file</div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TEAM */}
          {activeTab === 'team' && (
            <>
              <header>
                <h1 className="text-3xl font-bold">Team</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Your AI agent roster</p>
              </header>

              {bubo && (
                <div className="surface-card p-6 border-2 border-[var(--accent)]/30">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="tag bg-[var(--accent)]/20 text-[var(--accent)]">Main Agent</span>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-[var(--surface-elev)] grid place-items-center text-3xl">
                      {bubo.avatar_emoji || '🦉'}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">{bubo.name}</h3>
                      <p className="text-[var(--text-muted)]">{bubo.role}</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-2">{bubo.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {bubo.capabilities?.map(c => <span key={c} className="tag">{c}</span>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${bubo.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <span className="text-sm text-[var(--text-muted)]">{bubo.status}</span>
                    </div>
                  </div>
                </div>
              )}

              {subAgents.length > 0 && (
                <div className="relative mt-4">
                  <div className="absolute left-8 top-0 w-0.5 h-6 bg-[var(--border-subtle)]" />
                  <div className="pt-6">
                    <p className="meta-label mb-3 flex items-center gap-2">
                      <ChevronRight size={14} />
                      Sub-Agents ({subAgents.length})
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {subAgents.map(agent => (
                        <div key={agent.id} className="surface-card p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[var(--surface-elev)] grid place-items-center text-2xl">
                              {agent.avatar_emoji || '🤖'}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">{agent.name}</h3>
                              <p className="text-sm text-[var(--text-muted)]">{agent.role}</p>
                              <p className="text-sm text-[var(--text-secondary)] mt-1">{agent.description}</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {agent.capabilities?.map(c => <span key={c} className="tag text-xs">{c}</span>)}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`w-2 h-2 rounded-full ${agent.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                              <button className="tag flex items-center gap-1 hover:bg-[var(--accent-soft)]">
                                <Send size={12} /> Task
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* OFFICE */}
          {activeTab === 'office' && (
            <>
              <header>
                <h1 className="text-3xl font-bold">The Office</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">AI team headquarters — live view</p>
              </header>

              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-3 surface-card overflow-hidden">
                  {/* Office Floor */}
                  <div className="relative p-8" style={{ background: 'repeating-conic-gradient(#1a1a2e 0% 25%, #12121a 0% 50%) 50% / 40px 40px' }}>
                    {/* Status Legend */}
                    <div className="absolute top-4 right-4 flex gap-4 text-xs">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Working</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500" /> Idle</span>
                    </div>

                    {/* Office Layout */}
                    <div className="min-h-[400px] flex flex-col items-center justify-center gap-12">
                      {/* Bubo's desk (main, center) */}
                      {bubo && (
                        <div className="flex flex-col items-center">
                          <div className="mb-2">
                            <OwlSprite working={bubo.status === 'online'} />
                          </div>
                          <Desk />
                          <p className="mt-2 text-sm font-medium">{bubo.name}</p>
                        </div>
                      )}

                      {/* Sub-agent desks */}
                      <div className="flex gap-16">
                        {subAgents.map(agent => (
                          <div key={agent.id} className="flex flex-col items-center">
                            <div className="mb-2">
                              <BirdSprite working={agent.status === 'online'} />
                            </div>
                            <Desk />
                            <p className="mt-2 text-xs">{agent.name}</p>
                          </div>
                        ))}
                      </div>

                      {/* Decorative elements */}
                      <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full bg-green-800/50" /> {/* Plant */}
                      <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-green-800/50" /> {/* Plant */}
                    </div>
                  </div>
                </div>

                {/* Live Activity Sidebar */}
                <div className="surface-card p-4">
                  <h3 className="section-title flex items-center gap-2">
                    <Activity size={16} className="text-[var(--accent)]" />
                    Live Activity
                  </h3>
                  <p className="section-subtitle mb-4">Last hour</p>
                  {activity.length === 0 ? (
                    <div className="empty-state text-sm">No recent activity</div>
                  ) : (
                    <div className="space-y-3">
                      {activity.slice(0, 8).map(a => (
                        <div key={a.id} className="text-xs">
                          <p className="text-[var(--text-secondary)] line-clamp-2">{a.summary}</p>
                          <p className="text-[var(--text-muted)]">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
