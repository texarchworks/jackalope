export const FEATURES = {
  ENTITIES_V2: true,
};

export const ENTITY_TYPES = {
  BUILDING: 'building',
  ZONE: 'zone',
};

export const ENTITY_TYPE_CONFIG = {
  building: {
    label: 'Building',
    icon: 'Building2',
    color: 'blue',
    hasDrawingSet: true,
    drawingSetType: 'architectural',
  },
  zone: {
    label: 'Zone',
    icon: 'Map',
    color: 'coral',
    hasDrawingSet: true,
    drawingSetType: 'civil',
  },
};

// ROYGBIV semantic colors - same in both themes
export const COLORS = {
  red: "#E03E3E",
  orange: "#D9730D",
  yellow: "#DFAB01",
  green: "#0F7B6C",
  blue: "#2F80ED",
  indigo: "#6940A5",
  violet: "#AD1A72",
  gray: "#888888",
  black: "#000000",
  white: "#FFFFFF",
};

export const PRIORITIES = {
  critical: { label: "Critical", color: COLORS.red, bg: "rgba(224,62,62,.12)" },
  high: { label: "High", color: COLORS.orange, bg: "rgba(217,115,13,.12)" },
  medium: { label: "Medium", color: COLORS.yellow, bg: "rgba(223,171,1,.12)" },
  low: { label: "Low", color: COLORS.green, bg: "rgba(15,123,108,.12)" },
};

export const STATUSES = {
  open: { label: "Open", color: COLORS.red, bg: "rgba(224,62,62,.12)" },
  in_progress: { label: "In Progress", color: COLORS.blue, bg: "rgba(47,128,237,.12)" },
  review: { label: "Under Review", color: COLORS.indigo, bg: "rgba(105,64,165,.12)" },
  resolved: { label: "Resolved", color: COLORS.green, bg: "rgba(15,123,108,.12)" },
  blocked: { label: "Blocked", color: COLORS.gray, bg: "rgba(136,136,136,.12)" },
};

export const TEAM_COLORS = [
  "#E03E3E", "#D9730D", "#DFAB01", "#0F7B6C", "#2F80ED", "#6940A5", "#AD1A72",
  "#2F80ED", "#0F7B6C", "#D9730D", "#6940A5", "#E03E3E", "#DFAB01", "#AD1A72",
];

export const DEFAULT_CATEGORIES = [
  "Design", "Structural", "MEP", "Landscape", "Permitting",
  "Safety", "Coordination", "RFI", "Submittal", "Punchlist",
];

export const TASK_TYPES = {
  DRAWING_SET: 'drawing_set',
  MILESTONE: 'milestone',
  TASK: 'task',
  CHECKLIST_ITEM: 'checklist_item',
};

export const TASK_TYPE_CONFIG = {
  drawing_set: {
    label: 'Drawing Set',
    description: 'Full deliverable package',
    icon: 'FolderOpen',
    canHaveChildren: true,
    allowedChildren: ['task', 'checklist_item'],
    mustBeTopLevel: true,
    color: 'coral',
  },
  milestone: {
    label: 'Milestone',
    description: 'Deadline or gate event',
    icon: 'Flag',
    canHaveChildren: false,
    allowedChildren: [],
    mustBeTopLevel: false,
    color: 'teal',
  },
  task: {
    label: 'Task',
    description: 'Unit of work',
    icon: 'CheckSquare',
    canHaveChildren: true,
    allowedChildren: ['task', 'checklist_item'],
    mustBeTopLevel: false,
    color: 'blue',
  },
  checklist_item: {
    label: 'Checklist Item',
    description: 'Atomic completable item',
    icon: 'Circle',
    canHaveChildren: false,
    allowedChildren: [],
    mustBeTopLevel: false,
    color: 'neutral',
  },
};

export const PHASES = {
  SD: 'SD',
  DD: 'DD',
  CD: 'CD',
  CA: 'CA',
  PERMIT: 'Permit',
};

export const PHASE_CONFIG = {
  SD: { label: 'Schematic Design', short: 'SD', color: '#6940A5' },
  DD: { label: 'Design Development', short: 'DD', color: '#2F80ED' },
  CD: { label: 'Construction Documents', short: 'CD', color: '#DFAB01' },
  CA: { label: 'Construction Admin', short: 'CA', color: '#0F7B6C' },
  Permit: { label: 'Permitting', short: 'Permit', color: '#E03E3E' },
};

export const DRAWING_SET_PHASES = [
  { key: 'SD', label: 'Schematic Design', color: '#6940A5' },
  { key: 'DD', label: 'Design Development', color: '#2F80ED' },
  { key: 'CD', label: 'Construction Documents', color: '#DFAB01' },
];

export const THEMES = {
  dark: {
    id: "dark",
    // Backgrounds
    bg: "#191919",
    bgCard: "#202020",
    bgElevated: "#252525",
    bgInput: "#252525",
    bgSidebar: "#191919",
    bgModal: "rgba(25,25,25,.95)",
    bgHover: "#2A2A2A",
    bgSubRow: "#1E1E1E",
    // Borders
    border: "#333333",
    borderSubtle: "#2A2A2A",
    // Text - just black, white, gray
    text: "#FFFFFF",
    textSecondary: "#888888",
    textMuted: "#888888",
    textDim: "#555555",
    textSub: "#666666",
    // Accent
    accent: COLORS.blue,
    accentGlow: "rgba(47,128,237,.15)",
    shadow: "0 16px 48px rgba(0,0,0,.4)",
    gradientOrbs: [],
    gradient: "none",
  },
  light: {
    id: "light",
    // Backgrounds
    bg: "#FFFFFF",
    bgCard: "#F7F7F5",
    bgElevated: "#F0F0EE",
    bgInput: "#FFFFFF",
    bgSidebar: "#F7F7F5",
    bgModal: "rgba(255,255,255,.97)",
    bgHover: "#EBEBEA",
    bgSubRow: "#F7F7F5",
    // Borders
    border: "#E3E3E0",
    borderSubtle: "#EBEBEA",
    // Text - just black, white, gray
    text: "#000000",
    textSecondary: "#888888",
    textMuted: "#888888",
    textDim: "#B0B0B0",
    textSub: "#999999",
    // Accent
    accent: COLORS.blue,
    accentGlow: "rgba(47,128,237,.10)",
    shadow: "0 16px 48px rgba(0,0,0,.06)",
    // Gradient orbs
    gradientOrbs: [
      { color: "rgba(47,128,237,.05)", size: 400, top: "10%", left: "5%", blur: 100 },
      { color: "rgba(15,123,108,.04)", size: 300, top: "55%", right: "10%", blur: 80 },
      { color: "rgba(105,64,165,.03)", size: 350, top: "0%", right: "25%", blur: 90 },
    ],
    gradient: "radial-gradient(ellipse 600px 400px at 20% 80%, rgba(47,128,237,.05) 0%, transparent 70%), radial-gradient(ellipse 500px 350px at 80% 20%, rgba(15,123,108,.04) 0%, transparent 70%), radial-gradient(ellipse 450px 500px at 50% 50%, rgba(105,64,165,.03) 0%, transparent 70%)",
  },
};
