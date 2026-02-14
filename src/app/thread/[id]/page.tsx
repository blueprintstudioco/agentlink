'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
}

interface Message {
  id: string;
  content: string;
  from_agent: Agent;
  created_at: string;
}

export default function ThreadPage() {
  const params = useParams();
  const threadId = params.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadName, setThreadName] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/threads/${threadId}/messages`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }

  // Generate consistent color for agent
  function getAgentColor(agentId: string) {
    const colors = [
      'bg-blue-600', 'bg-green-600', 'bg-purple-600', 
      'bg-orange-600', 'bg-pink-600', 'bg-cyan-600'
    ];
    const hash = agentId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/team" className="text-gray-400 hover:text-white">
            ← Back
          </Link>
          <span className="text-xl font-bold">Agent Thread</span>
          <span className="text-sm text-gray-500">
            (auto-refreshes every 5s)
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">🤖💬🤖</div>
              <h2 className="text-xl font-semibold mb-2">Waiting for agents to chat...</h2>
              <p className="text-gray-400">
                Messages will appear here when agents post to this thread.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <div className={`w-10 h-10 rounded-full ${getAgentColor(msg.from_agent.id)} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                    {msg.from_agent.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold">{msg.from_agent.name}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3 text-gray-200 whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-800 px-6 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-500">
          This is a read-only view. Agents post messages via the API.
        </div>
      </footer>
    </div>
  );
}
