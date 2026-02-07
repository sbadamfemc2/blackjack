'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ChipDenomination } from '@/engine/types';

const CHIP_STYLES: Record<ChipDenomination, { bg: string; text: string; border: string }> = {
  1:    { bg: 'bg-white',       text: 'text-gray-800', border: 'border-gray-300' },
  5:    { bg: 'bg-red-600',     text: 'text-white',    border: 'border-red-400' },
  25:   { bg: 'bg-green-600',   text: 'text-white',    border: 'border-green-400' },
  100:  { bg: 'bg-gray-900',    text: 'text-white',    border: 'border-gray-600' },
  500:  { bg: 'bg-purple-700',  text: 'text-white',    border: 'border-purple-400' },
  1000: { bg: 'bg-orange-500',  text: 'text-white',    border: 'border-orange-300' },
};

const CHIP_LABELS: Record<ChipDenomination, string> = {
  1: '$1',
  5: '$5',
  25: '$25',
  100: '$100',
  500: '$500',
  1000: '$1K',
};

interface ChipProps {
  denomination: ChipDenomination;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function Chip({ denomination, selected = false, disabled = false, onClick }: ChipProps) {
  const reducedMotion = useReducedMotion();
  const style = CHIP_STYLES[denomination];
  const label = CHIP_LABELS[denomination];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={!disabled && !reducedMotion ? { scale: 0.9 } : undefined}
      className={`
        relative w-12 h-12 md:w-14 md:h-14 rounded-full focus-ring
        ${style.bg} ${style.text} border-2 ${style.border}
        flex items-center justify-center
        text-[10px] md:text-xs font-bold
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
        ${selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-background scale-110' : ''}
        transition-all duration-150
        shadow-md
      `}
    >
      {/* Dashed inner ring for casino look */}
      <div className="absolute inset-1.5 rounded-full border border-dashed border-white/40" />
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}
