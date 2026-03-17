-- ============================================================
-- ENTITIES V2 MIGRATION — ADDITIVE ONLY
-- ============================================================
-- project_phase enum already exists from 20260315120000_add_task_types.sql
-- current_phase column already exists on projects table

-- 1. ENTITIES TABLE
-- ============================================================
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL DEFAULT 'building',
  name TEXT NOT NULL,
  phase project_phase,
  metadata JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entities_project ON entities(project_id);
CREATE INDEX idx_entities_parent ON entities(parent_entity_id);
CREATE INDEX idx_entities_type ON entities(project_id, entity_type);


-- 2. DRAWING SET ITEMS TABLE
-- ============================================================
CREATE TABLE drawing_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phase project_phase NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dsi_project ON drawing_set_items(project_id);
CREATE INDEX idx_dsi_entity ON drawing_set_items(entity_id);
CREATE INDEX idx_dsi_phase ON drawing_set_items(project_id, entity_id, phase);


-- 3. ADD COLUMNS TO TASKS (additive — nullable, no default changes)
-- ============================================================
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS drawing_set_item_id UUID REFERENCES drawing_set_items(id) ON DELETE SET NULL;


-- 4. AUTO-POPULATE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION populate_entity_drawing_set()
RETURNS TRIGGER AS $$
BEGIN

  IF NEW.entity_type = 'building' THEN
    -- SD Phase (6 items)
    INSERT INTO drawing_set_items (project_id, entity_id, name, phase, sort_order) VALUES
      (NEW.project_id, NEW.id, 'Site Analysis', 'SD', 1),
      (NEW.project_id, NEW.id, 'Floor Plans', 'SD', 2),
      (NEW.project_id, NEW.id, 'Building Sections', 'SD', 3),
      (NEW.project_id, NEW.id, 'Exterior Elevations', 'SD', 4),
      (NEW.project_id, NEW.id, 'Massing Model / 3D Views', 'SD', 5),
      (NEW.project_id, NEW.id, 'Preliminary Specifications', 'SD', 6);

    -- DD Phase (8 items)
    INSERT INTO drawing_set_items (project_id, entity_id, name, phase, sort_order) VALUES
      (NEW.project_id, NEW.id, 'Refined Floor Plans', 'DD', 1),
      (NEW.project_id, NEW.id, 'Wall Sections', 'DD', 2),
      (NEW.project_id, NEW.id, 'Interior Elevations', 'DD', 3),
      (NEW.project_id, NEW.id, 'Door / Window Schedule', 'DD', 4),
      (NEW.project_id, NEW.id, 'Material Selections', 'DD', 5),
      (NEW.project_id, NEW.id, 'Structural Coordination', 'DD', 6),
      (NEW.project_id, NEW.id, 'MEP Coordination', 'DD', 7),
      (NEW.project_id, NEW.id, 'Code Review', 'DD', 8);

    -- CD Phase (20 items)
    INSERT INTO drawing_set_items (project_id, entity_id, name, phase, sort_order) VALUES
      (NEW.project_id, NEW.id, 'Cover Sheet', 'CD', 1),
      (NEW.project_id, NEW.id, 'Drawing Index', 'CD', 2),
      (NEW.project_id, NEW.id, 'Site Plan', 'CD', 3),
      (NEW.project_id, NEW.id, 'Demolition Plans', 'CD', 4),
      (NEW.project_id, NEW.id, 'Foundation Plans', 'CD', 5),
      (NEW.project_id, NEW.id, 'Floor Plans', 'CD', 6),
      (NEW.project_id, NEW.id, 'Roof Plan', 'CD', 7),
      (NEW.project_id, NEW.id, 'Reflected Ceiling Plans', 'CD', 8),
      (NEW.project_id, NEW.id, 'Exterior Elevations', 'CD', 9),
      (NEW.project_id, NEW.id, 'Building Sections', 'CD', 10),
      (NEW.project_id, NEW.id, 'Wall Sections', 'CD', 11),
      (NEW.project_id, NEW.id, 'Interior Elevations', 'CD', 12),
      (NEW.project_id, NEW.id, 'Door Schedule', 'CD', 13),
      (NEW.project_id, NEW.id, 'Window Schedule', 'CD', 14),
      (NEW.project_id, NEW.id, 'Finish Schedule', 'CD', 15),
      (NEW.project_id, NEW.id, 'Stair / Elevator Details', 'CD', 16),
      (NEW.project_id, NEW.id, 'Structural Plans', 'CD', 17),
      (NEW.project_id, NEW.id, 'MEP Plans', 'CD', 18),
      (NEW.project_id, NEW.id, 'Landscape Plan', 'CD', 19),
      (NEW.project_id, NEW.id, 'Specifications', 'CD', 20);

  ELSIF NEW.entity_type = 'zone' THEN
    -- SD Phase (4 items)
    INSERT INTO drawing_set_items (project_id, entity_id, name, phase, sort_order) VALUES
      (NEW.project_id, NEW.id, 'Preliminary Site Plan', 'SD', 1),
      (NEW.project_id, NEW.id, 'Preliminary Grading Plan', 'SD', 2),
      (NEW.project_id, NEW.id, 'Preliminary Utility Plan', 'SD', 3),
      (NEW.project_id, NEW.id, 'Preliminary Landscape Plan', 'SD', 4);

    -- DD Phase (4 items)
    INSERT INTO drawing_set_items (project_id, entity_id, name, phase, sort_order) VALUES
      (NEW.project_id, NEW.id, 'Site Plan', 'DD', 1),
      (NEW.project_id, NEW.id, 'Grading / Drainage Plan', 'DD', 2),
      (NEW.project_id, NEW.id, 'Utility Plan', 'DD', 3),
      (NEW.project_id, NEW.id, 'Landscape Plan', 'DD', 4);

    -- CD Phase (4 items)
    INSERT INTO drawing_set_items (project_id, entity_id, name, phase, sort_order) VALUES
      (NEW.project_id, NEW.id, 'Final Site / Civil Plans', 'CD', 1),
      (NEW.project_id, NEW.id, 'Stormwater Management Plan', 'CD', 2),
      (NEW.project_id, NEW.id, 'Final Utility Plans', 'CD', 3),
      (NEW.project_id, NEW.id, 'Final Landscape / Irrigation Plans', 'CD', 4);

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_populate_entity_drawing_set
  AFTER INSERT ON entities
  FOR EACH ROW
  EXECUTE FUNCTION populate_entity_drawing_set();


-- 5. RLS POLICIES
-- ============================================================

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_set_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view entities"
  ON entities FOR SELECT
  USING (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin and PM can manage entities"
  ON entities FOR ALL
  USING (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'pm')
    )
  );

CREATE POLICY "Project members can view drawing set items"
  ON drawing_set_items FOR SELECT
  USING (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update drawing set items"
  ON drawing_set_items FOR UPDATE
  USING (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin and PM can manage drawing set items"
  ON drawing_set_items FOR ALL
  USING (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'pm')
    )
  );


-- 6. HELPER VIEW: Entity with progress stats
-- ============================================================

CREATE OR REPLACE VIEW entities_with_progress AS
SELECT
  e.*,
  COALESCE(e.phase, p.current_phase) AS effective_phase,
  COUNT(dsi.id) AS total_items,
  COUNT(dsi.id) FILTER (WHERE dsi.is_complete) AS completed_items,
  COUNT(t.id) FILTER (WHERE t.status != 'done') AS open_tasks
FROM entities e
JOIN projects p ON e.project_id = p.id
LEFT JOIN drawing_set_items dsi ON dsi.entity_id = e.id
LEFT JOIN tasks t ON t.entity_id = e.id
GROUP BY e.id, p.current_phase;
