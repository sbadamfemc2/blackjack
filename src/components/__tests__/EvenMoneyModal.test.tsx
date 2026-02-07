import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EvenMoneyModal } from '@/components/modals/EvenMoneyModal';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, ...props }: React.ComponentProps<'div'> & { initial?: unknown; animate?: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

describe('EvenMoneyModal', () => {
  const onAccept = jest.fn();
  const onDecline = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays bet amount in both options', () => {
    render(<EvenMoneyModal bet={100} onAccept={onAccept} onDecline={onDecline} />);
    expect(screen.getByText('Take $100')).toBeInTheDocument();
    expect(screen.getByText('No Thanks')).toBeInTheDocument();
  });

  it('calls onAccept and onDecline on button clicks', async () => {
    const user = userEvent.setup();
    render(<EvenMoneyModal bet={100} onAccept={onAccept} onDecline={onDecline} />);

    await user.click(screen.getByText('Take $100'));
    expect(onAccept).toHaveBeenCalled();

    await user.click(screen.getByText('No Thanks'));
    expect(onDecline).toHaveBeenCalled();
  });

  it('has role="dialog" and aria-modal attributes', () => {
    render(<EvenMoneyModal bet={100} onAccept={onAccept} onDecline={onDecline} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });
});
