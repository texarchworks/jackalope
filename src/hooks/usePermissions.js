"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { can, getAllowedActions } from "@/lib/permissions";

/**
 * Hook to fetch and compute permissions for the current user.
 * @param {{ projectId?: string, organizationId?: string }} opts
 * @returns {{ role: string|null, orgRole: string|null, loading: boolean, canDo: (action: string, context?: object) => boolean, allowedActions: string[] }}
 */
export default function usePermissions({ projectId, organizationId } = {}) {
  const [projectRole, setProjectRole] = useState(null);
  const [orgRole, setOrgRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchRoles() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }

      let resolvedOrgId = organizationId;

      // Fetch project role if projectId provided
      if (projectId) {
        const { data: pm } = await supabase
          .from("project_members")
          .select("role")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .single();
        if (!cancelled) setProjectRole(pm?.role || null);

        // Resolve org_id from the project if not provided
        if (!resolvedOrgId) {
          const { data: proj } = await supabase
            .from("projects")
            .select("organization_id")
            .eq("id", projectId)
            .single();
          resolvedOrgId = proj?.organization_id || null;
        }
      }

      // Fetch org role
      if (resolvedOrgId) {
        const { data: om } = await supabase
          .from("org_members")
          .select("org_role")
          .eq("org_id", resolvedOrgId)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        if (!cancelled) setOrgRole(om?.org_role || null);
      } else {
        // Fallback: project has no organization_id (legacy projects), or no
        // projectId was passed. Look up the user's org membership directly so
        // org owners/admins still get elevated permissions.
        const { data: anyMembership } = await supabase
          .from("org_members")
          .select("org_role")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (!cancelled) setOrgRole(anyMembership?.org_role || null);
      }

      if (!cancelled) setLoading(false);
    }

    fetchRoles();
    return () => { cancelled = true; };
  }, [projectId, organizationId]);

  // Org admin overrides project role
  const effectiveRole = useMemo(() => {
    if (orgRole === "admin" || orgRole === "owner") return "admin";
    return projectRole ?? orgRole;
  }, [projectRole, orgRole]);

  const canDo = useMemo(
    () => (action, context) => can(action, effectiveRole, context),
    [effectiveRole]
  );

  const allowedActions = useMemo(
    () => getAllowedActions(effectiveRole),
    [effectiveRole]
  );

  return { role: effectiveRole, orgRole, loading, canDo, allowedActions };
}
