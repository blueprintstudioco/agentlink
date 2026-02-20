'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, [supabase.auth]);

  // If logged in, redirect to dashboard
  useEffect(() => {
    if (user && !loading) {
      window.location.href = '/dashboard';
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">🎛️</h1>
        <h2 className="text-4xl font-bold mb-4">Mission Control</h2>
        <p className="text-gray-400 mb-8">Your personal AI command center</p>
        
        {!loading && !user && (
          <Link
            href="/auth"
            className="bg-orange-600 hover:bg-orange-500 px-6 py-3 rounded-lg font-medium text-lg inline-block"
          >
            Sign In →
          </Link>
        )}
        
        {loading && (
          <div className="text-gray-500">Loading...</div>
        )}
      </div>
    </div>
  );
}
