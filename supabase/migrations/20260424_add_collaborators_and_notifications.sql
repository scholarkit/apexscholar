-- ============================================================
-- Migration: Add project collaborators + notifications tables
-- Date: 2026-04-24
-- ============================================================

-- ── 1. Project Collaborators ─────────────────────────────────
CREATE TABLE IF NOT EXISTS project_collaborators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('editor', 'viewer')) DEFAULT 'viewer',
  invited_by  UUID NOT NULL REFERENCES auth.users(id),
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  status      TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',

  UNIQUE (project_id, user_id)
);

-- Indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_collab_user_accepted
  ON project_collaborators(user_id) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_collab_user_pending
  ON project_collaborators(user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_collab_project
  ON project_collaborators(project_id);

-- ── 2. Notifications (extensible) ────────────────────────────
-- Generic notification table that supports arbitrary event types.
-- The `category` field groups notifications (e.g., 'collaboration', 'system', 'activity').
-- The `data` JSONB field carries type-specific payload without schema coupling.
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL DEFAULT 'system',  -- 'collaboration', 'system', 'activity', etc.
  type        TEXT NOT NULL,                    -- 'invite_received', 'invite_accepted', 'project_shared', etc.
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',              -- arbitrary payload (project_id, collab_id, etc.)
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- ── 3. Enable Realtime for notifications ─────────────────────
-- This allows the client to subscribe to INSERT events on the notifications table.
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ── 4. RLS Policies ──────────────────────────────────────────
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Collaborators: users see records where they're the collaborator or the project owner
CREATE POLICY "collab_select" ON project_collaborators FOR SELECT
  USING (
    user_id = auth.uid()
    OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "collab_insert" ON project_collaborators FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "collab_update" ON project_collaborators FOR UPDATE
  USING (
    user_id = auth.uid()
    OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "collab_delete" ON project_collaborators FOR DELETE
  USING (
    user_id = auth.uid()
    OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- Notifications: users can only see and manage their own notifications
CREATE POLICY "notif_select" ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notif_update" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "notif_delete" ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- Server-side (service role) handles inserts, so no INSERT policy for end users.
