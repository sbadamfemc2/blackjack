'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let resolved = false;

    // Safety timeout — never stay on loading forever
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    }, 3000);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!resolved) {
        resolved = true;
        setUser(session?.user ?? null);
        setLoading(false);
      }
    }).catch(() => {
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (!resolved) {
          resolved = true;
          setLoading(false);
        }

        // Ensure profile exists on sign-in
        if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          supabase
            .from('profiles')
            .upsert({ id: currentUser.id }, { onConflict: 'id' })
            .then();
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, loading, signOut };
}
