'use client';

interface StatItemProps {
  label: string;
  value: string | number;
  valueColor?: 'success' | 'error' | 'accent' | 'default';
}

const colorMap = {
  success: 'text-success',
  error: 'text-error',
  accent: 'text-accent',
  default: 'text-foreground',
};

export function StatItem({ label, value, valueColor = 'default' }: StatItemProps) {
  return (
    <div className="bg-foreground/5 rounded-lg p-3 text-center">
      <div className="text-foreground/40 text-xs uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`font-bold text-sm md:text-base ${colorMap[valueColor]}`}>
        {value}
      </div>
    </div>
  );
}
