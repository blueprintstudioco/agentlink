'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Session {
  sessionKey: string;
  kind: string;
  lastActivity: string;
  messageCount?: number;
  lastMessages?: Array<{ role: string; content: string }>;
  agent: string;
}

interface Gateway {
  name: string;
  sessions: Session[];
  error?: string;
}

export default function Home() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sessions')
      .then(res => res.json())
      .then(data => {
        setGateways(data.gateways || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">🦉 OpenClaw Session Viewer</h1>
      
      <div className="grid gap-8">
        {gateways.map((gateway) => (
          <div key={gateway.name} className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${gateway.error ? 'bg-red-500' : 'bg-green-500'}`} />
              {gateway.name}
            </h2>
            
            {gateway.error ? (
              <p className="text-red-400">{gateway.error}</p>
            ) : (
              <div className="space-y-3">
                {gateway.sessions.length === 0 ? (
                  <p className="text-gray-500">No active sessions</p>
                ) : (
                  gateway.sessions.map((session) => (
                    <Link
                      key={session.sessionKey}
                      href={`/session?gateway=${encodeURIComponent(gateway.name)}&key=${encodeURIComponent(session.sessionKey)}`}
                      className="block bg-gray-800 hover:bg-gray-700 rounded-lg p-4 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-blue-400">{session.sessionKey}</div>
                          <div className="text-sm text-gray-400 mt-1">
                            {session.kind} • {session.messageCount || 0} messages
                          </div>
                          {session.lastMessages?.[0] && (
                            <div className="text-sm text-gray-500 mt-2 truncate max-w-xl">
                              Last: {session.lastMessages[0].content.slice(0, 100)}...
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(session.lastActivity).toLocaleString()}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
