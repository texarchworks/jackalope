-- Add organization_id column to projects
-- Idempotent: uses IF NOT EXISTS guards
-- Backfills from created_by → org_members.org_id

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS projects_organization_id_idx
  ON projects(organization_id);

-- Backfill existing rows: each project's org is the active org membership
-- of its creator. Production has 17 projects, all from the same org, so
-- this should resolve cleanly for every row.
UPDATE projects p
SET organization_id = om.org_id
FROM org_members om
WHERE p.created_by = om.user_id
  AND om.is_active = true
  AND p.organization_id IS NULL;

-- Verification queries (read-only, for human to inspect after running):
-- SELECT COUNT(*) FILTER (WHERE organization_id IS NULL) AS still_null,
--        COUNT(*) FILTER (WHERE organization_id IS NOT NULL) AS has_org,
--        COUNT(*) AS total
-- FROM projects;
