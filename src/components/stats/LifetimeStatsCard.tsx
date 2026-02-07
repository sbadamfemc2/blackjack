'use client';

import { LifetimeStats } from '@/engine/types';
import { StatItem } from './StatItem';

interface LifetimeStatsCardProps {
  stats: LifetimeStats | null;
}

export function LifetimeStatsCard({ stats }: LifetimeStatsCardProps) {
  if (!stats) {
    return (
      <div className="bg-foreground/5 rounded-2xl p-6 text-center">
        <p className="text-foreground/40 text-sm">No stats yet. Play some hands!</p>
      </div>
    );
  }

  const netColor = stats.netWinnings > 0 ? 'text-success' : stats.netWinnings < 0 ? 'text-error' : 'text-foreground/60';
  const netPrefix = stats.netWinnings > 0 ? '+' : '';

  const streakLabel = stats.currentStreak.type === 'none'
    ? '--'
    : `${stats.currentStreak.type === 'win' ? 'W' : 'L'}${stats.currentStreak.count}`;

  return (
    <div className="bg-foreground/5 rounded-2xl p-4 mb-4">
      <h2 className="text-foreground/40 text-xs uppercase tracking-wider font-semibold mb-3">
        Lifetime Stats
      </h2>

      {/* Net winnings */}
      <div className="text-center mb-4">
        <span className={`text-3xl font-bold ${netColor}`}>
          {netPrefix}${Math.abs(stats.netWinnings).toLocaleString()}
        </span>
        <p className="text-foreground/40 text-xs mt-1">Net Winnings</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatItem label="Total Hands" value={stats.totalHands} />
        <StatItem
          label="Win Rate"
          value={`${(stats.winRate * 100).toFixed(1)}%`}
        />
        <StatItem label="Sessions" value={stats.totalSessions} />
      </div>

      {/* Records */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatItem
          label="Best Win"
          value={stats.biggestWin > 0 ? `+$${stats.biggestWin.toLocaleString()}` : '--'}
          valueColor={stats.biggestWin > 0 ? 'success' : 'default'}
        />
        <StatItem
          label="Worst Loss"
          value={stats.biggestLoss < 0 ? `-$${Math.abs(stats.biggestLoss).toLocaleString()}` : '--'}
          valueColor={stats.biggestLoss < 0 ? 'error' : 'default'}
        />
        <StatItem
          label="BJ Freq"
          value={`${(stats.blackjackFrequency * 100).toFixed(1)}%`}
          valueColor="accent"
        />
      </div>

      {/* Streaks */}
      <div className="grid grid-cols-3 gap-2">
        <StatItem label="Current" value={streakLabel} />
        <StatItem
          label="Best Win"
          value={stats.bestWinStreak > 0 ? `W${stats.bestWinStreak}` : '--'}
          valueColor="success"
        />
        <StatItem
          label="Best Lose"
          value={stats.bestLoseStreak > 0 ? `L${stats.bestLoseStreak}` : '--'}
          valueColor="error"
        />
      </div>
    </div>
  );
}
