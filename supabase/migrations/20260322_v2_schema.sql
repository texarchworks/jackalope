-- ============================================================
-- Jackalope V2 Schema Migration
-- Date: 2026-03-22
-- Execution order per jackalope-v2-migration-spec.md
-- ============================================================

BEGIN;

-- ============================================================
-- PART 1: NEW ENUMS
-- ============================================================

CREATE TYPE readiness_state AS ENUM (
  'not_started',
  'in_progress',
  'phase_ready'
);

CREATE TYPE discipline AS ENUM (
  'architectural',
  'structural',
  'mep',
  'civil',
  'landscape',
  'interior'
);

CREATE TYPE decision_type AS ENUM (
  'client_approval',
  'agency_review',
  'internal_direction',
  'scope_change'
);

CREATE TYPE activity_type AS ENUM (
  'action',
  'log',
  'exchange'
);

-- ============================================================
-- PART 2: NEW TABLES
-- ============================================================

-- 2a. decisions
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  decision_type decision_type NOT NULL,
  outcome TEXT,
  presented_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_decisions_project ON decisions(project_id);
CREATE INDEX idx_decisions_pending ON decisions(project_id) WHERE decided_at IS NULL;

-- 2b. decision_deliverables (junction)
CREATE TABLE decision_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  impact TEXT,
  UNIQUE(decision_id, task_id)
);

CREATE INDEX idx_decision_deliverables_task ON decision_deliverables(task_id);

-- 2c. building_drawing_sets (junction — FK added after sub_locations rename)
CREATE TABLE building_drawing_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL,
  drawing_set_id UUID NOT NULL REFERENCES drawing_sets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(building_id, drawing_set_id)
);

CREATE INDEX idx_bds_building ON building_drawing_sets(building_id);
CREATE INDEX idx_bds_drawing_set ON building_drawing_sets(drawing_set_id);

-- 2d. activity_log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  action_kind TEXT,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_project ON activity_log(project_id);
CREATE INDEX idx_activity_log_task ON activity_log(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_activity_log_type ON activity_log(project_id, activity_type);

-- ============================================================
-- PART 3a: ADD NEW COLUMNS TO EXISTING TABLES
-- (old columns still present — needed for data migration)
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN readiness_state readiness_state NOT NULL DEFAULT 'not_started';

ALTER TABLE tasks
  ADD COLUMN is_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN blocked_reason TEXT,
  ADD COLUMN blocked_by TEXT;

ALTER TABLE tasks
  ADD COLUMN discipline discipline;

-- ============================================================
-- PART 4: DATA MIGRATION
-- (requires both old + new columns to coexist)
-- ============================================================

-- 4a. Migrate task status → readiness_state
UPDATE tasks SET readiness_state = CASE
  WHEN status = 'open' THEN 'not_started'::readiness_state
  WHEN status = 'in_progress' THEN 'in_progress'::readiness_state
  WHEN status = 'internal_review' THEN 'in_progress'::readiness_state
  WHEN status = 'external_review' THEN 'in_progress'::readiness_state
  WHEN status = 'blocked' THEN 'in_progress'::readiness_state
  WHEN status = 'resolved' THEN 'phase_ready'::readiness_state
  ELSE 'not_started'::readiness_state
END;

UPDATE tasks SET is_blocked = true WHERE status = 'blocked';

-- 4b. Migrate review timestamps → activity_log
INSERT INTO activity_log (project_id, task_id, activity_type, action_kind, actor_id, created_at)
SELECT project_id, id, 'action'::activity_type, 'submit_review',
       submitted_for_review_by, submitted_for_review_at
FROM tasks
WHERE submitted_for_review_by IS NOT NULL;

INSERT INTO activity_log (project_id, task_id, activity_type, action_kind, actor_id, created_at)
SELECT project_id, id, 'action'::activity_type, 'mark_ready',
       resolved_by, resolved_at
FROM tasks
WHERE resolved_by IS NOT NULL;

INSERT INTO activity_log (project_id, task_id, activity_type, action_kind, actor_id, created_at)
SELECT project_id, id, 'action'::activity_type, 'return_to_progress',
       rejected_by, rejected_at
FROM tasks
WHERE rejected_by IS NOT NULL;

-- ============================================================
-- PART 3b: DROP DEPRECATED COLUMNS
-- (data has been migrated — safe to drop)
-- Drop view first — it depends on tasks.* including status
-- ============================================================

DROP VIEW IF EXISTS tasks_with_phase;

ALTER TABLE tasks DROP COLUMN status;

ALTER TABLE tasks
  DROP COLUMN submitted_for_review_by,
  DROP COLUMN submitted_for_review_at,
  DROP COLUMN resolved_by,
  DROP COLUMN resolved_at,
  DROP COLUMN rejected_by,
  DROP COLUMN rejected_at;

ALTER TABLE tasks DROP COLUMN drawing_set_item_id;

-- ============================================================
-- PART 3c: RENAME locations → zones
-- ============================================================

ALTER TABLE locations RENAME TO zones;
ALTER INDEX IF EXISTS idx_locations_project RENAME TO idx_zones_project;

-- ============================================================
-- PART 3d: RENAME sub_locations → buildings + add columns
-- ============================================================

ALTER TABLE sub_locations RENAME TO buildings;
ALTER TABLE buildings RENAME COLUMN location_id TO zone_id;

ALTER TABLE buildings
  ADD COLUMN building_type TEXT,
  ADD COLUMN status TEXT DEFAULT 'active',
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE building_drawing_sets
  ADD CONSTRAINT fk_bds_building
  FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE;

-- ============================================================
-- PART 3e: RENAME task location columns
-- ============================================================

ALTER TABLE tasks RENAME COLUMN location_code TO zone_code;
ALTER TABLE tasks RENAME COLUMN sub_location_code TO building_code;

-- ============================================================
-- PART 3f: drawing_sets — add phase + discipline
-- ============================================================

ALTER TABLE drawing_sets
  ADD COLUMN phase project_phase,
  ADD COLUMN discipline discipline;

-- ============================================================
-- PART 3g: drawing_set_items — replace is_complete with readiness_state
-- ============================================================

ALTER TABLE drawing_set_items
  ADD COLUMN readiness_state readiness_state NOT NULL DEFAULT 'not_started';

-- 4c. Migrate drawing_set_items is_complete → readiness_state
UPDATE drawing_set_items SET readiness_state = CASE
  WHEN is_complete = true THEN 'phase_ready'::readiness_state
  ELSE 'not_started'::readiness_state
END;

ALTER TABLE drawing_set_items DROP COLUMN is_complete;

ALTER TABLE drawing_set_items RENAME COLUMN completed_at TO ready_at;
ALTER TABLE drawing_set_items RENAME COLUMN completed_by TO ready_by;

-- ============================================================
-- PART 5: VIEWS + TRIGGERS
-- ============================================================

-- 5a. Replace tasks_with_phase view (drop first since tasks columns changed)
DROP VIEW IF EXISTS tasks_with_phase;

CREATE OR REPLACE VIEW tasks_with_phase AS
SELECT
  t.*,
  COALESCE(t.phase, p.current_phase) AS effective_phase
FROM tasks t
JOIN projects p ON t.project_id = p.id;

-- 5b. check_task_nesting() — unchanged (references task_type + parent_task_id)
-- 5c. populate_drawing_set_defaults() — unchanged (never set is_complete explicitly)

-- ============================================================
-- PART 6: RLS POLICIES
-- ============================================================

-- decisions
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view decisions"
  ON decisions FOR SELECT
  USING (project_id IN (
    SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid()
  ));

CREATE POLICY "PM+ can manage decisions"
  ON decisions FOR ALL
  USING (
    auth_project_role(project_id) IN ('admin', 'pm')
  );

-- decision_deliverables
ALTER TABLE decision_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view decision links"
  ON decision_deliverables FOR SELECT
  USING (decision_id IN (
    SELECT d.id FROM decisions d
    JOIN project_members pm ON pm.project_id = d.project_id
    WHERE pm.user_id = auth.uid()
  ));

CREATE POLICY "PM+ can manage decision links"
  ON decision_deliverables FOR ALL
  USING (decision_id IN (
    SELECT d.id FROM decisions d
    WHERE auth_project_role(d.project_id) IN ('admin', 'pm')
  ));

-- building_drawing_sets
ALTER TABLE building_drawing_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view building-set links"
  ON building_drawing_sets FOR SELECT
  USING (drawing_set_id IN (
    SELECT ds.id FROM drawing_sets ds
    JOIN project_members pm ON pm.project_id = ds.project_id
    WHERE pm.user_id = auth.uid()
  ));

CREATE POLICY "PM+ can manage building-set links"
  ON building_drawing_sets FOR ALL
  USING (drawing_set_id IN (
    SELECT ds.id FROM drawing_sets ds
    WHERE auth_project_role(ds.project_id) IN ('admin', 'pm')
  ));

-- activity_log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view activity"
  ON activity_log FOR SELECT
  USING (project_id IN (
    SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid()
  ));

CREATE POLICY "Members+ can create activity"
  ON activity_log FOR INSERT
  WITH CHECK (
    auth_project_role(project_id) IN ('admin', 'pm', 'member')
  );

-- buildings (renamed from sub_locations — drop old policies, create new)
DROP POLICY IF EXISTS "sub_locations_select" ON buildings;
DROP POLICY IF EXISTS "sub_locations_insert" ON buildings;
DROP POLICY IF EXISTS "sub_locations_update" ON buildings;
DROP POLICY IF EXISTS "sub_locations_delete" ON buildings;

CREATE POLICY "buildings_select" ON buildings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM zones z
      JOIN project_members pm ON pm.project_id = z.project_id
      WHERE z.id = buildings.zone_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "buildings_insert" ON buildings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM zones z
      WHERE z.id = buildings.zone_id
        AND auth_project_role(z.project_id) IN ('admin', 'pm')
    )
  );

CREATE POLICY "buildings_update" ON buildings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM zones z
      WHERE z.id = buildings.zone_id
        AND auth_project_role(z.project_id) IN ('admin', 'pm')
    )
  );

CREATE POLICY "buildings_delete" ON buildings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM zones z
      WHERE z.id = buildings.zone_id
        AND auth_project_role(z.project_id) IN ('admin', 'pm')
    )
  );

-- zones (renamed from locations — drop old policies, create new)
DROP POLICY IF EXISTS "locations_select" ON zones;
DROP POLICY IF EXISTS "locations_insert" ON zones;
DROP POLICY IF EXISTS "locations_update" ON zones;
DROP POLICY IF EXISTS "locations_delete" ON zones;

CREATE POLICY "zones_select" ON zones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = zones.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "zones_insert" ON zones FOR INSERT
  WITH CHECK (auth_project_role(project_id) IN ('admin', 'pm'));

CREATE POLICY "zones_update" ON zones FOR UPDATE
  USING (auth_project_role(project_id) IN ('admin', 'pm'));

CREATE POLICY "zones_delete" ON zones FOR DELETE
  USING (auth_project_role(project_id) IN ('admin', 'pm'));

COMMIT;
