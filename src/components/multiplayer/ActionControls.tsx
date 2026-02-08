'use client';

import { useState } from 'react';

interface ActionControlsProps {
  isMyTurn: boolean;
  canDouble: boolean;
  canSplit: boolean;
  onHit: () => Promise<{ error?: string }>;
  onStand: () => Promise<{ error?: string }>;
  onDouble: () => Promise<{ error?: string }>;
  onSplit: () => Promise<{ error?: string }>;
}

export function ActionControls({ isMyTurn, canDouble, canSplit, onHit, onStand, onDouble, onSplit }: ActionControlsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (fn: () => Promise<{ error?: string }>) => {
    setLoading(true);
    setError(null);
    const result = await fn();
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  if (!isMyTurn) {
    return (
      <div className="text-center text-foreground/40 text-sm py-3">
        Waiting for other player...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleAction(onHit)}
          disabled={loading}
          className="flex-1 h-12 rounded-xl bg-accent text-white font-bold text-base hover:bg-accent-hover transition-colors disabled:opacity-40 focus-ring"
        >
          Hit
        </button>
        <button
          type="button"
          onClick={() => handleAction(onStand)}
          disabled={loading}
          className="flex-1 h-12 rounded-xl bg-foreground/20 text-foreground font-bold text-base hover:bg-foreground/30 transition-colors disabled:opacity-40 focus-ring"
        >
          Stand
        </button>
        {canDouble && (
          <button
            type="button"
            onClick={() => handleAction(onDouble)}
            disabled={loading}
            className="flex-1 h-12 rounded-xl bg-yellow-600 text-white font-bold text-base hover:bg-yellow-500 transition-colors disabled:opacity-40 focus-ring"
          >
            Double
          </button>
        )}
        {canSplit && (
          <button
            type="button"
            onClick={() => handleAction(onSplit)}
            disabled={loading}
            className="flex-1 h-12 rounded-xl bg-felt text-white font-bold text-base hover:bg-felt-dark transition-colors disabled:opacity-40 focus-ring"
          >
            Split
          </button>
        )}
      </div>
      {error && <p className="text-error text-xs text-center">{error}</p>}
    </div>
  );
}
