'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Message {
  role: string;
  content: string;
  timestamp?: string;
}

function SessionContent() {
  const searchParams = useSearchParams();
  const gateway = searchParams.get('gateway');
  const sessionKey = searchParams.get('key');

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gateway || !sessionKey) return;

    fetch(`/api/session?gateway=${encodeURIComponent(gateway)}&key=${encodeURIComponent(sessionKey)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setMessages(data.messages || []);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [gateway, sessionKey]);

  if (!gateway || !sessionKey) {
    return <div className="text-red-400">Missing gateway or session key</div>;
  }

  if (loading) {
    return <div className="animate-pulse text-xl">Loading transcript...</div>;
  }

  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  return (
    <>
      <div className="mb-6">
        <Link href="/" className="text-blue-400 hover:underline">← Back to sessions</Link>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <h1 className="text-xl font-semibold">{gateway}</h1>
        <p className="text-gray-400 text-sm mt-1 font-mono">{sessionKey}</p>
      </div>

      <div className="space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-900/30 border border-blue-800'
                : msg.role === 'assistant'
                ? 'bg-gray-800'
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
              {msg.timestamp && (
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              )}
            </div>
            <div className="text-gray-200 whitespace-pre-wrap break-words">
              {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <p className="text-gray-500 text-center py-8">No messages in this session</p>
        )}
      </div>
    </>
  );
}

export default function SessionPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Suspense fallback={<div className="animate-pulse text-xl">Loading...</div>}>
        <SessionContent />
      </Suspense>
    </div>
  );
}
