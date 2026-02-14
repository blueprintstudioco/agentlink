'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Message {
  id: string;
  role: string;
  content: string | null;
  content_json: unknown;
  metadata: {
    model?: string;
    usage?: {
      input?: number;
      output?: number;
      cost?: { total?: number };
    };
  };
  timestamp: string;
}

interface Session {
  id: string;
  session_key: string;
  kind: string | null;
  label: string | null;
  channel: string | null;
}

export default function SessionPage() {
  const params = useParams();
  const agentId = params.id as string;
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  useEffect(() => {
    // Scroll to bottom on new messages
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchSession() {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      setSession(data.session);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderContent(msg: Message) {
    if (msg.content) {
      return <div className="whitespace-pre-wrap">{msg.content}</div>;
    }

    if (msg.content_json) {
      // Handle complex content (tool calls, etc.)
      const content = msg.content_json as Array<{ type: string; text?: string; thinking?: string; name?: string }>;
      if (Array.isArray(content)) {
        return (
          <div className="space-y-2">
            {content.map((item, i) => {
              if (item.type === 'text') {
                return <div key={i} className="whitespace-pre-wrap">{item.text}</div>;
              }
              if (item.type === 'thinking') {
                return (
                  <details key={i} className="text-sm">
                    <summary className="text-gray-500 cursor-pointer hover:text-gray-300">
                      💭 Thinking...
                    </summary>
                    <div className="mt-2 pl-4 border-l-2 border-gray-700 text-gray-400 whitespace-pre-wrap">
                      {item.thinking}
                    </div>
                  </details>
                );
              }
              if (item.type === 'toolCall') {
                return (
                  <div key={i} className="text-sm bg-gray-800 rounded p-2">
                    <span className="text-yellow-400">🔧 {item.name}</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      }
      return <pre className="text-sm overflow-x-auto">{JSON.stringify(content, null, 2)}</pre>;
    }

    return <span className="text-gray-500">(empty)</span>;
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
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href={`/agent/${agentId}`} className="text-gray-400 hover:text-white">
              ← Back
            </Link>
            <div>
              <span className="font-medium">
                {session?.label || session?.session_key}
              </span>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {session?.kind && <span>{session.kind}</span>}
                {session?.channel && <span>• {session.channel}</span>}
                <span>• {messages.length} messages</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl p-4 ${
                msg.role === 'user'
                  ? 'bg-blue-900/30 border border-blue-800'
                  : msg.role === 'assistant'
                  ? 'bg-gray-900'
                  : 'bg-yellow-900/30 border border-yellow-800'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-medium ${
                  msg.role === 'user' ? 'text-blue-400' :
                  msg.role === 'assistant' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {msg.role === 'user' ? '👤 User' :
                   msg.role === 'assistant' ? '🤖 Assistant' : `📋 ${msg.role}`}
                </span>
                <div className="text-right text-xs text-gray-500">
                  <div>{new Date(msg.timestamp).toLocaleString()}</div>
                  {msg.metadata?.model && (
                    <div className="text-gray-600">{msg.metadata.model}</div>
                  )}
                </div>
              </div>
              <div className="text-gray-200">
                {renderContent(msg)}
              </div>
              {msg.metadata?.usage && (
                <div className="mt-2 text-xs text-gray-600">
                  {msg.metadata.usage.input && <span>In: {msg.metadata.usage.input}</span>}
                  {msg.metadata.usage.output && <span> • Out: {msg.metadata.usage.output}</span>}
                  {msg.metadata.usage.cost?.total && (
                    <span> • ${msg.metadata.usage.cost.total.toFixed(4)}</span>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </main>
    </div>
  );
}
