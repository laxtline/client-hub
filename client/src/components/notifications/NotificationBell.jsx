import { useEffect, useRef, useState } from 'react';
import { notificationApi } from '../../api/notificationApi.js';
import { useSocket } from '../../hooks/useSocket.js';
import NotificationList from './NotificationList.jsx';

export default function NotificationBell() {
  const socket = useSocket();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  async function load() {
    try {
      const { data } = await notificationApi.list();
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      /* The bell can stay empty if this request fails. */
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const handler = (n) => {
      setItems((prev) => [n, ...prev]);
      setUnread((u) => u + 1);
    };
    socket.on('notification:new', handler);
    socket.on('connect', load);
    return () => {
      socket.off('notification:new', handler);
      socket.off('connect', load);
    };
  }, [socket]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Reload the saved state if marking it read fails.
  async function markRead(id) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await notificationApi.markRead(id).catch(load);
  }

  async function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    await notificationApi.markAllRead().catch(load);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <NotificationList
          items={items}
          onMarkRead={markRead}
          onMarkAll={markAll}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
