'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { BalanceDisplay } from '@/components/ui/BalanceDisplay';
import { useBalance } from '@/hooks/useBalance';
import { JoinRoomForm } from '@/components/room/JoinRoomForm';

export default function JoinRoomPage() {
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
          <p className="text-foreground/60 text-sm mb-4">Sign in to join a room</p>
          <Link href="/login" className="text-accent hover:text-accent-hover transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleJoin = async (code: string) => {
    setSubmitting(true);
    setError(null);

    // First check if the room exists
    const checkRes = await fetch(`/api/rooms/${code}`);
    if (!checkRes.ok) {
      setError('Room not found. Check the code and try again.');
      setSubmitting(false);
      return;
    }

    // Navigate to room page (join happens there)
    router.push(`/room/${code}`);
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

        <h1 className="text-2xl font-bold text-foreground mb-6">Join Room</h1>

        <JoinRoomForm
          onSubmit={handleJoin}
          submitting={submitting}
          error={error}
        />
      </motion.div>
    </div>
  );
}
