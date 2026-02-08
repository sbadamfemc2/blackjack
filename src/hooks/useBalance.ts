'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface UseBalanceReturn {
  balance: number | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useBalance(userId: string | null): UseBalanceReturn {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    if (!userId) {
      setBalance(null);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('chip_balance')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setBalance(data.chip_balance);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const refresh = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, refresh };
}
