-- ============================================================
-- Migration: Add Kanban, Timetable, and Push Notifications
-- Date: 2026-07-14
-- ============================================================

-- ── 1. Kanban Cards ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kanban_cards (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id          UUID REFERENCES projects(id) ON DELETE CASCADE,
  column_id           TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  content             TEXT NOT NULL,
  deadline            DATE,
  estimated_minutes   INTEGER,
  source_type         TEXT, -- e.g., 'manual', 'course_recording', 'course_task'
  source_ref_id       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kanban_cards_user ON kanban_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_project ON kanban_cards(project_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_deadline ON kanban_cards(deadline);

-- ── 2. Availability Profiles ──────────────────────────────────
CREATE TABLE IF NOT EXISTS availability_profiles (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday_minutes     INTEGER NOT NULL DEFAULT 90,  -- 1.5 hours default
  weekend_minutes     INTEGER NOT NULL DEFAULT 300, -- 5 hours default
  blocked_slots       JSONB DEFAULT '[]',           -- Optional array of blocked recurring slots
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Scheduled Blocks ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduled_blocks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kanban_card_id      UUID REFERENCES kanban_cards(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  start_minutes       INTEGER,                      -- Time of day (0-1439), optional
  duration_minutes    INTEGER NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('planned', 'completed', 'skipped', 'rescheduled')) DEFAULT 'planned',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_blocks_user_date ON scheduled_blocks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_scheduled_blocks_kanban ON scheduled_blocks(kanban_card_id);

-- ── 4. Push Subscriptions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint            TEXT NOT NULL UNIQUE,
  keys_p256dh         TEXT NOT NULL,
  keys_auth           TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- ── 5. RLS Policies ───────────────────────────────────────────
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Kanban Cards
CREATE POLICY "kanban_select" ON kanban_cards FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "kanban_insert" ON kanban_cards FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "kanban_update" ON kanban_cards FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "kanban_delete" ON kanban_cards FOR DELETE USING (user_id = auth.uid());

-- Availability Profiles
CREATE POLICY "avail_select" ON availability_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "avail_insert" ON availability_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "avail_update" ON availability_profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "avail_delete" ON availability_profiles FOR DELETE USING (user_id = auth.uid());

-- Scheduled Blocks
CREATE POLICY "blocks_select" ON scheduled_blocks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "blocks_insert" ON scheduled_blocks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "blocks_update" ON scheduled_blocks FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "blocks_delete" ON scheduled_blocks FOR DELETE USING (user_id = auth.uid());

-- Push Subscriptions
CREATE POLICY "push_select" ON push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push_insert" ON push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_delete" ON push_subscriptions FOR DELETE USING (user_id = auth.uid());

-- Server-side crons use service role so no extra policies needed for them.
