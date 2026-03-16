-- 1. ENUMS
CREATE TYPE task_type AS ENUM (
  'drawing_set',
  'milestone',
  'task',
  'checklist_item'
);

CREATE TYPE project_phase AS ENUM (
  'SD',
  'DD',
  'CD',
  'CA',
  'Permit'
);


-- 2. TASK TEMPLATES TABLE (must exist before tasks references it)
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  task_type task_type NOT NULL,
  phase project_phase,
  deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  discipline TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_templates_org ON task_templates(org_id) WHERE is_active = true;


-- 3. ALTER TASKS TABLE
ALTER TABLE tasks
  ADD COLUMN task_type task_type NOT NULL DEFAULT 'task';

ALTER TABLE tasks
  ADD COLUMN phase project_phase;

ALTER TABLE tasks
  ADD COLUMN template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL;


-- 4. ALTER PROJECTS TABLE
ALTER TABLE projects
  ADD COLUMN current_phase project_phase NOT NULL DEFAULT 'SD';


-- 5. NESTING CONSTRAINTS
CREATE OR REPLACE FUNCTION check_task_nesting() RETURNS TRIGGER AS $$
DECLARE
  parent_type task_type;
BEGIN
  IF NEW.task_type = 'drawing_set' AND NEW.parent_task_id IS NOT NULL THEN
    RAISE EXCEPTION 'drawing_set must be a top-level task (no parent)';
  END IF;

  IF NEW.parent_task_id IS NOT NULL THEN
    SELECT t.task_type INTO parent_type
    FROM tasks t
    WHERE t.id = NEW.parent_task_id;

    IF parent_type = 'milestone' THEN
      RAISE EXCEPTION 'milestone tasks cannot have children';
    END IF;

    IF parent_type = 'checklist_item' THEN
      RAISE EXCEPTION 'checklist_item tasks cannot have children';
    END IF;

    IF parent_type = 'task' AND NEW.task_type != 'checklist_item' THEN
      RAISE EXCEPTION 'task can only contain checklist_item children';
    END IF;

    IF parent_type = 'drawing_set' AND NEW.task_type NOT IN ('task', 'checklist_item') THEN
      RAISE EXCEPTION 'drawing_set can only contain task or checklist_item children';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_task_nesting
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION check_task_nesting();


-- 6. PHASE INHERITANCE VIEW
CREATE OR REPLACE VIEW tasks_with_phase AS
SELECT
  t.*,
  COALESCE(t.phase, p.current_phase) AS effective_phase
FROM tasks t
JOIN projects p ON t.project_id = p.id;


-- 7. RLS FOR task_templates
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view templates"
  ON task_templates FOR SELECT
  USING (
    org_id IS NULL
    OR org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin and PM can manage templates"
  ON task_templates FOR ALL
  USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid()
      AND om.org_role IN ('admin', 'pm')
    )
  );


-- 8. SEED TEMPLATES
INSERT INTO task_templates (name, task_type, phase, discipline, deliverables, sort_order) VALUES
('Schematic Design Package', 'drawing_set', 'SD', 'Architectural', '[
  {"name": "Site Analysis", "task_type": "task", "children": [
    {"name": "Zoning review", "task_type": "checklist_item"},
    {"name": "Setback verification", "task_type": "checklist_item"},
    {"name": "Site survey review", "task_type": "checklist_item"}
  ]},
  {"name": "Floor Plans", "task_type": "task", "children": [
    {"name": "Ground floor plan", "task_type": "checklist_item"},
    {"name": "Upper floor plans", "task_type": "checklist_item"}
  ]},
  {"name": "Building Sections", "task_type": "task"},
  {"name": "Exterior Elevations", "task_type": "task"},
  {"name": "Massing Model / 3D Views", "task_type": "task"},
  {"name": "Preliminary Specifications", "task_type": "task"}
]'::jsonb, 1),
('Construction Documents - Structural', 'drawing_set', 'CD', 'Structural', '[
  {"name": "Foundation Plans", "task_type": "task", "children": [
    {"name": "Sheet S1.1 - Foundation Plan", "task_type": "checklist_item"},
    {"name": "Sheet S1.2 - Foundation Details", "task_type": "checklist_item"}
  ]},
  {"name": "Framing Plans", "task_type": "task", "children": [
    {"name": "Sheet S2.1 - Floor Framing", "task_type": "checklist_item"},
    {"name": "Sheet S2.2 - Roof Framing", "task_type": "checklist_item"}
  ]},
  {"name": "Structural Details", "task_type": "task"},
  {"name": "Structural Calculations", "task_type": "task"},
  {"name": "Structural Specifications", "task_type": "task"}
]'::jsonb, 2),
('Permit Submission', 'milestone', 'Permit', NULL, '[
  {"name": "Permit application form", "task_type": "checklist_item"},
  {"name": "Drawing set assembled", "task_type": "checklist_item"},
  {"name": "Energy compliance docs", "task_type": "checklist_item"},
  {"name": "Fee payment", "task_type": "checklist_item"},
  {"name": "Submission confirmation", "task_type": "checklist_item"}
]'::jsonb, 3);
