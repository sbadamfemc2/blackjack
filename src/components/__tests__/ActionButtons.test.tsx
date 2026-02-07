import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionButtons } from '@/components/controls/ActionButtons';
import { PlayerAction, GameAction } from '@/engine/types';

// Mock framer-motion to render plain elements
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, whileTap, ...props }: React.ComponentProps<'button'> & { whileTap?: unknown }) => (
      <button {...props}>{children}</button>
    ),
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

describe('ActionButtons', () => {
  const allActions: PlayerAction[] = ['hit', 'stand', 'double', 'split', 'surrender'];
  const mockOnAction = jest.fn();

  beforeEach(() => {
    mockOnAction.mockClear();
  });

  it('renders only the available actions', () => {
    render(<ActionButtons availableActions={['hit', 'stand']} onAction={mockOnAction} />);
    expect(screen.getByText('HIT')).toBeInTheDocument();
    expect(screen.getByText('STAND')).toBeInTheDocument();
    expect(screen.queryByText('DOUBLE')).not.toBeInTheDocument();
    expect(screen.queryByText('SPLIT')).not.toBeInTheDocument();
    expect(screen.queryByText('SURRENDER')).not.toBeInTheDocument();
  });

  it('calls onAction with correct GameAction on click', async () => {
    const user = userEvent.setup();
    render(<ActionButtons availableActions={allActions} onAction={mockOnAction} />);

    await user.click(screen.getByText('HIT'));
    expect(mockOnAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'HIT' }));

    await user.click(screen.getByText('STAND'));
    expect(mockOnAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'STAND' }));

    await user.click(screen.getByText('DOUBLE'));
    expect(mockOnAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'DOUBLE_DOWN' }));
  });

  it('shows keyboard shortcut badges', () => {
    render(<ActionButtons availableActions={allActions} onAction={mockOnAction} />);
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
  });
});
