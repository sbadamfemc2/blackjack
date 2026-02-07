'use client';

import { SessionSummary } from '@/engine/types';

interface SessionHistoryListProps {
  sessions: SessionSummary[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SessionHistoryList({ sessions }: SessionHistoryListProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-foreground/40 text-sm">No completed sessions yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-foreground/40 text-xs uppercase tracking-wider font-semibold mb-3">
        Session History
      </h2>
      <div className="space-y-2">
        {sessions.map((session) => {
          const net = session.netWinLoss;
          const netColor = net > 0 ? 'text-success' : net < 0 ? 'text-error' : 'text-foreground/60';
          const netPrefix = net > 0 ? '+' : '';
          const borderColor = net > 0 ? 'border-l-success' : net < 0 ? 'border-l-error' : 'border-l-foreground/20';

          return (
            <div
              key={session.sessionId}
              className={`bg-foreground/5 rounded-xl p-3 border-l-2 ${borderColor}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-foreground/60 text-xs">
                  {formatDate(session.startedAt)}
                </span>
                <span className={`font-bold text-sm ${netColor}`}>
                  {netPrefix}${Math.abs(net).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-foreground/40">
                <span>
                  {session.handsPlayed} hand{session.handsPlayed !== 1 ? 's' : ''}
                </span>
                <span>
                  ${session.buyInAmount.toLocaleString()} &rarr; ${session.endingChips.toLocaleString()}
                </span>
                <span>
                  {session.handsPlayed > 0 ? `${(session.winRate * 100).toFixed(0)}% win` : 'N/A'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
