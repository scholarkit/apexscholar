import { useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import type { Notification } from '../lib/notifications';
import { collaboratorService } from '../lib/collaborators';
import { useProject } from '../contexts/ProjectContext';

// ─── Icon resolver by category ───────────────────────────

function NotificationIcon({ category }: { category: string }) {
  switch (category) {
    case 'collaboration':
      return <Users className="w-4 h-4 text-indigo-400" />;
    default:
      return <Bell className="w-4 h-4 text-zinc-400" />;
  }
}

// ─── Time formatter ──────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Individual notification item ────────────────────────

function NotificationItem({
  notification,
  onAction,
}: {
  notification: Notification;
  onAction: () => void;
}) {
  const { markRead, remove } = useNotifications();
  const { refreshProjects } = useProject();
  const [acting, setActing] = React.useState(false);

  const handleAccept = async () => {
    setActing(true);
    try {
      const collabId = notification.data?.collab_id as string;
      if (collabId) {
        await collaboratorService.acceptInvite(collabId);
        await refreshProjects();
        await markRead(notification.id);
        onAction();
      }
    } catch (err) {
      console.error('Failed to accept invite:', err);
    } finally {
      setActing(false);
    }
  };

  const handleDecline = async () => {
    setActing(true);
    try {
      const collabId = notification.data?.collab_id as string;
      if (collabId) {
        await collaboratorService.declineInvite(collabId);
        await markRead(notification.id);
        onAction();
      }
    } catch (err) {
      console.error('Failed to decline invite:', err);
    } finally {
      setActing(false);
    }
  };

  const isInvite =
    notification.type === 'invite_received' && !notification.read;

  return (
    <div
      className={`px-4 py-3 border-b border-[var(--color-border)] transition-colors ${
        notification.read
          ? 'opacity-60'
          : 'bg-indigo-500/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <NotificationIcon category={notification.category} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">
            {notification.title}
          </p>
          {notification.body && (
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              {notification.body}
            </p>
          )}
          <p className="text-[10px] text-zinc-600 mt-1.5">
            {timeAgo(notification.created_at)}
          </p>

          {/* Action buttons for invite notifications */}
          {isInvite && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleAccept}
                disabled={acting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <Check className="w-3 h-3" />
                Accept
              </button>
              <button
                onClick={handleDecline}
                disabled={acting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          )}
        </div>

        {/* Mark read / delete */}
        <div className="flex items-center gap-1 shrink-0">
          {!notification.read && (
            <button
              onClick={() => markRead(notification.id)}
              title="Mark as read"
              className="p-1 rounded-md hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => remove(notification.id)}
            title="Remove"
            className="p-1 rounded-md hover:bg-white/5 text-zinc-600 hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Need React import for useState in NotificationItem
import React from 'react';

// ─── Notification Panel (fixed overlay) ──────────────────

export function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    isPanelOpen,
    closePanel,
    markAllRead,
    clearAll,
    refresh,
  } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside — uses capture phase + stopPropagation on panel
  useEffect(() => {
    if (!isPanelOpen) return;
    const handler = (e: MouseEvent) => {
      // If click is on the trigger button, let togglePanel handle it
      if ((e.target as HTMLElement).closest?.('[data-notification-trigger]')) return;
      // Any other click outside the panel closes it
      closePanel();
    };
    // Small delay so the opening click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [isPanelOpen, closePanel]);

  if (!isPanelOpen) return null;

  return (
    <div
      ref={panelRef}
      // Stop mousedown from reaching the document handler — this is the key fix
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed left-16 md:left-[68px] bottom-16 w-[22rem] sm:w-96 max-h-[70vh] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              title="Mark all as read"
              className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-indigo-400 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              title="Clear all"
              className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={closePanel}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto max-h-[calc(70vh-52px)] custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="w-10 h-10 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500 font-medium">
              No notifications yet
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              You'll see invites and updates here.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onAction={refresh}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Bell Button (for the Layout sidebar/topbar) ─────────
// Renders the bell icon with badge. Accepts optional children
// so the Layout can wrap the icon + label text together as one clickable row.

export function NotificationBell({ children }: { children?: React.ReactNode }) {
  const { unreadCount, togglePanel, isPanelOpen } = useNotifications();

  return (
    <>
      <button
        data-notification-trigger
        onClick={togglePanel}
        title="Notifications"
        className={`relative flex items-center gap-3 w-full rounded-xl transition-all duration-200 ${
          children ? 'px-3 py-2.5 text-sm font-medium' : 'p-2 justify-center'
        } ${
          isPanelOpen
            ? 'bg-indigo-500/10 text-indigo-400'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
        }`}
      >
        <div className="relative flex-shrink-0">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white ring-2 ring-[var(--color-bg)]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {children}
      </button>
      <NotificationPanel />
    </>
  );
}

