'use client';

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface Thread {
  id: string;
  name: string;
}

interface Task {
  id: string;
  thread_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string | null;
  status: 'pending' | 'in_progress' | 'review' | 'complete' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  deliverable: string | null;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_agent: Agent | null;
  created_agent: Agent | null;
  thread: Thread | null;
}

interface TaskBoardProps {
  threadId?: string;
  agents?: Agent[];
}

const COLUMNS = [
  { key: 'pending', label: 'Pending', color: 'bg-gray-500' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { key: 'review', label: 'Review', color: 'bg-yellow-500' },
  { key: 'complete', label: 'Complete', color: 'bg-green-500' },
] as const;

const PRIORITY_COLORS = {
  low: 'bg-gray-600 text-gray-300',
  medium: 'bg-blue-600 text-blue-100',
  high: 'bg-orange-600 text-orange-100',
  urgent: 'bg-red-600 text-red-100',
};

export default function TaskBoard({ threadId, agents = [] }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    assignedTo: '',
    dueDate: '',
    requiresApproval: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [threadId]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const url = threadId ? `/api/tasks?threadId=${threadId}` : '/api/tasks';
      const res = await fetch(url);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createTask() {
    if (!newTask.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          title: newTask.title,
          description: newTask.description || null,
          priority: newTask.priority,
          assignedTo: newTask.assignedTo || null,
          dueDate: newTask.dueDate || null,
          requiresApproval: newTask.requiresApproval,
        }),
      });
      if (res.ok) {
        setNewTask({
          title: '',
          description: '',
          priority: 'medium',
          assignedTo: '',
          dueDate: '',
          requiresApproval: false,
        });
        setShowNewTask(false);
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setSaving(false);
    }
  }

  async function updateTaskStatus(taskId: string, status: Task['status']) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchTasks();
        if (selectedTask?.id === taskId) {
          const data = await res.json();
          setSelectedTask(data.task);
        }
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  async function approveTask(taskId: string, action: 'approve' | 'reject') {
    try {
      const res = await fetch(`/api/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchTasks();
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Failed to approve/reject task:', error);
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTasks();
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'Overdue', className: 'text-red-400' };
    if (diffDays === 0) return { text: 'Today', className: 'text-yellow-400' };
    if (diffDays === 1) return { text: 'Tomorrow', className: 'text-orange-400' };
    return { text: date.toLocaleDateString(), className: 'text-gray-400' };
  }

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key);
    return acc;
  }, {} as Record<string, Task[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <button
          onClick={() => setShowNewTask(true)}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium"
        >
          + New Task
        </button>
      </div>

      {/* New Task Modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">New Task</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="Task title"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 h-24 resize-none"
                  placeholder="Task description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              {agents.length > 0 && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Assign to</label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresApproval"
                  checked={newTask.requiresApproval}
                  onChange={(e) => setNewTask({ ...newTask, requiresApproval: e.target.checked })}
                  className="rounded bg-gray-800 border-gray-700"
                />
                <label htmlFor="requiresApproval" className="text-sm text-gray-400">
                  Requires human approval
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewTask(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={saving || !newTask.title.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded-lg disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_COLORS[selectedTask.priority]}`}>
                  {selectedTask.priority}
                </span>
                <h3 className="text-xl font-semibold mt-2">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {selectedTask.description && (
              <p className="text-gray-400 mb-4">{selectedTask.description}</p>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <select
                  value={selectedTask.status}
                  onChange={(e) => updateTaskStatus(selectedTask.id, e.target.value as Task['status'])}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                >
                  {COLUMNS.map((col) => (
                    <option key={col.key} value={col.key}>{col.label}</option>
                  ))}
                </select>
              </div>
              {selectedTask.assigned_agent && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Assigned to</span>
                  <span>{selectedTask.assigned_agent.name}</span>
                </div>
              )}
              {selectedTask.due_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Due date</span>
                  <span className={formatDate(selectedTask.due_date)?.className}>
                    {formatDate(selectedTask.due_date)?.text}
                  </span>
                </div>
              )}
              {selectedTask.deliverable && (
                <div>
                  <span className="text-gray-500 block mb-1">Deliverable</span>
                  <p className="bg-gray-800 rounded p-2 text-gray-300">{selectedTask.deliverable}</p>
                </div>
              )}
              {selectedTask.thread && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Thread</span>
                  <span>{selectedTask.thread.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-400">{new Date(selectedTask.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Approval buttons */}
            {selectedTask.requires_approval && selectedTask.status === 'review' && (
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm mb-3">This task requires your approval</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => approveTask(selectedTask.id, 'reject')}
                    className="flex-1 bg-red-600/80 hover:bg-red-600 py-2 rounded-lg text-sm"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approveTask(selectedTask.id, 'approve')}
                    className="flex-1 bg-green-600 hover:bg-green-500 py-2 rounded-lg text-sm"
                  >
                    Approve
                  </button>
                </div>
              </div>
            )}

            {/* Approved info */}
            {selectedTask.approved_at && (
              <div className="mt-4 text-sm text-gray-500">
                Approved on {new Date(selectedTask.approved_at).toLocaleString()}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => deleteTask(selectedTask.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-250px)] overflow-hidden">
        {COLUMNS.map((column) => (
          <div key={column.key} className="bg-gray-900/50 rounded-xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${column.color}`} />
              <span className="font-medium">{column.label}</span>
              <span className="text-gray-500 text-sm">({tasksByStatus[column.key]?.length || 0})</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {tasksByStatus[column.key]?.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="bg-gray-800 hover:bg-gray-750 rounded-lg p-3 cursor-pointer transition-colors border border-gray-700 hover:border-gray-600"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority}
                    </span>
                    {task.requires_approval && task.status === 'review' && (
                      <span className="text-yellow-400 text-xs">⚠️ Approval</span>
                    )}
                  </div>
                  <h4 className="font-medium text-sm mb-2 line-clamp-2">{task.title}</h4>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    {task.assigned_agent && (
                      <span className="truncate">{task.assigned_agent.name}</span>
                    )}
                    {task.due_date && (
                      <span className={formatDate(task.due_date)?.className}>
                        {formatDate(task.due_date)?.text}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {(!tasksByStatus[column.key] || tasksByStatus[column.key].length === 0) && (
                <div className="text-center text-gray-600 text-sm py-8">
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
