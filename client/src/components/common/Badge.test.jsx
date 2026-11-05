// Component test for Badge — verifies enum→label mapping and graceful fallback.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge.jsx';

describe('<Badge />', () => {
  it('renders the friendly label for a known status', () => {
    render(<Badge value="in_progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('maps an AI risk flag to its label', () => {
    render(<Badge value="at_risk" />);
    expect(screen.getByText('At Risk')).toBeInTheDocument();
  });

  it('falls back to the raw value for an unknown status', () => {
    render(<Badge value="something_new" />);
    expect(screen.getByText('something_new')).toBeInTheDocument();
  });
});
