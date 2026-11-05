import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProjectsPage from './ProjectsPage.jsx';
import { projectApi } from '../api/projectApi.js';
import { useToast } from '../hooks/useToast.js';

vi.mock('../hooks/useAuth.js', () => ({ useAuth: () => ({ user: { role: 'admin' } }) }));
vi.mock('../hooks/useToast.js', () => ({ useToast: vi.fn() }));
vi.mock('../hooks/useFetch.js', () => ({
  useFetch: () => ({
    data: { projects: [], pages: 1 },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../api/projectApi.js', () => ({ projectApi: { create: vi.fn() } }));
vi.mock('../api/clientApi.js', () => ({
  clientApi: {
    list: vi.fn().mockResolvedValue({ data: { clients: [{ id: 'c1', name: 'Demo client' }] } }),
  },
}));

beforeEach(() => vi.clearAllMocks());
describe('project creation errors', () => {
  it('shows the server error and keeps the entered form available for correction', async () => {
    const error = vi.fn();
    useToast.mockReturnValue({ toast: { error } });
    projectApi.create.mockRejectedValue({ response: { data: { message: 'Client not found' } } });
    render(<ProjectsPage />);
    fireEvent.click(screen.getByRole('button', { name: '+ New Project' }));
    await screen.findByRole('option', { name: 'Demo client' });
    fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'c1' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Website' } });
    fireEvent.submit(screen.getByLabelText('Title').closest('form'));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Client not found'));
    expect(screen.getByLabelText('Title')).toHaveValue('Website');
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
  });
});
