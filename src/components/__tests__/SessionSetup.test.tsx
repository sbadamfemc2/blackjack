import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionSetup } from '@/components/game/SessionSetup';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, ...props }: React.ComponentProps<'div'> & { initial?: unknown; animate?: unknown }) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, whileTap, ...props }: React.ComponentProps<'button'> & { whileTap?: unknown }) => (
      <button {...props}>{children}</button>
    ),
    span: ({ children, ...props }: React.ComponentProps<'span'>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Default: no user
const mockUseAuth = jest.fn(() => ({ user: null, signOut: jest.fn(), loading: false }));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useBalance
const mockUseBalance = jest.fn(() => ({ balance: null, loading: false, refresh: jest.fn() }));
jest.mock('@/hooks/useBalance', () => ({
  useBalance: () => mockUseBalance(),
}));

describe('SessionSetup', () => {
  const onStart = jest.fn();
  const onResume = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, signOut: jest.fn(), loading: false });
  });

  it('renders buy-in slider and hand count buttons', () => {
    render(<SessionSetup onStart={onStart} activeSession={null} onResume={onResume} />);
    expect(screen.getByText('Buy-in Amount')).toBeInTheDocument();
    expect(screen.getByText('Number of Hands')).toBeInTheDocument();
    // Hand count buttons 1-6
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it('calls onStart with default values', async () => {
    const user = userEvent.setup();
    render(<SessionSetup onStart={onStart} activeSession={null} onResume={onResume} />);
    await user.click(screen.getByText('Start Playing'));
    expect(onStart).toHaveBeenCalledWith(1000, 1); // default buyIn=1000, hands=1
  });

  it('shows Resume Session when activeSession is provided', () => {
    const session = {
      sessionId: 'test-1',
      currentChips: 1500,
      handNumber: 5,
      gameState: {} as never,
      shoe: [],
      cardsDealt: 0,
    };
    render(<SessionSetup onStart={onStart} activeSession={session} onResume={onResume} />);
    expect(screen.getByText('Resume Session')).toBeInTheDocument();
    expect(screen.getByText('New Session')).toBeInTheDocument(); // replaces "Start Playing"
  });

  it('shows "View Stats" for authenticated users and "Sign in" for guests', () => {
    const { rerender } = render(
      <SessionSetup onStart={onStart} activeSession={null} onResume={onResume} />
    );
    expect(screen.getByText('Sign in to save progress')).toBeInTheDocument();

    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'test@test.com' },
      signOut: jest.fn(),
      loading: false,
    });
    mockUseBalance.mockReturnValue({ balance: 10000, loading: false, refresh: jest.fn() });
    rerender(<SessionSetup onStart={onStart} activeSession={null} onResume={onResume} />);
    expect(screen.getByText('View Stats')).toBeInTheDocument();
  });
});
