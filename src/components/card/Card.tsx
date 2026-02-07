'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Card as CardType } from '@/engine/types';

const SUIT_SYMBOLS: Record<CardType['suit'], string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

const SUIT_COLORS: Record<CardType['suit'], string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
};

interface CardProps {
  card: CardType;
  faceDown?: boolean;
  delay?: number;
  animateEntry?: boolean;
}

export function Card({ card, faceDown = false, delay = 0, animateEntry = false }: CardProps) {
  const reducedMotion = useReducedMotion();
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const suitColor = SUIT_COLORS[card.suit];

  const shouldAnimate = animateEntry && !reducedMotion;

  return (
    <motion.div
      className="relative w-16 h-[90px] md:w-20 md:h-28 lg:w-24 lg:h-[134px] flex-shrink-0"
      style={{ perspective: 800 }}
      initial={shouldAnimate ? { y: -120, x: 60, opacity: 0, scale: 0.7 } : false}
      animate={shouldAnimate ? { y: 0, x: 0, opacity: 1, scale: 1 } : undefined}
      transition={shouldAnimate ? { duration: 0.4, delay, ease: 'easeOut' } : undefined}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: faceDown ? 0 : 180 }}
        transition={{ duration: reducedMotion ? 0 : 0.5, ease: 'easeInOut' }}
      >
        {/* Back face */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="w-full h-full bg-blue-900 border-2 border-blue-700 rounded-lg p-1">
            <div className="w-full h-full rounded border border-amber-500/40 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,215,0,0.08)_4px,rgba(255,215,0,0.08)_8px)]" />
          </div>
        </div>

        {/* Front face */}
        <div
          className={`absolute inset-0 bg-white rounded-lg shadow-md ${suitColor} flex flex-col justify-between p-1 md:p-1.5`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Top-left corner */}
          <div className="flex flex-col items-center leading-none -space-y-0.5">
            <span className="text-xs md:text-sm lg:text-base font-bold">{card.rank}</span>
            <span className="text-[10px] md:text-xs lg:text-sm">{suitSymbol}</span>
          </div>

          {/* Center suit */}
          <div className="flex items-center justify-center flex-1">
            <span className="text-2xl md:text-3xl lg:text-4xl">{suitSymbol}</span>
          </div>

          {/* Bottom-right corner (rotated) */}
          <div className="flex flex-col items-center leading-none -space-y-0.5 rotate-180">
            <span className="text-xs md:text-sm lg:text-base font-bold">{card.rank}</span>
            <span className="text-[10px] md:text-xs lg:text-sm">{suitSymbol}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
