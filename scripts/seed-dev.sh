#!/bin/bash
# seed-dev.sh — Reset local Supabase and seed test data
# DEVELOPMENT ONLY

set -e

# Production guard
if [[ "$SUPABASE_URL" == *"supabase.co"* ]]; then
  echo "ERROR: SUPABASE_URL points to a production instance (supabase.co)."
  echo "This script is for local development only. Aborting."
  exit 1
fi

echo "=== Resetting local Supabase database ==="
npx supabase db reset

echo ""
echo "=== Applying test user seed ==="
npx supabase db query --file supabase/seed/test_users.sql

echo ""
echo "=== Seed complete ==="
echo ""
echo "┌────────────────────────────────┬──────────────┬────────────────┐"
echo "│ Email                          │ Org Role     │ Project Role   │"
echo "├────────────────────────────────┼──────────────┼────────────────┤"
echo "│ admin@texarchworks.com         │ admin        │ admin          │"
echo "│ pm@texarchworks.com            │ member       │ pm             │"
echo "│ member@texarchworks.com        │ member       │ member         │"
echo "│ viewer@texarchworks.com        │ member       │ viewer         │"
echo "└────────────────────────────────┴──────────────┴────────────────┘"
echo ""
echo "Password for all: Jackalope2024!"
echo "Login at: http://localhost:3000"
