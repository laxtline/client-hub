import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthProvider } from './AuthContext.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { refreshSession } from '../api/axiosClient.js';
import { authApi } from '../api/authApi.js';

vi.mock('../api/axiosClient.js', () => ({ setAccessToken: vi.fn(), refreshSession: vi.fn() }));
vi.mock('../api/authApi.js', () => ({ authApi: { logout: vi.fn() } }));
function Session() {
  const { user, token, loading, login, logout } = useAuth();
  return (
    <>
      <div>{loading ? 'Loading' : `${user?.role || 'signed out'}:${token || ''}`}</div>
      <button onClick={() => login({ role: 'admin' }, 'login-token')}>Log in</button>
      <button onClick={logout}>Log out</button>
    </>
  );
}
beforeEach(() => vi.resetAllMocks());

describe('session restoration', () => {
  it('restores the user and socket token from the refresh cookie after reload', async () => {
    refreshSession.mockResolvedValue({ user: { role: 'client' }, accessToken: 'restored-token' });
    render(
      <AuthProvider>
        <Session />
      </AuthProvider>
    );
    await screen.findByText('client:restored-token');
  });

  it('makes login tokens available to sockets and clears them on logout', async () => {
    refreshSession.mockRejectedValue(new Error('No session'));
    authApi.logout.mockResolvedValue({});
    render(
      <AuthProvider>
        <Session />
      </AuthProvider>
    );
    await screen.findByText('signed out:');
    fireEvent.click(screen.getByText('Log in'));
    expect(screen.getByText('admin:login-token')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Log out'));
    await waitFor(() => expect(screen.getByText('signed out:')).toBeInTheDocument());
  });
});
