'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string | null;
  avatar_emoji: string;
  status: 'online' | 'offline' | 'busy';
  capabilities: string[];
}

interface TeamSectionProps {
  userId: string;
}

export default function TeamSection({ userId }: TeamSectionProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadAgents();
  }, [userId]);

  async function loadAgents() {
    const { data, error } = await supabase
      .from('mc_agents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    
    if (error) {
      console.error('Error loading agents:', error);
    } else {
      setAgents(data || []);
    }
    setLoading(false);
  }

  const statusConfig = {
    online: { color: 'bg-green-500', label: 'Online' },
    offline: { color: 'bg-gray-500', label: 'Offline' },
    busy: { color: 'bg-yellow-500', label: 'Busy' },
  };

  const capabilityColors: Record<string, string> = {
    coding: 'bg-blue-900/50 text-blue-300 border-blue-700',
    automation: 'bg-purple-900/50 text-purple-300 border-purple-700',
    research: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
    writing: 'bg-orange-900/50 text-orange-300 border-orange-700',
    summarization: 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
    'web-search': 'bg-pink-900/50 text-pink-300 border-pink-700',
  };

  if (loading) {
    return (
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Team</h2>
        <div className="text-gray-500 text-sm">Loading agents...</div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Team</h2>
        <span className="text-xs text-gray-500">
          {agents.filter(a => a.status === 'online').length}/{agents.length} online
        </span>
      </div>
      
      <div className="space-y-3">
        {agents.length === 0 ? (
          <div className="text-gray-500 text-sm">No agents configured</div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
            >
              {/* Header: Avatar, Name, Role, Status */}
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">{agent.avatar_emoji}</div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{agent.name}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${statusConfig[agent.status].color}`}
                      title={statusConfig[agent.status].label}
                    />
                  </div>
                  <div className="text-sm text-gray-400">{agent.role}</div>
                </div>
              </div>

              {/* Description */}
              {agent.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {agent.description}
                </p>
              )}

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1.5">
                {agent.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className={`text-xs px-2 py-0.5 rounded border ${
                      capabilityColors[cap] || 'bg-gray-800 text-gray-300 border-gray-700'
                    }`}
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
