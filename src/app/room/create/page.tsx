'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useBalance } from '@/hooks/useBalance';
import { BalanceDisplay } from '@/components/ui/BalanceDisplay';
import { CreateRoomForm } from '@/components/room/CreateRoomForm';

export default function CreateRoomPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { balance, loading: balanceLoading } = useBalance(user?.id ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading || balanceLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <span className="text-foreground/40 text-sm">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-foreground/60 text-sm mb-4">Sign in to create a room</p>
          <Link href="/login" className="text-accent hover:text-accent-hover transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleCreate = async (settings: { minBet: number; maxBet: number; maxPlayers: number; buyIn: number }) => {
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to create room');
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    router.push(`/room/${data.room.code}`);
  };

  return (
    <div className="h-dvh flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="text-foreground/40 text-sm hover:text-foreground/60 transition-colors"
          >
            &larr; Back
          </Link>
          <BalanceDisplay balance={balance} />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-6">Create Room</h1>

        {error && (
          <p className="text-error text-sm mb-4">{error}</p>
        )}

        <CreateRoomForm
          balance={balance ?? 0}
          onSubmit={handleCreate}
          submitting={submitting}
        />
      </motion.div>
    </div>
  );
}
