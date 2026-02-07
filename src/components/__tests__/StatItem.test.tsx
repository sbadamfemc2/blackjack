import { render, screen } from '@testing-library/react';
import { StatItem } from '@/components/stats/StatItem';

describe('StatItem', () => {
  it('renders label and value', () => {
    render(<StatItem label="Total Hands" value={42} />);
    expect(screen.getByText('Total Hands')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('applies correct color class for valueColor', () => {
    const { container } = render(
      <StatItem label="Best Win" value="+$100" valueColor="success" />
    );
    const valueEl = screen.getByText('+$100');
    expect(valueEl.className).toContain('text-success');
  });
});
