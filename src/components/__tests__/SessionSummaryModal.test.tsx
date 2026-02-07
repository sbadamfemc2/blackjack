import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionSummaryModal } from '@/components/modals/SessionSummaryModal';
import { SessionSummary } from '@/engine/types';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, ...props }: React.ComponentProps<'div'> & { initial?: unknown; animate?: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

const baseSummary: SessionSummary = {
  sessionId: 'test-123',
  startedAt: new Date('2025-01-01'),
  endedAt: new Date('2025-01-01'),
  buyInAmount: 1000,
  endingChips: 1500,
  handsPlayed: 10,
  wins: 6,
  losses: 3,
  pushes: 1,
  blackjacks: 1,
  surrenders: 0,
  winRate: 0.6,
  netWinLoss: 500,
  biggestWin: 200,
  biggestLoss: -100,
};

describe('SessionSummaryModal', () => {
  const onNewSession = jest.fn();
  const onViewStats = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "Busted!" header when isBusted is true', () => {
    const bustedSummary = { ...baseSummary, endingChips: 0, netWinLoss: -1000 };
    render(
      <SessionSummaryModal summary={bustedSummary} isBusted={true} onNewSession={onNewSession} />
    );
    expect(screen.getByText('Busted!')).toBeInTheDocument();
  });

  it('shows "Session Complete" header when not busted', () => {
    render(
      <SessionSummaryModal summary={baseSummary} isBusted={false} onNewSession={onNewSession} />
    );
    expect(screen.getByText('Session Complete')).toBeInTheDocument();
  });

  it('displays stats correctly', () => {
    render(
      <SessionSummaryModal summary={baseSummary} isBusted={false} onNewSession={onNewSession} />
    );
    expect(screen.getByText('+$500')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // hands played
    expect(screen.getByText('60.0%')).toBeInTheDocument(); // win rate
  });

  it('calls onNewSession when New Session clicked', async () => {
    const user = userEvent.setup();
    render(
      <SessionSummaryModal summary={baseSummary} isBusted={false} onNewSession={onNewSession} />
    );
    await user.click(screen.getByText('New Session'));
    expect(onNewSession).toHaveBeenCalled();
  });

  it('shows View Stats only when onViewStats is provided', () => {
    const { rerender } = render(
      <SessionSummaryModal summary={baseSummary} isBusted={false} onNewSession={onNewSession} />
    );
    expect(screen.queryByText('View Stats')).not.toBeInTheDocument();

    rerender(
      <SessionSummaryModal
        summary={baseSummary}
        isBusted={false}
        onNewSession={onNewSession}
        onViewStats={onViewStats}
      />
    );
    expect(screen.getByText('View Stats')).toBeInTheDocument();
  });
});
