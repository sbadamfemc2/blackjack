import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BetControls } from '@/components/controls/BetControls';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, whileTap, ...props }: React.ComponentProps<'button'> & { whileTap?: unknown }) => (
      <button {...props}>{children}</button>
    ),
  },
  useReducedMotion: () => false,
}));

describe('BetControls', () => {
  const defaults = {
    canDeal: false,
    hasBets: false,
    hasPreviousBets: false,
    canAffordPrevious: false,
    canAffordDouble: false,
    onDeal: jest.fn(),
    onClear: jest.fn(),
    onSameBet: jest.fn(),
    onDoubleBet: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables Deal button when canDeal is false', () => {
    render(<BetControls {...defaults} />);
    expect(screen.getByText('DEAL')).toBeDisabled();
  });

  it('enables Deal button when canDeal is true', () => {
    render(<BetControls {...defaults} canDeal={true} />);
    expect(screen.getByText('DEAL')).not.toBeDisabled();
  });

  it('disables Same Bet and 2x Bet when no previous bets', () => {
    render(<BetControls {...defaults} />);
    expect(screen.getByText('Same Bet')).toBeDisabled();
    expect(screen.getByText('2x Bet')).toBeDisabled();
  });

  it('calls correct handlers on button clicks', async () => {
    const user = userEvent.setup();
    const handlers = {
      onDeal: jest.fn(),
      onClear: jest.fn(),
      onSameBet: jest.fn(),
      onDoubleBet: jest.fn(),
    };
    render(
      <BetControls
        {...defaults}
        {...handlers}
        canDeal={true}
        hasBets={true}
        hasPreviousBets={true}
        canAffordPrevious={true}
        canAffordDouble={true}
      />
    );

    await user.click(screen.getByText('DEAL'));
    expect(handlers.onDeal).toHaveBeenCalled();

    await user.click(screen.getByText('Clear'));
    expect(handlers.onClear).toHaveBeenCalled();

    await user.click(screen.getByText('Same Bet'));
    expect(handlers.onSameBet).toHaveBeenCalled();

    await user.click(screen.getByText('2x Bet'));
    expect(handlers.onDoubleBet).toHaveBeenCalled();
  });
});
