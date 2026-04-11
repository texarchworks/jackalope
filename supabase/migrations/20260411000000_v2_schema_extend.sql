-- ============================================================
-- Jackalope V2 Schema Extension
-- Date: 2026-04-11
-- Strategy: extend & rewire — no columns or tables removed
-- Re-runnable: all statements guarded with IF NOT EXISTS / EXCEPTION
-- ============================================================

-- ----------------------------------------------------------------
-- ENUMS — must run outside transaction (ADD VALUE cannot be in txn)
-- ----------------------------------------------------------------

-- readiness_state
DO $$ BEGIN
  CREATE TYPE readiness_state AS ENUM ('not_started', 'in_progress', 'phase_ready');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- discipline (base creation)
DO $$ BEGIN
  CREATE TYPE discipline AS ENUM (
    'architecture', 'structural', 'mechanical', 'electrical',
    'plumbing', 'fire_protection', 'civil', 'landscape',
    'interior', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend discipline with any values the existing enum may lack
ALTER TYPE discipline ADD VALUE IF NOT EXISTS 'architecture';
ALTER TYPE discipline ADD VALUE IF NOT EXISTS 'structural';
ALTER TYPE discipline ADD VALUE IF NOT EXISTS 'mechanical';
ALTER TYPE discipline ADD VALUE IF NOT EXISTS 'electrical';
ALTER TYPE discipline ADD VALUE IF NOT EXISTS 'plumbing';
ALTER TYPE discipline ADD VALUE IF NOT EXISTS 'fire_protection';
ALTER TYPE discipline ADD VALUE IF NOT EXISTS 'civil';
ALTER TYPE discipline ADD VALUE IF NOT EXISTS 'landscape';
ALTER TYPE discipline ADD VALUE IF NOT EXISTS 'interior';
ALTER TYPE discipline ADD VALUE IF NOT EXISTS 'other';

-- ----------------------------------------------------------------
-- TRANSACTIONAL BODY
-- ----------------------------------------------------------------
BEGIN;

-- ============================================================
-- 1. readiness_state column on tasks
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS
  readiness_state readiness_state NOT NULL DEFAULT 'not_started';

-- ============================================================
-- 2. discipline column on tasks
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS discipline discipline;

-- ============================================================
-- 3. Blocked columns on tasks
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_blocked     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_reason  TEXT;

-- ============================================================
-- 4. Deferred columns on tasks
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_deferred   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS revisit_date   DATE;

-- ============================================================
-- 5. decisions table
-- ============================================================

CREATE TABLE IF NOT EXISTS decisions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL,
  outcome       TEXT,
  presented_at  TIMESTAMPTZ,
  decided_at    TIMESTAMPTZ,
  decided_by    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If table already existed with different shape, add any missing columns
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS type       TEXT;
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_type    ON decisions(type);

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decisions_updated_at ON decisions;
CREATE TRIGGER trg_decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 6. relationships table
-- ============================================================

CREATE TABLE IF NOT EXISTS relationships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type         TEXT NOT NULL,
  from_id           UUID NOT NULL,
  to_type           TEXT NOT NULL,
  to_id             UUID NOT NULL,
  relationship_type TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relationships_from
  ON relationships(from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to
  ON relationships(to_type, to_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type
  ON relationships(relationship_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_relationships_unique
  ON relationships(from_type, from_id, to_type, to_id, relationship_type);

-- ============================================================
-- 7. RLS on new tables (no policies yet)
-- ============================================================

ALTER TABLE decisions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

COMMIT;
