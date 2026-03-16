-- ============================================================
-- DRAWING SETS
-- ============================================================

CREATE TABLE drawing_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Drawing Set',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drawing_sets_project ON drawing_sets(project_id);

-- ============================================================
-- DRAWING SET ITEMS (deliverables, not tasks)
-- ============================================================

CREATE TABLE drawing_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_set_id UUID NOT NULL REFERENCES drawing_sets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phase project_phase NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drawing_set_items_set ON drawing_set_items(drawing_set_id);
CREATE INDEX idx_drawing_set_items_phase ON drawing_set_items(drawing_set_id, phase);

-- ============================================================
-- LINK TASKS TO DRAWING SET ITEMS (optional FK)
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN drawing_set_item_id UUID REFERENCES drawing_set_items(id) ON DELETE SET NULL;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE drawing_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_set_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view drawing sets"
  ON drawing_sets FOR SELECT
  USING (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin and PM can manage drawing sets"
  ON drawing_sets FOR ALL
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
    drawing_set_id IN (
      SELECT ds.id FROM drawing_sets ds
      JOIN project_members pm ON pm.project_id = ds.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update drawing set items"
  ON drawing_set_items FOR UPDATE
  USING (
    drawing_set_id IN (
      SELECT ds.id FROM drawing_sets ds
      JOIN project_members pm ON pm.project_id = ds.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin and PM can manage drawing set items"
  ON drawing_set_items FOR ALL
  USING (
    drawing_set_id IN (
      SELECT ds.id FROM drawing_sets ds
      JOIN project_members pm ON pm.project_id = ds.project_id
      WHERE pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'pm')
    )
  );

-- ============================================================
-- HELPER: Auto-populate default items on drawing set creation
-- ============================================================

CREATE OR REPLACE FUNCTION populate_drawing_set_defaults() RETURNS TRIGGER AS $$
BEGIN
  -- SD Phase (6 items)
  INSERT INTO drawing_set_items (drawing_set_id, name, phase, sort_order) VALUES
    (NEW.id, 'Site Analysis', 'SD', 1),
    (NEW.id, 'Floor Plans', 'SD', 2),
    (NEW.id, 'Building Sections', 'SD', 3),
    (NEW.id, 'Exterior Elevations', 'SD', 4),
    (NEW.id, 'Massing Model / 3D Views', 'SD', 5),
    (NEW.id, 'Preliminary Specifications', 'SD', 6);

  -- DD Phase (8 items)
  INSERT INTO drawing_set_items (drawing_set_id, name, phase, sort_order) VALUES
    (NEW.id, 'Refined Floor Plans', 'DD', 1),
    (NEW.id, 'Wall Sections', 'DD', 2),
    (NEW.id, 'Interior Elevations', 'DD', 3),
    (NEW.id, 'Door / Window Schedule', 'DD', 4),
    (NEW.id, 'Material Selections', 'DD', 5),
    (NEW.id, 'Structural Coordination', 'DD', 6),
    (NEW.id, 'MEP Coordination', 'DD', 7),
    (NEW.id, 'Code Review', 'DD', 8);

  -- CD Phase (20 items)
  INSERT INTO drawing_set_items (drawing_set_id, name, phase, sort_order) VALUES
    (NEW.id, 'Cover Sheet', 'CD', 1),
    (NEW.id, 'Drawing Index', 'CD', 2),
    (NEW.id, 'Site Plan', 'CD', 3),
    (NEW.id, 'Demolition Plans', 'CD', 4),
    (NEW.id, 'Foundation Plans', 'CD', 5),
    (NEW.id, 'Floor Plans', 'CD', 6),
    (NEW.id, 'Roof Plan', 'CD', 7),
    (NEW.id, 'Reflected Ceiling Plans', 'CD', 8),
    (NEW.id, 'Exterior Elevations', 'CD', 9),
    (NEW.id, 'Building Sections', 'CD', 10),
    (NEW.id, 'Wall Sections', 'CD', 11),
    (NEW.id, 'Interior Elevations', 'CD', 12),
    (NEW.id, 'Door Schedule', 'CD', 13),
    (NEW.id, 'Window Schedule', 'CD', 14),
    (NEW.id, 'Finish Schedule', 'CD', 15),
    (NEW.id, 'Stair / Elevator Details', 'CD', 16),
    (NEW.id, 'Structural Plans', 'CD', 17),
    (NEW.id, 'MEP Plans', 'CD', 18),
    (NEW.id, 'Landscape Plan', 'CD', 19),
    (NEW.id, 'Specifications', 'CD', 20);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_populate_drawing_set
  AFTER INSERT ON drawing_sets
  FOR EACH ROW
  EXECUTE FUNCTION populate_drawing_set_defaults();
