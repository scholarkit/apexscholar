import { apiFetch } from './apiFetch';

// ─── Types ───────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  category: string;   // 'collaboration' | 'system' | 'activity' | ...
  type: string;        // 'invite_received' | 'invite_accepted' | ...
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// ─── Service ─────────────────────────────────────────────

export const notificationService = {
  /** Fetch notifications (newest first) */
  async list(limit = 50, offset = 0): Promise<Notification[]> {
    const res = await apiFetch(
      `/api/notifications?limit=${limit}&offset=${offset}`
    );
    if (!res.ok) return [];
    return res.json();
  },

  /** Get unread count */
  async getUnreadCount(): Promise<number> {
    const res = await apiFetch('/api/notifications/unread-count');
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count || 0;
  },

  /** Mark a single notification as read */
  async markRead(id: string): Promise<void> {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  /** Mark all notifications as read */
  async markAllRead(): Promise<void> {
    await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
  },

  /** Delete a notification */
  async remove(id: string): Promise<void> {
    await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
  },

  /** Clear all notifications */
  async clearAll(): Promise<void> {
    await apiFetch('/api/notifications', { method: 'DELETE' });
  },
};
