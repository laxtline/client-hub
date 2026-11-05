import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from './NotificationBell.jsx';
import { notificationApi } from '../../api/notificationApi.js';

vi.mock('../../hooks/useSocket.js', () => ({ useSocket: () => null }));
vi.mock('../../api/notificationApi.js', () => ({
  notificationApi: {
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  notificationApi.list.mockResolvedValue({
    data: {
      unread: 1,
      notifications: [
        { id: 'n1', message: 'Payment received', isRead: false, createdAt: '2026-11-05' },
      ],
    },
  });
});

describe('saved notification read state', () => {
  it.each(['single', 'all'])(
    'restores unread state after a failed %s read request',
    async (mode) => {
      notificationApi.markRead.mockRejectedValue(new Error('offline'));
      notificationApi.markAllRead.mockRejectedValue(new Error('offline'));
      render(
        <MemoryRouter>
          <NotificationBell />
        </MemoryRouter>
      );
      fireEvent.click(await screen.findByRole('button', { name: 'Notifications (1 unread)' }));
      fireEvent.click(
        screen.getByRole('button', { name: mode === 'all' ? 'Mark all read' : /Payment received/ })
      );
      await waitFor(() => expect(notificationApi.list).toHaveBeenCalledTimes(2));
      expect(
        await screen.findByRole('button', { name: 'Notifications (1 unread)' })
      ).toBeInTheDocument();
    }
  );
});
