'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import {
  LayoutDashboard, Inbox, FolderKanban, Calendar, Brain, Users, Building2,
  LogOut, Check, X, Clock, Zap, Send, ChevronRight, Activity, MessageCircle,
  Loader2, Menu, ChevronLeft
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

// ====== PIXEL ART OFFICE COMPONENTS ======

// Bubo the Owl - Main agent sprite (larger, more detailed)
function OwlSprite({ working, inBreakRoom }: { working: boolean; inBreakRoom?: boolean }) {
  return (
    <div className={`relative ${inBreakRoom ? 'animate-idle-bob' : ''}`}>
      <div className="w-12 h-14 relative">
        {/* Ear tufts */}
        <div className="absolute -top-2 left-0 w-4 h-4 bg-amber-800 rounded-tl-full transform -rotate-12" />
        <div className="absolute -top-2 right-0 w-4 h-4 bg-amber-800 rounded-tr-full transform rotate-12" />
        {/* Owl body */}
        <div className="absolute top-1 left-0 right-0 h-11 bg-gradient-to-b from-amber-600 to-amber-800 rounded-full" />
        {/* Belly patch */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-6 h-6 bg-amber-200/40 rounded-full" />
        {/* Eye whites */}
        <div className="absolute top-3 left-1 w-4 h-4 bg-yellow-200 rounded-full animate-blink" />
        <div className="absolute top-3 right-1 w-4 h-4 bg-yellow-200 rounded-full animate-blink" />
        {/* Pupils */}
        <div className={`absolute top-4 left-2 w-2 h-2 bg-black rounded-full transition-all ${working ? '' : 'translate-x-0.5'}`} />
        <div className={`absolute top-4 right-2 w-2 h-2 bg-black rounded-full transition-all ${working ? '' : '-translate-x-0.5'}`} />
        {/* Eye shine */}
        <div className="absolute top-3.5 left-1.5 w-1 h-1 bg-white rounded-full" />
        <div className="absolute top-3.5 right-3.5 w-1 h-1 bg-white rounded-full" />
        {/* Beak */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-orange-500" />
        {/* Hands/wings for typing */}
        {working && (
          <>
            <div className="absolute bottom-2 -left-1 w-3 h-2 bg-amber-700 rounded-full animate-typing" style={{ animationDelay: '0ms' }} />
            <div className="absolute bottom-2 -right-1 w-3 h-2 bg-amber-700 rounded-full animate-typing" style={{ animationDelay: '200ms' }} />
          </>
        )}
      </div>
      {/* Status indicator */}
      <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--surface)] ${working ? 'bg-green-500 animate-status-pulse' : 'bg-gray-500'}`} />
      {/* Thinking bubble when working */}
      {working && (
        <div className="absolute -top-6 -right-4 animate-thinking">
          <div className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-xs">💭</div>
          <div className="absolute -bottom-1 left-1 w-2 h-2 bg-white/90 rounded-full" />
          <div className="absolute -bottom-2 left-0 w-1.5 h-1.5 bg-white/70 rounded-full" />
        </div>
      )}
    </div>
  );
}

// Pip the Bird - Secondary agent sprite
function BirdSprite({ working, inBreakRoom }: { working: boolean; inBreakRoom?: boolean }) {
  return (
    <div className={`relative ${inBreakRoom ? 'animate-idle-bob' : ''}`}>
      <div className="w-9 h-10 relative">
        {/* Bird body */}
        <div className="absolute top-2 inset-x-0 h-8 bg-gradient-to-b from-sky-300 to-sky-500 rounded-full" />
        {/* Head tuft */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-400 rounded-full" />
        {/* Eye */}
        <div className="absolute top-4 right-1 w-3 h-3 bg-white rounded-full animate-blink" />
        <div className="absolute top-4.5 right-1.5 w-1.5 h-1.5 bg-black rounded-full" />
        <div className="absolute top-4 right-1.5 w-1 h-1 bg-white rounded-full" />
        {/* Beak */}
        <div className="absolute top-5 -right-2 w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-orange-400" />
        {/* Wing */}
        <div className={`absolute bottom-1 left-0 w-4 h-4 bg-sky-600 rounded-bl-full rounded-tr-full ${working ? 'animate-typing' : ''}`} />
        {/* Tail */}
        <div className="absolute bottom-0 -left-2 w-4 h-2 bg-sky-500 rounded-l-full transform -rotate-12" />
      </div>
      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[var(--surface)] ${working ? 'bg-green-500 animate-status-pulse' : 'bg-gray-500'}`} />
    </div>
  );
}

// Generic sub-agent sprite (colored circle with face)
function SubAgentSprite({ working, color, emoji }: { working: boolean; color: string; emoji?: string }) {
  const bgColor = {
    purple: 'from-purple-400 to-purple-600',
    pink: 'from-pink-400 to-pink-600',
    green: 'from-emerald-400 to-emerald-600',
    blue: 'from-blue-400 to-blue-600',
    orange: 'from-orange-400 to-orange-600',
  }[color] || 'from-gray-400 to-gray-600';

  return (
    <div className="relative">
      <div className={`w-8 h-8 rounded-full bg-gradient-to-b ${bgColor} relative flex items-center justify-center`}>
        {emoji ? (
          <span className="text-sm">{emoji}</span>
        ) : (
          <>
            {/* Eyes */}
            <div className="absolute top-2 left-1.5 w-1.5 h-1.5 bg-white rounded-full animate-blink" />
            <div className="absolute top-2 right-1.5 w-1.5 h-1.5 bg-white rounded-full animate-blink" />
            {/* Mouth */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-1 bg-white/50 rounded-full" />
          </>
        )}
        {working && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 flex gap-0.5 justify-center">
            <div className="w-1 h-1 bg-white/60 rounded-full animate-typing" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-white/60 rounded-full animate-typing" style={{ animationDelay: '100ms' }} />
            <div className="w-1 h-1 bg-white/60 rounded-full animate-typing" style={{ animationDelay: '200ms' }} />
          </div>
        )}
      </div>
      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface)] ${working ? 'bg-green-500' : 'bg-gray-500'}`} />
    </div>
  );
}

// Main desk with monitor (larger)
function MainDesk({ working }: { working: boolean }) {
  return (
    <div className="relative pixel-shadow">
      {/* Monitor */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2">
        <div className="w-14 h-10 bg-gray-800 rounded-t-lg border-2 border-gray-700">
          <div className={`w-11 h-7 mx-auto mt-1 rounded-sm ${working ? 'animate-glow' : 'bg-gray-900'}`} />
        </div>
        <div className="w-4 h-2 bg-gray-700 mx-auto" />
        <div className="w-8 h-1 bg-gray-700 mx-auto rounded-b" />
      </div>
      {/* Keyboard */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-2 bg-gray-700 rounded-sm" />
      {/* Desk surface */}
      <div className="w-24 h-4 bg-gradient-to-b from-amber-700 to-amber-900 rounded-t" />
      {/* Desk legs */}
      <div className="flex justify-between px-2">
        <div className="w-2 h-6 bg-amber-800" />
        <div className="w-2 h-6 bg-amber-800" />
      </div>
    </div>
  );
}

// Smaller sub-agent desk
function SmallDesk({ working }: { working: boolean }) {
  return (
    <div className="relative">
      {/* Small monitor */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
        <div className="w-8 h-6 bg-gray-800 rounded-t border border-gray-700">
          <div className={`w-6 h-4 mx-auto mt-0.5 rounded-sm ${working ? 'animate-glow' : 'bg-gray-900'}`} />
        </div>
        <div className="w-2 h-1 bg-gray-700 mx-auto" />
      </div>
      {/* Desk surface */}
      <div className="w-14 h-2 bg-gradient-to-b from-amber-700 to-amber-900 rounded-t" />
      {/* Desk legs */}
      <div className="flex justify-between px-1">
        <div className="w-1 h-4 bg-amber-800" />
        <div className="w-1 h-4 bg-amber-800" />
      </div>
    </div>
  );
}

// Break room furniture
function Couch() {
  return (
    <div className="relative pixel-shadow">
      {/* Back rest */}
      <div className="w-28 h-6 bg-gradient-to-b from-gray-600 to-gray-700 rounded-t-lg" />
      {/* Seat cushions */}
      <div className="flex">
        <div className="w-14 h-5 bg-gray-600 rounded-bl-lg border-r border-gray-700" />
        <div className="w-14 h-5 bg-gray-600 rounded-br-lg" />
      </div>
      {/* Arm rests */}
      <div className="absolute top-2 -left-2 w-2 h-9 bg-gray-700 rounded-l" />
      <div className="absolute top-2 -right-2 w-2 h-9 bg-gray-700 rounded-r" />
    </div>
  );
}

function CoffeeTable() {
  return (
    <div className="relative pixel-shadow">
      {/* Table top */}
      <div className="w-20 h-3 bg-gradient-to-b from-amber-800 to-amber-900 rounded" />
      {/* Coffee mugs */}
      <div className="absolute -top-3 left-3">
        <div className="w-3 h-3 bg-gray-100 rounded-b" />
        <div className="absolute -top-1 left-0 w-3 flex justify-center">
          <div className="w-2 h-2 bg-white/40 rounded-full animate-steam" />
        </div>
      </div>
      <div className="absolute -top-3 right-3">
        <div className="w-3 h-3 bg-amber-100 rounded-b" />
        <div className="absolute -top-1 left-0 w-3 flex justify-center">
          <div className="w-2 h-2 bg-white/30 rounded-full animate-steam" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>
      {/* Table legs */}
      <div className="flex justify-between px-3">
        <div className="w-1 h-3 bg-amber-800" />
        <div className="w-1 h-3 bg-amber-800" />
      </div>
    </div>
  );
}

function Plant({ size = 'large' }: { size?: 'large' | 'small' }) {
  const isLarge = size === 'large';
  return (
    <div className={`relative ${isLarge ? 'animate-plant-sway' : ''}`} style={{ transformOrigin: 'bottom center' }}>
      {/* Pot */}
      <div className={`${isLarge ? 'w-8 h-6' : 'w-5 h-4'} bg-gradient-to-b from-orange-700 to-orange-900 rounded-b-lg mx-auto`} />
      {/* Leaves */}
      <div className={`absolute ${isLarge ? '-top-6 left-1/2 -translate-x-1/2' : '-top-4 left-1/2 -translate-x-1/2'}`}>
        <div className={`${isLarge ? 'w-4 h-6' : 'w-2 h-4'} bg-green-600 rounded-full transform -rotate-12 absolute -left-3`} />
        <div className={`${isLarge ? 'w-4 h-7' : 'w-2 h-5'} bg-green-500 rounded-full absolute left-0`} />
        <div className={`${isLarge ? 'w-4 h-6' : 'w-2 h-4'} bg-green-600 rounded-full transform rotate-12 absolute left-3`} />
      </div>
    </div>
  );
}

function CoffeeCup({ hasSteam = true }: { hasSteam?: boolean }) {
  return (
    <div className="relative">
      <div className="w-4 h-5 bg-white rounded-b-lg">
        <div className="absolute top-1 right-0 w-2 h-3 border-2 border-white rounded-r-full translate-x-1" />
      </div>
      {hasSteam && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-0.5">
          <div className="w-1 h-3 bg-white/30 rounded-full animate-steam" />
          <div className="w-1 h-3 bg-white/20 rounded-full animate-steam" style={{ animationDelay: '0.3s' }} />
        </div>
      )}
    </div>
  );
}

// ====== OFFICE VIEW COMPONENT ======
function OfficeView({ agents, activity: initialActivity }: { agents: Agent[]; activity: Activity[] }) {
  const [liveActivity, setLiveActivity] = useState<Activity[]>(initialActivity);
  
  // Poll /api/activity every 5 seconds
  useEffect(() => {
    const pollActivity = async () => {
      try {
        const res = await fetch('/api/activity');
        const data = await res.json();
        if (data.activities) {
          setLiveActivity(data.activities);
        }
      } catch (e) {
        console.error('Activity poll error:', e);
      }
    };
    
    const interval = setInterval(pollActivity, 5000);
    return () => clearInterval(interval);
  }, []);

  // Find main agents
  const bubo = agents.find(a => a.name.toLowerCase() === 'bubo');
  const pip = agents.find(a => a.name.toLowerCase() === 'pip');
  const subAgents = agents.filter(a => 
    a.name.toLowerCase() !== 'bubo' && a.name.toLowerCase() !== 'pip'
  );

  // Determine positions based on status
  const buboWorking = bubo?.status === 'online';
  const pipWorking = pip?.status === 'online';

  // Sub-agent colors for variety
  const subAgentColors = ['purple', 'pink', 'green', 'blue', 'orange'];

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Get agent emoji
  const getAgentEmoji = (agentName: string | null) => {
    if (!agentName) return '🤖';
    const name = agentName.toLowerCase();
    if (name === 'bubo') return '🦉';
    if (name === 'pip') return '🐦';
    const agent = agents.find(a => a.name.toLowerCase() === name);
    return agent?.avatar_emoji || '🤖';
  };

  return (
    <>
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">The Office</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">AI team headquarters — live view</p>
      </header>

      {/* Mobile: Stacked layout, Desktop: Grid */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="lg:col-span-3 surface-card overflow-hidden">
          {/* Office Floor - Horizontal scroll on mobile */}
          <div className="office-floor relative p-4 sm:p-6 min-h-[400px] sm:min-h-[500px] overflow-x-auto">
            {/* Status Legend */}
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex gap-2 sm:gap-4 text-xs bg-black/40 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 z-10">
              <span className="flex items-center gap-1 sm:gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-status-pulse" /> Working
              </span>
              <span className="flex items-center gap-1 sm:gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-500" /> Idle
              </span>
            </div>

            {/* Mobile: Simplified horizontal layout */}
            <div className="flex lg:hidden min-w-[600px] h-full min-h-[350px] gap-4 pt-8">
              {/* Main Agents */}
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">🖥️ Main</p>
                {bubo && (
                  <div className="flex flex-col items-center">
                    {buboWorking && <div className="mb-2"><OwlSprite working={true} /></div>}
                    {!buboWorking && <div className="h-14" />}
                    <MainDesk working={buboWorking} />
                    <p className="mt-2 text-xs font-medium">🦉 {bubo.name}</p>
                  </div>
                )}
                {pip && (
                  <div className="flex flex-col items-center">
                    {pipWorking && <div className="mb-2"><BirdSprite working={true} /></div>}
                    {!pipWorking && <div className="h-10" />}
                    <MainDesk working={pipWorking} />
                    <p className="mt-2 text-xs font-medium">🐦 {pip.name}</p>
                  </div>
                )}
              </div>

              {/* Break Room */}
              <div className="flex-1 flex flex-col items-center justify-center gap-4 border-l border-white/10 px-4">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">☕ Break</p>
                <Couch />
                <div className="flex gap-2">
                  {!buboWorking && bubo && <OwlSprite working={false} inBreakRoom />}
                  {!pipWorking && pip && <BirdSprite working={false} inBreakRoom />}
                </div>
                <CoffeeTable />
              </div>

              {/* Sub-agents */}
              <div className="flex-1 flex flex-col items-center justify-center gap-3 border-l border-white/10 px-4">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">🤖 Sub-Agents</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {subAgents.slice(0, 4).map((agent, i) => (
                    <div key={agent.id} className="flex flex-col items-center">
                      <SubAgentSprite 
                        working={agent.status === 'online'} 
                        color={subAgentColors[i % subAgentColors.length]}
                        emoji={agent.avatar_emoji || undefined}
                      />
                      <p className="text-[10px] mt-1">{agent.avatar_emoji || '🤖'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop: Full layout */}
            <div className="hidden lg:flex h-full min-h-[450px]">
              
              {/* LEFT: Break Room Area */}
              <div className="w-1/4 flex flex-col items-center justify-center gap-6 border-r border-white/5 pr-6">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">☕ Break Room</p>
                
                {/* Couch with idle agents */}
                <div className="relative">
                  <Couch />
                  {/* Place idle agents on couch */}
                  <div className="absolute -top-8 left-4 flex gap-4">
                    {!buboWorking && bubo && (
                      <div className="flex flex-col items-center">
                        <OwlSprite working={false} inBreakRoom />
                        <span className="text-[10px] text-[var(--text-muted)] mt-1">Bubo</span>
                      </div>
                    )}
                    {!pipWorking && pip && (
                      <div className="flex flex-col items-center">
                        <BirdSprite working={false} inBreakRoom />
                        <span className="text-[10px] text-[var(--text-muted)] mt-1">Pip</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Coffee table */}
                <CoffeeTable />

                {/* Plant */}
                <div className="mt-4">
                  <Plant size="large" />
                </div>
              </div>

              {/* CENTER: Main Agent Desks */}
              <div className="w-2/4 flex flex-col items-center justify-center gap-8 px-8">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">🖥️ Main Workspace</p>
                
                {/* Bubo's Desk (Front, larger) */}
                {bubo && (
                  <div className="flex flex-col items-center">
                    {buboWorking && (
                      <div className="mb-4">
                        <OwlSprite working={true} />
                      </div>
                    )}
                    {!buboWorking && <div className="h-16" />}
                    <MainDesk working={buboWorking} />
                    <p className="mt-3 text-sm font-medium flex items-center gap-2">
                      🦉 {bubo.name}
                      <span className={`text-xs ${buboWorking ? 'text-green-400' : 'text-gray-500'}`}>
                        {buboWorking ? '• Working' : '• On break'}
                      </span>
                    </p>
                  </div>
                )}

                {/* Pip's Desk (Behind Bubo) */}
                {pip && (
                  <div className="flex flex-col items-center -mt-2">
                    {pipWorking && (
                      <div className="mb-4">
                        <BirdSprite working={true} />
                      </div>
                    )}
                    {!pipWorking && <div className="h-12" />}
                    <MainDesk working={pipWorking} />
                    <p className="mt-3 text-sm font-medium flex items-center gap-2">
                      🐦 {pip.name}
                      <span className={`text-xs ${pipWorking ? 'text-green-400' : 'text-gray-500'}`}>
                        {pipWorking ? '• Working' : '• On break'}
                      </span>
                    </p>
                  </div>
                )}

                {/* Decorative plants */}
                <div className="flex gap-20 mt-4">
                  <Plant size="small" />
                  <Plant size="small" />
                </div>
              </div>

              {/* RIGHT: Sub-Agent Desks */}
              <div className="w-1/4 flex flex-col items-center justify-center border-l border-white/5 pl-6">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-4">🤖 Sub-Agents</p>
                
                <div className="flex flex-col gap-6">
                  {subAgents.length === 0 ? (
                    // Empty desk placeholders
                    <>
                      {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="flex flex-col items-center opacity-30">
                          <div className="h-8 mb-2" /> {/* Empty space */}
                          <SmallDesk working={false} />
                          <p className="mt-2 text-[10px] text-[var(--text-muted)]">Empty</p>
                        </div>
                      ))}
                    </>
                  ) : (
                    // Actual sub-agents
                    <>
                      {subAgents.slice(0, 5).map((agent, i) => {
                        const isWorking = agent.status === 'online';
                        return (
                          <div key={agent.id} className="flex flex-col items-center">
                            {isWorking ? (
                              <div className="mb-2">
                                <SubAgentSprite 
                                  working={true} 
                                  color={subAgentColors[i % subAgentColors.length]}
                                  emoji={agent.avatar_emoji || undefined}
                                />
                              </div>
                            ) : (
                              <div className="h-8 mb-2" />
                            )}
                            <SmallDesk working={isWorking} />
                            <p className="mt-2 text-[10px] text-center">
                              {agent.avatar_emoji || '🤖'} {agent.name}
                            </p>
                          </div>
                        );
                      })}
                      {/* Fill remaining slots with empty desks */}
                      {Array.from({ length: Math.max(0, 5 - subAgents.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="flex flex-col items-center opacity-30">
                          <div className="h-8 mb-2" />
                          <SmallDesk working={false} />
                          <p className="mt-2 text-[10px] text-[var(--text-muted)]">Empty</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Activity Sidebar */}
        <div className="surface-card p-4 flex flex-col max-h-[400px] lg:max-h-none">
          <h3 className="section-title flex items-center gap-2">
            <Activity size={16} className="text-[var(--accent)]" />
            Live Activity
          </h3>
          <p className="section-subtitle mb-4">Real-time updates</p>
          
          <div className="flex-1 overflow-auto">
            {liveActivity.length === 0 ? (
              <div className="empty-state text-sm">
                <Activity size={24} className="mx-auto mb-2 opacity-50" />
                No recent activity
              </div>
            ) : (
              <div className="space-y-3">
                {liveActivity.slice(0, 10).map((a, i) => (
                  <div 
                    key={a.id} 
                    className="text-xs p-2 rounded-lg bg-[var(--surface-elev)] animate-slide-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base">{getAgentEmoji(a.agent)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--text-primary)]">
                          {a.agent || 'System'}
                        </p>
                        <p className="text-[var(--text-secondary)] line-clamp-2 mt-0.5">
                          {a.summary}
                        </p>
                        <p className="text-[var(--text-muted)] mt-1">
                          {formatRelativeTime(a.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity count */}
          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-muted)] text-center">
              Showing {Math.min(10, liveActivity.length)} of {liveActivity.length} activities
            </p>
          </div>
        </div>
      </div>
    </>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false);
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

  // Primary nav items (shown in bottom bar on mobile)
  const primaryNavItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={20} /> },
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={20} /> },
    { id: 'team', label: 'Team', icon: <Users size={20} /> },
    { id: 'office', label: 'Office', icon: <Building2 size={20} /> },
  ];

  // Secondary nav items (shown in hamburger menu on mobile)
  const secondaryNavItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'approvals', label: 'Approvals', icon: <Inbox size={18} /> },
    { id: 'projects', label: 'Projects', icon: <FolderKanban size={18} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
    { id: 'memory', label: 'Memory', icon: <Brain size={18} /> },
  ];

  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

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
    <div className="min-h-screen flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--surface)]/80 p-4 flex-col">
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
          {allNavItems.map(item => (
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

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--surface)]/95 backdrop-blur-lg border-t border-[var(--border-subtle)] safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {primaryNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`mobile-nav-item ${activeTab === item.id ? 'mobile-nav-item-active' : ''}`}
            >
              {item.icon}
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="mobile-nav-item"
          >
            <Menu size={20} />
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-[var(--surface)] p-4 animate-slide-in-right">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold">More</h2>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-[var(--surface-elev)]"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-2">
              {secondaryNavItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  className={`nav-item w-full ${activeTab === item.id ? 'nav-item-active' : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.id === 'approvals' && approvals.length > 0 && (
                    <span className="ml-auto text-xs bg-[var(--accent)] text-white px-1.5 py-0.5 rounded-full">{approvals.length}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="mt-8 pt-4 border-t border-[var(--border-subtle)]">
              <button onClick={handleLogout} className="nav-item w-full text-[var(--text-muted)]">
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">

          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              <header>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Mission Control</p>
                <h1 className="text-2xl md:text-3xl font-bold mt-1">Daily Operations</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </header>

              {/* Stats: 2 cols on mobile, 4 on desktop */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {stats.map(s => (
                  <div key={s.label} className="surface-card p-3 md:p-4">
                    <p className="meta-label text-[10px] md:text-xs">{s.label}</p>
                    <p className="text-2xl md:text-3xl font-semibold mt-1 md:mt-2">{s.value}</p>
                    <p className="text-[10px] md:text-xs text-[var(--text-muted)] mt-0.5 md:mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Quick Actions + Focus: Stack on mobile */}
              <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2 surface-card p-4 md:p-5">
                  <h2 className="section-title">Quick Actions</h2>
                  <p className="section-subtitle mb-3 md:mb-4">Launch common workflows</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                    {actions.slice(0, 6).map(a => (
                      <button key={a.id} className="action-card text-left touch-target">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] grid place-items-center mb-2">
                          <Zap size={16} className="text-[var(--accent)]" />
                        </div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1 hidden sm:block">{a.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="surface-card p-4 md:p-5">
                  <h2 className="section-title">Today&apos;s Focus</h2>
                  <p className="section-subtitle mb-3 md:mb-4">Upcoming jobs</p>
                  <div className="space-y-3">
                    {cronJobs.slice(0, 4).map(j => (
                      <div key={j.id} className="row-item touch-target">
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

              {/* Tasks + Activity: Stack on mobile */}
              <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2 surface-card p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div>
                      <h2 className="section-title">Tasks</h2>
                      <p className="section-subtitle">Active work items</p>
                    </div>
                    <span className="meta-label">{tasks.length} active</span>
                  </div>
                  <form onSubmit={addTask} className="flex gap-2 mb-3 md:mb-4">
                    <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Add a task..." className="input-base flex-1" />
                    <button type="submit" className="btn-primary px-4 touch-target">Add</button>
                  </form>
                  {tasks.length === 0 ? (
                    <div className="empty-state">All caught up</div>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map(t => (
                        <div key={t.id} className="row-item justify-between touch-target">
                          <div className="flex items-center gap-3 min-w-0">
                            <button onClick={() => completeTask(t.id)} className="w-5 h-5 md:w-4 md:h-4 rounded-full border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] shrink-0" />
                            <p className="text-sm truncate">{t.title}</p>
                          </div>
                          {t.assigned_agent && <span className="tag hidden sm:inline-block">{t.assigned_agent}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="surface-card p-4 md:p-5">
                  <h2 className="section-title">Activity</h2>
                  <p className="section-subtitle mb-3 md:mb-4">Recent updates</p>
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
              <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Chat</h1>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Live conversation with your agents</p>
                </div>
                <div className="flex gap-2">
                  {(['team', 'bubo', 'pip'] as const).map(agent => (
                    <button
                      key={agent}
                      onClick={() => setChatAgent(agent)}
                      className={`px-3 md:px-4 py-2 rounded-xl font-medium text-sm transition-all touch-target ${
                        chatAgent === agent
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--surface-elev)] text-[var(--text-secondary)] hover:bg-[var(--surface-elev)]/80'
                      }`}
                    >
                      {agent === 'team' ? '👥' : agent === 'pip' ? '🐦' : '🦉'}
                      <span className="hidden sm:inline ml-1">{agent === 'team' ? 'Team' : agent === 'pip' ? 'Pip' : 'Bubo'}</span>
                    </button>
                  ))}
                </div>
              </header>

              <div className="surface-card flex flex-col chat-container">
                {/* Messages */}
                <div className="flex-1 overflow-auto p-3 md:p-4 space-y-3">
                  {chatError && (
                    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-3 md:p-4 text-sm">
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
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 md:px-4 py-2 md:py-2.5 ${
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

                {/* Input - fixed at bottom on mobile */}
                <form onSubmit={sendChatMessage} className="p-3 md:p-4 border-t border-[var(--border-subtle)] bg-[var(--surface)]">
                  <div className="flex gap-2 md:gap-3">
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
                      className="btn-primary px-4 md:px-6 flex items-center gap-2 disabled:opacity-50 touch-target"
                    >
                      {chatSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      <span className="hidden sm:inline">Send</span>
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
                <h1 className="text-2xl md:text-3xl font-bold">Approvals</h1>
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
                      <div key={a.id} className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
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
                        <div className="flex gap-2 shrink-0 self-end sm:self-auto">
                          <button onClick={() => handleApproval(a.id, 'approved')} className="p-2 md:p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 touch-target">
                            <Check size={18} />
                          </button>
                          <button onClick={() => handleApproval(a.id, 'rejected')} className="p-2 md:p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 touch-target">
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
                <h1 className="text-2xl md:text-3xl font-bold">Projects</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Track active initiatives and milestones</p>
              </header>

              {/* Stack vertically on mobile, 3 cols on desktop */}
              <div className="flex flex-col md:grid md:grid-cols-3 gap-4">
                {['active', 'paused', 'complete'].map(status => (
                  <div key={status}>
                    <h3 className="meta-label mb-3 capitalize">{status} ({projects.filter(p => p.status === status).length})</h3>
                    <div className="space-y-3">
                      {projects.filter(p => p.status === status).map(p => (
                        <div key={p.id} className="surface-card p-3 md:p-4">
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
                <h1 className="text-2xl md:text-3xl font-bold">Calendar</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Scheduled jobs and automation</p>
              </header>

              <div className="surface-card">
                {cronJobs.length === 0 ? (
                  <div className="empty-state p-8">No scheduled jobs</div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {cronJobs.map(j => (
                      <div key={j.id} className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className={`w-2 h-2 rounded-full ${j.status === 'active' ? 'bg-green-500' : 'bg-gray-500'} shrink-0 hidden sm:block`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${j.status === 'active' ? 'bg-green-500' : 'bg-gray-500'} sm:hidden`} />
                            {j.name}
                          </p>
                          <p className="text-sm text-[var(--text-muted)]">{j.description}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          <code className="tag font-mono text-xs">{j.schedule}</code>
                          <span className="tag capitalize">{j.status}</span>
                        </div>
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
              <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Memory</h1>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Knowledge base and notes</p>
                </div>
                <input value={memorySearch} onChange={e => setMemorySearch(e.target.value)} placeholder="Search..." className="input-base w-full sm:w-48" />
              </header>

              {/* Mobile: Full width file list, slide-over for content */}
              <div className="md:hidden">
                {!selectedMemory ? (
                  <div className="surface-card overflow-hidden">
                    {filteredMemories.map(m => (
                      <button 
                        key={m.filename} 
                        onClick={() => { setSelectedMemory(m); setMemoryPanelOpen(true); }}
                        className="w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--surface-elev)] active:bg-[var(--surface-elev)] touch-target"
                      >
                        <p className="text-sm font-medium">{m.filename}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate mt-1">{m.preview}</p>
                      </button>
                    ))}
                    {filteredMemories.length === 0 && (
                      <div className="p-8 text-center text-[var(--text-muted)]">No files found</div>
                    )}
                  </div>
                ) : (
                  <div className="surface-card">
                    <div className="flex items-center gap-3 p-4 border-b border-[var(--border-subtle)]">
                      <button 
                        onClick={() => setSelectedMemory(null)}
                        className="p-2 rounded-lg hover:bg-[var(--surface-elev)] touch-target"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{selectedMemory.filename}</p>
                        <p className="text-xs text-[var(--text-muted)]">{selectedMemory.lastModified}</p>
                      </div>
                    </div>
                    <div className="p-4 overflow-auto max-h-[60vh]">
                      <pre className="whitespace-pre-wrap text-sm font-mono text-[var(--text-secondary)]">{selectedMemory.content}</pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop: Side by side */}
              <div className="hidden md:grid grid-cols-3 gap-6" style={{ height: 'calc(100vh - 200px)' }}>
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
                <h1 className="text-2xl md:text-3xl font-bold">Team</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Your AI agent roster</p>
              </header>

              {bubo && (
                <div className="surface-card p-4 md:p-6 border-2 border-[var(--accent)]/30">
                  <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <span className="tag bg-[var(--accent)]/20 text-[var(--accent)]">Main Agent</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-[var(--surface-elev)] grid place-items-center text-2xl md:text-3xl shrink-0">
                      {bubo.avatar_emoji || '🦉'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg md:text-xl font-semibold">{bubo.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${bubo.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                          <span className="text-sm text-[var(--text-muted)]">{bubo.status}</span>
                        </div>
                      </div>
                      <p className="text-[var(--text-muted)]">{bubo.role}</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-2">{bubo.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {bubo.capabilities?.slice(0, 5).map(c => <span key={c} className="tag">{c}</span>)}
                        {(bubo.capabilities?.length || 0) > 5 && <span className="tag">+{(bubo.capabilities?.length || 0) - 5}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {subAgents.length > 0 && (
                <div className="relative mt-4">
                  <div className="absolute left-8 top-0 w-0.5 h-6 bg-[var(--border-subtle)] hidden md:block" />
                  <div className="md:pt-6">
                    <p className="meta-label mb-3 flex items-center gap-2">
                      <ChevronRight size={14} />
                      Sub-Agents ({subAgents.length})
                    </p>
                    {/* Stack on mobile, 2 cols on desktop */}
                    <div className="flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-4">
                      {subAgents.map(agent => (
                        <div key={agent.id} className="surface-card p-4 md:p-5">
                          <div className="flex items-start gap-3 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[var(--surface-elev)] grid place-items-center text-xl md:text-2xl shrink-0">
                              {agent.avatar_emoji || '🤖'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold truncate">{agent.name}</h3>
                                <span className={`w-2 h-2 rounded-full shrink-0 ${agent.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                              </div>
                              <p className="text-sm text-[var(--text-muted)]">{agent.role}</p>
                              <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{agent.description}</p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {agent.capabilities?.slice(0, 3).map(c => <span key={c} className="tag text-[10px]">{c}</span>)}
                              </div>
                            </div>
                            <button className="tag flex items-center gap-1 hover:bg-[var(--accent-soft)] touch-target shrink-0">
                              <Send size={12} /> Task
                            </button>
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
            <OfficeView agents={agents} activity={activity} />
          )}

        </div>
      </main>
    </div>
  );
}
