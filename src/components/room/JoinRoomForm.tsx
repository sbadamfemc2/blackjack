'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface JoinRoomFormProps {
  onSubmit: (code: string) => void;
  submitting: boolean;
  error?: string | null;
}

const CODE_LENGTH = 6;
// Same character set as roomCode.ts
const VALID_CHARS = new Set('ABCDEFGHJKLMNPQRTUVWXYZ2346789'.split(''));

export function JoinRoomForm({ onSubmit, submitting, error }: JoinRoomFormProps) {
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (value: string) => {
    // Normalize: uppercase, strip invalid chars
    const normalized = value
      .toUpperCase()
      .split('')
      .filter((c) => VALID_CHARS.has(c))
      .join('')
      .slice(0, CODE_LENGTH);
    setCode(normalized);
  };

  const isValid = code.length === CODE_LENGTH;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-foreground/60 text-sm font-semibold mb-2">
          Room Code
        </label>
        <input
          ref={inputRef}
          type="text"
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="ABCD23"
          maxLength={CODE_LENGTH}
          autoFocus
          className="w-full h-14 rounded-xl bg-foreground/5 border border-foreground/10 text-center text-2xl font-mono font-bold tracking-[0.3em] text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-accent transition-colors"
        />
        <p className="text-foreground/30 text-xs mt-1 text-center">
          Enter the 6-character code shared by the host
        </p>
      </div>

      {error && (
        <p className="text-error text-sm text-center">{error}</p>
      )}

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => onSubmit(code)}
        disabled={!isValid || submitting}
        className="w-full h-14 rounded-xl bg-accent text-background font-bold text-lg hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20 focus-ring disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Joining...' : 'Join Room'}
      </motion.button>
    </div>
  );
}
