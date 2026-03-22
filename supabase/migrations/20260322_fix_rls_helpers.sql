-- ============================================================
-- Fix RLS helper functions + project_members bootstrap
-- (Corrects column names fixed in 20240001 base migration)
-- ============================================================

-- Recreate with correct column names in case base migration
-- was already applied with the old definitions
CREATE OR REPLACE FUNCTION auth_org_role(p_org_id uuid)
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT org_role FROM org_members
  WHERE org_id = p_org_id
    AND user_id = auth.uid()
  LIMIT 1;
$$;

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

-- Allow project creator to bootstrap project_members
DROP POLICY IF EXISTS "project_members_insert" ON project_members;

CREATE POLICY "project_members_insert" ON project_members FOR INSERT
  WITH CHECK (
    auth_project_role(project_id) IN ('admin', 'pm')
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND p.created_by = auth.uid()
    )
  );
