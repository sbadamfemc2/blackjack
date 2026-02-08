import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopBar } from '@/components/layout/TopBar';

// Mock useAuth
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, signOut: jest.fn(), loading: false }),
}));

// Mock useBalance
jest.mock('@/hooks/useBalance', () => ({
  useBalance: () => ({ balance: null, loading: false, refresh: jest.fn() }),
}));

describe('TopBar', () => {
  it('shows chip count and hand number', () => {
    render(<TopBar chips={1500} handNumber={3} buyInAmount={1000} />);
    expect(screen.getByText('$1,500')).toBeInTheDocument();
    expect(screen.getByText('Hand #3')).toBeInTheDocument();
  });

  it('shows positive net in green and negative net in red', () => {
    const { rerender } = render(<TopBar chips={1500} handNumber={1} buyInAmount={1000} />);
    // Net = +500
    const positiveNet = screen.getByText('+$500');
    expect(positiveNet.className).toContain('text-success');

    rerender(<TopBar chips={800} handNumber={1} buyInAmount={1000} />);
    // Net = -200
    const negativeNet = screen.getByText('$200');
    expect(negativeNet.className).toContain('text-error');
  });

  it('shows End Session button when onEndSession is provided', () => {
    const onEnd = jest.fn();
    const { rerender } = render(
      <TopBar chips={1000} handNumber={1} buyInAmount={1000} onEndSession={onEnd} />
    );
    expect(screen.getByText('End Session')).toBeInTheDocument();

    rerender(<TopBar chips={1000} handNumber={1} buyInAmount={1000} />);
    expect(screen.queryByText('End Session')).not.toBeInTheDocument();
  });
});
