import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClientsPage from './ClientsPage.jsx';
import { useAuth } from '../hooks/useAuth.js';

vi.mock('../hooks/useAuth.js', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useToast.js', () => ({ useToast: () => ({ toast: {} }) }));
vi.mock('../hooks/useFetch.js', () => ({
  useFetch: () => ({
    data: { clients: [{ id: 'c1', name: 'Test client' }], pages: 1 },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
beforeEach(() => vi.clearAllMocks());

describe('client management permissions', () => {
  it('lets team members view clients without offering forbidden write actions', () => {
    useAuth.mockReturnValue({ user: { role: 'team_member' } });
    render(<ClientsPage />);
    expect(screen.getByText('Test client')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Add Client' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
  });

  it('offers create and archive actions to the admin', () => {
    useAuth.mockReturnValue({ user: { role: 'admin' } });
    render(<ClientsPage />);
    expect(screen.getByRole('button', { name: '+ Add Client' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
  });
});
