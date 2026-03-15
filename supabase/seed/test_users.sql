-- DEVELOPMENT ONLY — do not run in production
-- Idempotent: safe to re-run
-- Login at http://localhost:3000 with any of the four emails below
-- Password for all: Jackalope2024!
--
-- admin@texarchworks.com   → org admin, project admin
-- pm@texarchworks.com      → org member, project pm
-- member@texarchworks.com  → org member, project member
-- viewer@texarchworks.com  → org member, project viewer

-- ============================================================
-- 1. Test Organization
-- ============================================================
INSERT INTO organizations (id, name, domain)
VALUES ('00000000-0000-0000-0000-000000000010', 'TexArchWorks Dev', 'texarchworks.com')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Auth Users (Supabase auth schema)
-- ============================================================
DO $$ BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
  ) VALUES
    (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'admin@texarchworks.com',
      crypt('Jackalope2024!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Dev Admin"}'::jsonb,
      'authenticated', 'authenticated', now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000000',
      'pm@texarchworks.com',
      crypt('Jackalope2024!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Dev PM"}'::jsonb,
      'authenticated', 'authenticated', now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000000',
      'member@texarchworks.com',
      crypt('Jackalope2024!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Dev Member"}'::jsonb,
      'authenticated', 'authenticated', now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000000',
      'viewer@texarchworks.com',
      crypt('Jackalope2024!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Dev Viewer"}'::jsonb,
      'authenticated', 'authenticated', now(), now()
    )
  ON CONFLICT (id) DO NOTHING;

  -- Also insert identities for email/password login
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@texarchworks.com"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000001', now(), now(), now()),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '{"sub":"00000000-0000-0000-0000-000000000002","email":"pm@texarchworks.com"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000002', now(), now(), now()),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '{"sub":"00000000-0000-0000-0000-000000000003","email":"member@texarchworks.com"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000003', now(), now(), now()),
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '{"sub":"00000000-0000-0000-0000-000000000004","email":"viewer@texarchworks.com"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000004', now(), now(), now())
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'Auth users already exist, skipping';
END $$;

-- ============================================================
-- 3. Profiles
-- ============================================================
INSERT INTO profiles (id, name, email, role, color, is_external)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dev Admin', 'admin@texarchworks.com', 'Principal Architect', '#E03E3E', false),
  ('00000000-0000-0000-0000-000000000002', 'Dev PM', 'pm@texarchworks.com', 'Project Director', '#2F80ED', false),
  ('00000000-0000-0000-0000-000000000003', 'Dev Member', 'member@texarchworks.com', 'Designer II', '#0F7B6C', false),
  ('00000000-0000-0000-0000-000000000004', 'Dev Viewer', 'viewer@texarchworks.com', 'Intern', '#CA8A04', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. Org Members
-- ============================================================
INSERT INTO org_members (org_id, user_id, org_role, status, joined_at)
VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'admin', 'active', now()),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'member', 'active', now()),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000003', 'member', 'active', now()),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000004', 'member', 'active', now())
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ============================================================
-- 5. Test Projects
-- ============================================================
INSERT INTO projects (id, name, subtitle, icon, color, location, loc_label, sub_label, created_by, organization_id)
VALUES
  ('00000000-0000-0000-0000-000000000020', 'Downtown Renovation', 'Historic District Revamp · 3 Zones', 'DR', '#E03E3E', 'Austin, TX', 'Zone', 'Building', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000021', 'Site Assessment Q2', 'Environmental & structural survey', 'SA', '#2F80ED', 'San Antonio, TX', 'Area', 'Section', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. Project Members (all four users on both projects)
-- ============================================================
INSERT INTO project_members (project_id, user_id, role)
VALUES
  -- Downtown Renovation
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', 'pm'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000003', 'member'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000004', 'viewer'),
  -- Site Assessment Q2
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'pm'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000003', 'member'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000004', 'viewer')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6b. Default categories for test projects
-- ============================================================
INSERT INTO categories (project_id, name, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000020', 'Design', 0),
  ('00000000-0000-0000-0000-000000000020', 'Structural', 1),
  ('00000000-0000-0000-0000-000000000020', 'MEP', 2),
  ('00000000-0000-0000-0000-000000000020', 'Permitting', 3),
  ('00000000-0000-0000-0000-000000000021', 'Design', 0),
  ('00000000-0000-0000-0000-000000000021', 'Structural', 1)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6c. Locations for Downtown Renovation
-- ============================================================
INSERT INTO locations (id, project_id, code, name, color, accent, description, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000020', 'Z1', 'North Wing', '#E03E3E', '#E03E3E99', 'Historic facade section', 0),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000020', 'Z2', 'South Wing', '#2F80ED', '#2F80ED99', 'Modern addition', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO sub_locations (id, location_id, code, name, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000030', 'Z1-A', 'Lobby', 0),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000030', 'Z1-B', 'Conference Hall', 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. Tasks for Downtown Renovation (2 parents + 2 subs each)
-- ============================================================

-- Parent task 1: assigned to PM
INSERT INTO tasks (id, project_id, title, status, priority, assignee_id, category, location_code, sub_location_code, notes, created_by, source)
VALUES (
  '00000000-0000-0000-0000-000000000050',
  '00000000-0000-0000-0000-000000000020',
  'Structural assessment of North Wing facade',
  'in_progress', 'high',
  '00000000-0000-0000-0000-000000000002',
  'Structural', 'Z1', 'Z1-A',
  'Need engineer sign-off before demo',
  '00000000-0000-0000-0000-000000000002',
  'manual'
) ON CONFLICT (id) DO NOTHING;

-- Sub-task 1a
INSERT INTO tasks (id, project_id, title, status, priority, assignee_id, category, location_code, parent_task_id, created_by, source)
VALUES (
  '00000000-0000-0000-0000-000000000051',
  '00000000-0000-0000-0000-000000000020',
  'Core sample analysis',
  'open', 'medium',
  '00000000-0000-0000-0000-000000000003',
  'Structural', 'Z1',
  '00000000-0000-0000-0000-000000000050',
  '00000000-0000-0000-0000-000000000002',
  'manual'
) ON CONFLICT (id) DO NOTHING;

-- Sub-task 1b
INSERT INTO tasks (id, project_id, title, status, priority, assignee_id, location_code, parent_task_id, created_by, source)
VALUES (
  '00000000-0000-0000-0000-000000000052',
  '00000000-0000-0000-0000-000000000020',
  'Load-bearing wall identification',
  'resolved', 'medium',
  '00000000-0000-0000-0000-000000000002',
  'Z1',
  '00000000-0000-0000-0000-000000000050',
  '00000000-0000-0000-0000-000000000002',
  'manual'
) ON CONFLICT (id) DO NOTHING;

-- Parent task 2: assigned to member
INSERT INTO tasks (id, project_id, title, status, priority, assignee_id, category, location_code, notes, created_by, source)
VALUES (
  '00000000-0000-0000-0000-000000000053',
  '00000000-0000-0000-0000-000000000020',
  'Design concept for South Wing lobby',
  'open', 'critical',
  '00000000-0000-0000-0000-000000000003',
  'Design', 'Z2',
  'Client wants modern aesthetic blending with historic elements',
  '00000000-0000-0000-0000-000000000002',
  'manual'
) ON CONFLICT (id) DO NOTHING;

-- Sub-task 2a
INSERT INTO tasks (id, project_id, title, status, priority, assignee_id, location_code, parent_task_id, created_by, source)
VALUES (
  '00000000-0000-0000-0000-000000000054',
  '00000000-0000-0000-0000-000000000020',
  'Material palette selection',
  'in_progress', 'high',
  '00000000-0000-0000-0000-000000000003',
  'Z2',
  '00000000-0000-0000-0000-000000000053',
  '00000000-0000-0000-0000-000000000002',
  'manual'
) ON CONFLICT (id) DO NOTHING;

-- Sub-task 2b: unassigned
INSERT INTO tasks (id, project_id, title, status, priority, location_code, parent_task_id, created_by, source)
VALUES (
  '00000000-0000-0000-0000-000000000055',
  '00000000-0000-0000-0000-000000000020',
  'Lighting layout draft',
  'open', 'low',
  'Z2',
  '00000000-0000-0000-0000-000000000053',
  '00000000-0000-0000-0000-000000000002',
  'manual'
) ON CONFLICT (id) DO NOTHING;
