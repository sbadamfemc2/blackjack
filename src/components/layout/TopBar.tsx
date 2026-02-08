'use client';

import { useAuth } from '@/hooks/useAuth';
import { useBalance } from '@/hooks/useBalance';
import { BalanceDisplay } from '@/components/ui/BalanceDisplay';

interface TopBarProps {
  chips: number;
  handNumber: number;
  buyInAmount: number;
  onEndSession?: () => void;
}

export function TopBar({ chips, handNumber, buyInAmount, onEndSession }: TopBarProps) {
  const { user, signOut } = useAuth();
  const { balance, loading: balanceLoading } = useBalance(user?.id ?? null);
  const net = chips - buyInAmount;
  const netColor = net > 0 ? 'text-success' : net < 0 ? 'text-error' : 'text-foreground/40';
  const netPrefix = net > 0 ? '+' : '';

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="text-accent text-lg">&#9679;</span>
        <span className="text-foreground font-bold text-lg md:text-xl">
          ${chips.toLocaleString()}
        </span>
        <span className={`text-xs font-semibold ${netColor}`}>
          {netPrefix}${Math.abs(net).toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <BalanceDisplay balance={balance} loading={balanceLoading} size="sm" />
            <span className="text-foreground/20">|</span>
          </>
        )}
        <span className="text-foreground/40 text-xs md:text-sm">
          Hand #{handNumber}
        </span>
        {onEndSession && (
          <>
            <span className="text-foreground/20">|</span>
            <button
              type="button"
              onClick={onEndSession}
              className="text-error/70 text-xs hover:text-error transition-colors focus-ring"
            >
              End Session
            </button>
          </>
        )}
        {user && (
          <>
            <span className="text-foreground/20">|</span>
            <span className="text-foreground/40 text-xs hidden sm:inline truncate max-w-[120px]">
              {user.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="text-foreground/40 text-xs hover:text-foreground/60 transition-colors focus-ring"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
