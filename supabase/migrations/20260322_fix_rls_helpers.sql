-- ============================================================
-- Fix RLS helper functions — wrong column names
-- Fix project_members insert policy — chicken-and-egg on create
-- ============================================================

-- auth_org_role referenced "role" and "status" but actual columns
-- are "org_role" and "is_active" (boolean)
CREATE OR REPLACE FUNCTION auth_org_role(p_org_id uuid)
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT org_role FROM org_members
  WHERE org_id = p_org_id
    AND user_id = auth.uid()
    AND is_active IS NOT FALSE
  LIMIT 1;
$$;

-- auth_is_org_member had same issue
CREATE OR REPLACE FUNCTION auth_is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND is_active IS NOT FALSE
  );
$$;

-- project_members_insert: allow project creator to add the first member
-- Without this, creating a project then inserting yourself as admin fails
-- because auth_project_role returns null (no rows yet).
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
