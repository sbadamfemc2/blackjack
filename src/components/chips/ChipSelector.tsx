'use client';

import { ChipDenomination, CHIP_DENOMINATIONS } from '@/engine/types';
import { Chip } from './Chip';

interface ChipSelectorProps {
  selectedDenomination: ChipDenomination;
  onSelect: (denomination: ChipDenomination) => void;
  availableChips: number;
}

export function ChipSelector({ selectedDenomination, onSelect, availableChips }: ChipSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-3">
      {CHIP_DENOMINATIONS.map((denom) => (
        <Chip
          key={denom}
          denomination={denom}
          selected={selectedDenomination === denom}
          disabled={denom > availableChips}
          onClick={() => onSelect(denom)}
        />
      ))}
    </div>
  );
}
