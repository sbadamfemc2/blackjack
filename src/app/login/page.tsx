'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="h-dvh flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-foreground text-center mb-1">
          Sign In
        </h1>
        <p className="text-foreground/40 text-center text-sm mb-8">
          Save your progress across sessions
        </p>

        {sent ? (
          <div className="text-center">
            <div className="text-accent text-lg font-semibold mb-2">
              Check your email
            </div>
            <p className="text-foreground/60 text-sm mb-6">
              We sent a magic link to <span className="text-foreground">{email}</span>.
              Click it to sign in.
            </p>
            <button
              type="button"
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-accent text-sm hover:underline"
            >
              Try a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-foreground/60 text-sm font-semibold mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full h-12 px-4 rounded-lg bg-foreground/10 text-foreground placeholder:text-foreground/30 border border-foreground/10 focus:border-accent focus:outline-none mb-4"
            />

            {error && (
              <p className="text-error text-sm mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-accent text-background font-bold hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-foreground/40 text-sm hover:text-foreground/60 transition-colors">
            Play without signing in
          </Link>
        </div>
      </div>
    </div>
  );
}
