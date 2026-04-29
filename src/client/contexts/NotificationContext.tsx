import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  notificationService,
  type Notification,
} from '../lib/notifications';

// ─── Supabase Realtime Client (lightweight, client-side) ──
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ─── Context Types ───────────────────────────────────────

interface NotificationContextType {
  /** All loaded notifications (newest first) */
  notifications: Notification[];
  /** Number of unread notifications */
  unreadCount: number;
  /** Whether the notification panel is open */
  isPanelOpen: boolean;
  /** Toggle the notification panel */
  togglePanel: () => void;
  /** Close the notification panel */
  closePanel: () => void;
  /** Mark a single notification as read */
  markRead: (id: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllRead: () => Promise<void>;
  /** Delete a notification */
  remove: (id: string) => Promise<void>;
  /** Clear all notifications */
  clearAll: () => Promise<void>;
  /** Refresh notifications from the server */
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// ─── Provider ────────────────────────────────────────────

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  // Get current user ID from localStorage
  const getUserId = useCallback((): string | null => {
    try {
      const userStr = localStorage.getItem('supabase_user');
      if (!userStr) return null;
      const user = JSON.parse(userStr);
      return user.id || null;
    } catch {
      return null;
    }
  }, []);

  // Fetch notifications from the server
  const fetchNotifications = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        notificationService.list(50),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  // Always fetch notifications via REST on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Setup Supabase Realtime subscription (enhancement — works without it)
  useEffect(() => {
    const userId = getUserId();
    if (!userId || !supabaseUrl || !supabaseAnonKey) return;

    // Create a dedicated supabase client for realtime
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    supabaseRef.current = supabase;

    // Authenticate the realtime connection with the user's access token
    const token = localStorage.getItem('supabase_token');
    if (token) {
      supabase.realtime.setAuth(token);
    }

    // Subscribe to INSERT events on the notifications table for this user
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [getUserId]);

  // ─── Actions ─────────────────────────────────────────

  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const markRead = useCallback(async (id: string) => {
    await notificationService.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const remove = useCallback(async (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    await notificationService.remove(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (notif && !notif.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, [notifications]);

  const clearAll = useCallback(async () => {
    await notificationService.clearAll();
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const contextValue = useMemo(() => ({
    notifications,
    unreadCount,
    isPanelOpen,
    togglePanel,
    closePanel,
    markRead,
    markAllRead,
    remove,
    clearAll,
    refresh: fetchNotifications,
  }), [notifications, unreadCount, isPanelOpen, togglePanel, closePanel, markRead, markAllRead, remove, clearAll, fetchNotifications]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
}
