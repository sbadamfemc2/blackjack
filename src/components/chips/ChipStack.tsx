'use client';

import { ChipDenomination, CHIP_DENOMINATIONS } from '@/engine/types';

const CHIP_COLORS: Record<ChipDenomination, string> = {
  1:    '#FFFFFF',
  5:    '#DC2626',
  25:   '#16A34A',
  100:  '#1F2937',
  500:  '#7E22CE',
  1000: '#F97316',
};

interface ChipStackProps {
  amount: number;
  maxVisible?: number;
}

function decomposeIntoChips(amount: number): ChipDenomination[] {
  const chips: ChipDenomination[] = [];
  let remaining = amount;
  // Greedy from largest to smallest
  const denoms = [...CHIP_DENOMINATIONS].reverse();
  for (const d of denoms) {
    while (remaining >= d) {
      chips.push(d);
      remaining -= d;
    }
  }
  return chips;
}

export function ChipStack({ amount, maxVisible = 5 }: ChipStackProps) {
  if (amount <= 0) return null;

  const chips = decomposeIntoChips(amount);
  const visible = chips.slice(0, maxVisible);

  return (
    <div className="relative flex flex-col-reverse items-center">
      {visible.map((denom, i) => (
        <div
          key={i}
          className="w-8 h-3 md:w-10 md:h-3.5 rounded-full border border-white/30 shadow-sm"
          style={{
            backgroundColor: CHIP_COLORS[denom],
            marginTop: i > 0 ? -6 : 0,
            zIndex: i,
          }}
        />
      ))}
    </div>
  );
}
