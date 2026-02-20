'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  next_run: string | null;
  last_run: string | null;
  status: 'active' | 'paused' | 'error';
  description: string | null;
  category: string | null;
}

const USER_ID = '9452a23f-a139-42cd-83e4-732f188a07ff';

const categoryIcons: Record<string, string> = {
  social: '📱',
  email: '📧',
  reports: '📊',
  system: '💾',
  health: '❤️',
  calendar: '📅',
  default: '⏰',
};

const categoryColors: Record<string, string> = {
  social: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  email: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  reports: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
  system: 'bg-gray-500/20 border-gray-500/40 text-gray-300',
  health: 'bg-red-500/20 border-red-500/40 text-red-300',
  calendar: 'bg-green-500/20 border-green-500/40 text-green-300',
  default: 'bg-gray-500/20 border-gray-500/40 text-gray-300',
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  
  if (diffMs < 0) {
    // Past
    if (diffMins > -60) return `${Math.abs(diffMins)}m ago`;
    if (diffHours > -24) return `${Math.abs(diffHours)}h ago`;
    return `${Math.abs(diffDays)}d ago`;
  } else {
    // Future
    if (diffMins < 60) return `in ${diffMins}m`;
    if (diffHours < 24) return `in ${diffHours}h`;
    return `in ${diffDays}d`;
  }
}

function parseCronSchedule(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  
  const [min, hour, day, month, dow] = parts;
  
  // Common patterns
  if (min === '0' && hour !== '*' && day === '*' && month === '*') {
    if (dow === '*') return `Daily at ${hour}:00`;
    if (dow === '1-5') return `Weekdays at ${hour}:00`;
    if (dow === '5') return `Fridays at ${hour}:00`;
    if (dow === '0') return `Sundays at ${hour}:00`;
  }
  
  if (min !== '*' && hour.includes(',')) {
    return `${min} past ${hour.replace(/,/g, ', ')}`;
  }
  
  if (hour.includes(',')) {
    const hours = hour.split(',').map(h => `${h}:${min.padStart(2, '0')}`).join(', ');
    return `Daily at ${hours}`;
  }
  
  return cron;
}

export default function CronVisualizer() {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'timeline' | 'list'>('timeline');
  
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadCronJobs();
  }, []);

  async function loadCronJobs() {
    const { data } = await supabase
      .from('mc_cron_jobs')
      .select('*')
      .eq('user_id', USER_ID)
      .order('next_run', { ascending: true, nullsFirst: false });
    
    setCronJobs(data || []);
    setLoading(false);
  }

  async function toggleStatus(job: CronJob) {
    const newStatus = job.status === 'active' ? 'paused' : 'active';
    await supabase
      .from('mc_cron_jobs')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', job.id);
    
    setCronJobs(cronJobs.map(j => j.id === job.id ? { ...j, status: newStatus } : j));
  }

  // Group jobs by upcoming time periods
  const now = new Date();
  const next2Hours = cronJobs.filter(j => {
    if (!j.next_run || j.status !== 'active') return false;
    const diff = new Date(j.next_run).getTime() - now.getTime();
    return diff > 0 && diff <= 2 * 60 * 60 * 1000;
  });
  
  const next24Hours = cronJobs.filter(j => {
    if (!j.next_run || j.status !== 'active') return false;
    const diff = new Date(j.next_run).getTime() - now.getTime();
    return diff > 2 * 60 * 60 * 1000 && diff <= 24 * 60 * 60 * 1000;
  });
  
  const later = cronJobs.filter(j => {
    if (!j.next_run || j.status !== 'active') return false;
    const diff = new Date(j.next_run).getTime() - now.getTime();
    return diff > 24 * 60 * 60 * 1000;
  });
  
  const pausedJobs = cronJobs.filter(j => j.status === 'paused');

  if (loading) {
    return (
      <div className="text-gray-500 text-center py-8">Loading scheduled tasks...</div>
    );
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Scheduled Tasks</h2>
          <span className="text-xs text-gray-500">
            {cronJobs.filter(j => j.status === 'active').length} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('timeline')}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              view === 'timeline' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setView('list')}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              view === 'list' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {view === 'timeline' ? (
        <div className="space-y-6">
          {/* Next 2 hours */}
          {next2Hours.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400 font-medium uppercase">Next 2 Hours</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {next2Hours.map(job => (
                  <JobCard key={job.id} job={job} onToggle={toggleStatus} />
                ))}
              </div>
            </div>
          )}

          {/* Next 24 hours */}
          {next24Hours.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-amber-400 font-medium uppercase">Today</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {next24Hours.map(job => (
                  <JobCard key={job.id} job={job} onToggle={toggleStatus} />
                ))}
              </div>
            </div>
          )}

          {/* Later */}
          {later.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-xs text-gray-400 font-medium uppercase">Upcoming</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {later.map(job => (
                  <JobCard key={job.id} job={job} onToggle={toggleStatus} />
                ))}
              </div>
            </div>
          )}

          {/* Paused */}
          {pausedJobs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-gray-700" />
                <span className="text-xs text-gray-500 font-medium uppercase">Paused</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pausedJobs.map(job => (
                  <JobCard key={job.id} job={job} onToggle={toggleStatus} />
                ))}
              </div>
            </div>
          )}

          {cronJobs.length === 0 && (
            <div className="text-gray-500 text-center py-8">No scheduled tasks</div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-medium uppercase px-4 py-3">Task</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase px-4 py-3">Schedule</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase px-4 py-3">Next Run</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase px-4 py-3">Last Run</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {cronJobs.map(job => (
                <tr key={job.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{categoryIcons[job.category || 'default'] || categoryIcons.default}</span>
                      <span className="font-medium">{job.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{parseCronSchedule(job.schedule)}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{formatRelativeTime(job.next_run)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatRelativeTime(job.last_run)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(job)}
                      className={`text-xs px-2 py-1 rounded ${
                        job.status === 'active' 
                          ? 'bg-green-600/30 text-green-400' 
                          : job.status === 'paused'
                          ? 'bg-gray-600/30 text-gray-400'
                          : 'bg-red-600/30 text-red-400'
                      }`}
                    >
                      {job.status}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function JobCard({ job, onToggle }: { job: CronJob; onToggle: (job: CronJob) => void }) {
  const icon = categoryIcons[job.category || 'default'] || categoryIcons.default;
  const colorClass = categoryColors[job.category || 'default'] || categoryColors.default;
  const isPaused = job.status === 'paused';
  
  return (
    <div className={`bg-gray-900 border rounded-xl p-4 transition-all hover:bg-gray-800/50 ${
      isPaused ? 'border-gray-800 opacity-60' : 'border-gray-800'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-medium text-sm">{job.name}</span>
        </div>
        <button
          onClick={() => onToggle(job)}
          className={`w-8 h-5 rounded-full relative transition-colors ${
            job.status === 'active' ? 'bg-green-600' : 'bg-gray-700'
          }`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
            job.status === 'active' ? 'left-3.5' : 'left-0.5'
          }`} />
        </button>
      </div>
      
      {job.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{job.description}</p>
      )}
      
      <div className="flex items-center justify-between text-xs">
        <span className={`px-2 py-0.5 rounded border ${colorClass}`}>
          {parseCronSchedule(job.schedule)}
        </span>
        <span className={isPaused ? 'text-gray-600' : 'text-gray-400'}>
          {isPaused ? 'paused' : formatRelativeTime(job.next_run)}
        </span>
      </div>
    </div>
  );
}
