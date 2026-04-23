import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';

export const notificationsRouter = Router();

// ─── Notification types registry ─────────────────────────
// Extensible: add new categories and types here as features grow.
// This serves as documentation and can be used for validation.
export const NOTIFICATION_CATEGORIES = [
  'collaboration',
  'system',
  'activity',
] as const;

export const NOTIFICATION_TYPES = {
  collaboration: [
    'invite_received',
    'invite_accepted',
    'invite_declined',
    'role_changed',
    'removed_from_project',
  ],
  system: [
    'welcome',
    'maintenance',
    'update_available',
  ],
  activity: [
    'journal_mention',
    'resource_shared',
    'task_assigned',
  ],
} as const;

// ─── Helper: Create a notification (used by other modules) ──
export interface CreateNotificationInput {
  userId: string;
  category: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

/**
 * Insert a notification into the database.
 * This is the canonical way other server modules create notifications.
 * The notification will appear in real-time via Supabase Realtime subscriptions.
 */
export async function createNotification(input: CreateNotificationInput) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: input.userId,
      category: input.category,
      type: input.type,
      title: input.title,
      body: input.body || null,
      data: input.data || {},
      read: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
  return data;
}

/**
 * Batch-create notifications for multiple users.
 * Useful for broadcasting (e.g., system announcements).
 */
export async function createNotificationsBatch(
  inputs: CreateNotificationInput[]
) {
  const rows = inputs.map((input) => ({
    user_id: input.userId,
    category: input.category,
    type: input.type,
    title: input.title,
    body: input.body || null,
    data: input.data || {},
    read: false,
  }));

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert(rows)
    .select();

  if (error) {
    console.error('Failed to create batch notifications:', error);
    return [];
  }
  return data;
}

// ─── REST Endpoints ──────────────────────────────────────

// Get all notifications for the current user (newest first)
notificationsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Notifications fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get unread count
notificationsRouter.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err: any) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mark a single notification as read
notificationsRouter.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('id', req.params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mark all notifications as read
notificationsRouter.patch('/read-all', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a single notification
notificationsRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Clear all notifications
notificationsRouter.delete('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('Clear notifications error:', err);
    res.status(500).json({ error: err.message });
  }
});
