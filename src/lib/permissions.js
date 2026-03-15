// Jackalope Permission Utilities

export const ROLES = {
  ADMIN: "admin",
  PM: "pm",
  MEMBER: "member",
  VIEWER: "viewer",
};

export const ACTIONS = {
  CREATE_PROJECT: "create_project",
  EDIT_PROJECT: "edit_project",
  DELETE_PROJECT: "delete_project",
  CREATE_TASK: "create_task",
  EDIT_TASK: "edit_task",
  DELETE_TASK: "delete_task",
  REORDER_TASKS: "reorder_tasks",
  INVITE_MEMBER: "invite_member",
  REMOVE_MEMBER: "remove_member",
  CHANGE_ROLE: "change_role",
  MANAGE_ORG: "manage_org",
  VIEW_ORG_TEAM: "view_org_team",
  EDIT_MEETING_NOTES: "edit_meeting_notes",
  MANAGE_CATEGORIES: "manage_categories",
  MANAGE_LOCATIONS: "manage_locations",
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(ACTIONS),
  [ROLES.PM]: Object.values(ACTIONS).filter(
    (a) => a !== ACTIONS.MANAGE_ORG && a !== ACTIONS.CHANGE_ROLE
  ),
  [ROLES.MEMBER]: [
    ACTIONS.CREATE_TASK,
    ACTIONS.EDIT_TASK,
    ACTIONS.REORDER_TASKS,
    ACTIONS.VIEW_ORG_TEAM,
    ACTIONS.EDIT_MEETING_NOTES,
  ],
  [ROLES.VIEWER]: [ACTIONS.VIEW_ORG_TEAM],
};

/**
 * Check if a role can perform an action.
 * @param {string} action - Action from ACTIONS constant
 * @param {string} role - Role from ROLES constant
 * @param {object} [context] - Optional context (e.g., { isOwner: true })
 * @returns {boolean}
 */
export function can(action, role, context = {}) {
  if (!role || !action) return false;

  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;

  // Members can edit their own tasks even without broad edit permission
  if (context.isOwner && role === ROLES.MEMBER && action === ACTIONS.EDIT_TASK) {
    return true;
  }

  return perms.includes(action);
}

/**
 * Get all allowed actions for a role.
 * @param {string} role
 * @returns {string[]}
 */
export function getAllowedActions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if role is PM or above.
 * @param {string} role
 * @returns {boolean}
 */
export function isPMOrAbove(role) {
  return role === ROLES.ADMIN || role === ROLES.PM;
}

/**
 * Check if action is admin-only.
 * @param {string} action
 * @returns {boolean}
 */
export function isAdminOnly(action) {
  return (
    ROLE_PERMISSIONS[ROLES.ADMIN]?.includes(action) &&
    !ROLE_PERMISSIONS[ROLES.PM]?.includes(action)
  );
}
