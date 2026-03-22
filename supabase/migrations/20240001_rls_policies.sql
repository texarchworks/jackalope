-- ============================================================
-- Jackalope RLS Policies
-- ============================================================

-- Helper functions (security definer so they run with elevated privileges)

CREATE OR REPLACE FUNCTION auth_is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION auth_org_role(p_org_id uuid)
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT org_role FROM org_members
  WHERE org_id = p_org_id
    AND user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_project_role(p_project_id uuid)
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT role FROM project_members
  WHERE project_id = p_project_id
    AND user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- organizations
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select" ON organizations FOR SELECT
  USING (auth_is_org_member(id));

CREATE POLICY "org_update" ON organizations FOR UPDATE
  USING (auth_org_role(id) = 'admin');

-- ============================================================
-- profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_select_org" ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members om1
      JOIN org_members om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = auth.uid()
        AND om2.user_id = profiles.id
        AND om1.org_id IS NOT NULL
    )
  );

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- org_members
-- ============================================================
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select" ON org_members FOR SELECT
  USING (auth_is_org_member(org_id));

CREATE POLICY "org_members_insert" ON org_members FOR INSERT
  WITH CHECK (auth_org_role(org_id) IN ('admin', 'owner'));

CREATE POLICY "org_members_update" ON org_members FOR UPDATE
  USING (auth_org_role(org_id) IN ('admin', 'owner'));

CREATE POLICY "org_members_delete" ON org_members FOR DELETE
  USING (auth_org_role(org_id) IN ('admin', 'owner'));

-- ============================================================
-- projects
-- ============================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select" ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "projects_insert" ON projects FOR INSERT
  WITH CHECK (
    -- org admins or PMs can create projects
    EXISTS (
      SELECT 1 FROM org_members
      WHERE user_id = auth.uid()
        AND org_role IN ('admin', 'owner', 'pm', 'member')
    )
  );

CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (auth_project_role(id) IN ('admin', 'pm'));

CREATE POLICY "projects_delete" ON projects FOR DELETE
  USING (auth_project_role(id) = 'admin');

-- ============================================================
-- project_members
-- ============================================================
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_members_select" ON project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "project_members_insert" ON project_members FOR INSERT
  WITH CHECK (
    auth_project_role(project_id) IN ('admin', 'pm')
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "project_members_update" ON project_members FOR UPDATE
  USING (auth_project_role(project_id) IN ('admin', 'pm'));

CREATE POLICY "project_members_delete" ON project_members FOR DELETE
  USING (auth_project_role(project_id) IN ('admin', 'pm'));

-- ============================================================
-- tasks
-- ============================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_insert" ON tasks FOR INSERT
  WITH CHECK (
    auth_project_role(project_id) IN ('admin', 'pm', 'member')
  );

CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (
    auth_project_role(project_id) IN ('admin', 'pm', 'member')
  );

CREATE POLICY "tasks_delete" ON tasks FOR DELETE
  USING (
    -- Only PM+ can delete, or org admin override via projects table
    auth_project_role(project_id) IN ('admin', 'pm')
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN org_members om ON om.org_id = p.organization_id
      WHERE p.id = tasks.project_id
        AND om.user_id = auth.uid()
        AND om.org_role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- categories
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = categories.project_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "categories_insert" ON categories FOR INSERT
  WITH CHECK (auth_project_role(project_id) IN ('admin', 'pm'));

CREATE POLICY "categories_update" ON categories FOR UPDATE
  USING (auth_project_role(project_id) IN ('admin', 'pm'));

CREATE POLICY "categories_delete" ON categories FOR DELETE
  USING (auth_project_role(project_id) IN ('admin', 'pm'));

-- ============================================================
-- locations
-- ============================================================
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_select" ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = locations.project_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "locations_insert" ON locations FOR INSERT
  WITH CHECK (auth_project_role(project_id) IN ('admin', 'pm'));

CREATE POLICY "locations_update" ON locations FOR UPDATE
  USING (auth_project_role(project_id) IN ('admin', 'pm'));

CREATE POLICY "locations_delete" ON locations FOR DELETE
  USING (auth_project_role(project_id) IN ('admin', 'pm'));

-- ============================================================
-- sub_locations
-- ============================================================
ALTER TABLE sub_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_locations_select" ON sub_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM locations l
      JOIN project_members pm ON pm.project_id = l.project_id
      WHERE l.id = sub_locations.location_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "sub_locations_insert" ON sub_locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM locations l
      WHERE l.id = sub_locations.location_id
        AND auth_project_role(l.project_id) IN ('admin', 'pm')
    )
  );

CREATE POLICY "sub_locations_update" ON sub_locations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM locations l
      WHERE l.id = sub_locations.location_id
        AND auth_project_role(l.project_id) IN ('admin', 'pm')
    )
  );

CREATE POLICY "sub_locations_delete" ON sub_locations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM locations l
      WHERE l.id = sub_locations.location_id
        AND auth_project_role(l.project_id) IN ('admin', 'pm')
    )
  );
