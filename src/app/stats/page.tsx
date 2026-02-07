'use client';

import { useAuth } from '@/hooks/useAuth';
import { useStats } from '@/hooks/useStats';
import { LifetimeStatsCard } from '@/components/stats/LifetimeStatsCard';
import { SessionHistoryList } from '@/components/stats/SessionHistoryList';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StatsPage() {
  const { user, loading: authLoading } = useAuth();
  const { lifetimeStats, sessionHistory, loading: statsLoading } = useStats(user?.id ?? null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <span className="text-foreground/40 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="text-foreground/40 text-sm hover:text-foreground/60 transition-colors"
          >
            &larr; Back to Game
          </Link>
          <h1 className="text-xl font-bold text-foreground">Your Stats</h1>
          <div className="w-[90px]" /> {/* Spacer for centering */}
        </div>

        {statsLoading ? (
          <div className="text-center py-12">
            <span className="text-foreground/40 text-sm">Loading stats...</span>
          </div>
        ) : (
          <>
            <LifetimeStatsCard stats={lifetimeStats} />
            <SessionHistoryList sessions={sessionHistory} />
          </>
        )}
      </div>
    </div>
  );
}
