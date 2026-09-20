import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { Api } from '../api/endpoints';
import type { Notification } from '../api/types';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';

export const NotificationDropdown: React.FC = () => {
  const { activeRole, activeClientId, activeSupplierId } = useSession();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const recipientType = activeRole === 'supplier' ? 'supplier' : 'client';
  const recipientId = activeRole === 'supplier' ? activeSupplierId : activeClientId;

  const fetchUnreadCount = useCallback(async () => {
    if (!recipientId) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await Api.notifications.getUnreadCount({
        recipient_type: recipientType,
        recipient_id: recipientId,
      });
      setUnreadCount(res.unread_count || 0);
    } catch {
      // ignore in background
    }
  }, [recipientType, recipientId]);

  const fetchNotifications = useCallback(async () => {
    if (!recipientId) return;
    setIsLoading(true);
    try {
      const res = await Api.notifications.list({
        recipient_type: recipientType,
        recipient_id: recipientId,
        limit: 15,
      });
      setNotifications(res.items || []);
    } catch (err: any) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [recipientType, recipientId]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Click outside listener to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    if (!recipientId) return;
    try {
      await Api.notifications.markAllRead({
        recipient_type: recipientType,
        recipient_id: recipientId,
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast('success', 'Marked Read', 'All notifications marked as read.');
    } catch (err: any) {
      showToast('error', 'Action Failed', err.detail || err.message);
    }
  };

  const handleItemClick = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await Api.notifications.markSingleRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // continue
      }
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-popover">
          <div
            style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Bell size={16} style={{ color: 'var(--brand-primary)' }} />
              Notifications
              {unreadCount > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ({unreadCount} unread)
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleMarkAllRead}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                title="Mark all as read"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '380px' }}>
            {isLoading ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Inbox size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>No notifications yet</div>
                <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
                  New match alerts will appear here.
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                  onClick={() => handleItemClick(n)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)', lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    {!n.is_read && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          backgroundColor: 'var(--brand-primary)',
                          flexShrink: 0,
                          marginTop: 5,
                        }}
                      />
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    {new Date(n.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
