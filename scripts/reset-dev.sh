#!/bin/bash
# reset-dev.sh — Remove seeded test data without full db reset
# DEVELOPMENT ONLY

set -e

# Production guard
if [[ "$SUPABASE_URL" == *"supabase.co"* ]]; then
  echo "ERROR: SUPABASE_URL points to a production instance (supabase.co)."
  echo "This script is for local development only. Aborting."
  exit 1
fi

# Check SEED_ENABLED flag
if [[ "$SEED_ENABLED" != "true" ]]; then
  echo "ERROR: SEED_ENABLED is not set to 'true'."
  echo "Set SEED_ENABLED=true in your .env to allow seed data operations."
  exit 1
fi

echo "=== Removing seeded test data ==="

# Fixed UUIDs from the seed script
USERS="'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004'"
PROJECTS="'00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000021'"
ORG="'00000000-0000-0000-0000-000000000010'"
TASKS="'00000000-0000-0000-0000-000000000050','00000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000052','00000000-0000-0000-0000-000000000053','00000000-0000-0000-0000-000000000054','00000000-0000-0000-0000-000000000055'"
LOCATIONS="'00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000031'"
SUBLOCATIONS="'00000000-0000-0000-0000-000000000040','00000000-0000-0000-0000-000000000041'"

npx supabase db query "
  DELETE FROM tasks WHERE id IN ($TASKS);
  DELETE FROM sub_locations WHERE id IN ($SUBLOCATIONS);
  DELETE FROM locations WHERE id IN ($LOCATIONS);
  DELETE FROM categories WHERE project_id IN ($PROJECTS);
  DELETE FROM project_members WHERE project_id IN ($PROJECTS);
  DELETE FROM projects WHERE id IN ($PROJECTS);
  DELETE FROM org_members WHERE org_id = $ORG AND user_id IN ($USERS);
  DELETE FROM profiles WHERE id IN ($USERS);
  DELETE FROM auth.identities WHERE user_id IN ($USERS);
  DELETE FROM auth.users WHERE id IN ($USERS);
  DELETE FROM organizations WHERE id = $ORG;
"

echo "=== Test data removed ==="
echo "Schema and non-seed data are untouched."
