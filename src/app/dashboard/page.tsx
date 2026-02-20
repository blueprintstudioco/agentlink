'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    // Get user's MC id
    const { data: mcUser } = await supabase
      .from('mc_users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!mcUser) {
      // Create MC user if doesn't exist
      const { data: newUser } = await supabase
        .from('mc_users')
        .insert({ email: user.email, name: user.email?.split('@')[0] })
        .select('id')
        .single();
      if (newUser) loadDashboardData(newUser.id);
    } else {
      loadDashboardData(mcUser.id);
    }
  }

  async function loadDashboardData(userId: string) {
    const [tasksRes, actionsRes, contentRes, activityRes] = await Promise.all([
      supabase.from('mc_tasks').select('*').eq('user_id', userId).neq('status', 'done').order('created_at', { ascending: false }).limit(10),
      supabase.from('mc_actions').select('*').eq('user_id', userId).order('sort_order'),
      supabase.from('mc_content').select('*').eq('user_id', userId).neq('status', 'published').order('created_at', { ascending: false }).limit(5),
      supabase.from('mc_activity').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    ]);

    setTasks(tasksRes.data || []);
    setActions(actionsRes.data || []);
    setContent(contentRes.data || []);
    setActivity(activityRes.data || []);
    setLoading(false);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: mcUser } = await supabase
      .from('mc_users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!mcUser) return;

    const { data: task } = await supabase
      .from('mc_tasks')
      .insert({ user_id: mcUser.id, title: newTask })
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

  const priorityColors = {
    low: 'text-gray-400',
    medium: 'text-blue-400',
    high: 'text-orange-400',
    urgent: 'text-red-400',
  };

  const statusColors = {
    todo: 'bg-gray-700',
    in_progress: 'bg-blue-600',
    blocked: 'bg-red-600',
    done: 'bg-green-600',
  };

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
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            <button 
              onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
              className="text-gray-400 hover:text-white text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
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
            
            {/* Add Task */}
            <form onSubmit={addTask} className="mb-4">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a task..."
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </form>

            {/* Task List */}
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="text-gray-500 text-center py-8">No active tasks. Add one above!</div>
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
            {/* Content Pipeline */}
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

            {/* Activity */}
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
      </main>
    </div>
  );
}
