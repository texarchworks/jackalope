"use client";
import { can } from "@/lib/permissions";

/**
 * Conditionally renders children based on permission check.
 * @param {{ action: string, role: string, context?: object, children: React.ReactNode, fallback?: React.ReactNode }} props
 */
export default function PermissionGate({ action, role, context, children, fallback = null }) {
  if (can(action, role, context)) {
    return children;
  }
  return fallback;
}
