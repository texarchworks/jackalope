export const PRIORITIES = {
  critical: { label: "Critical", color: "#DC2626", bg: "#FEF2F2" },
  high: { label: "High", color: "#EA580C", bg: "#FFF7ED" },
  medium: { label: "Medium", color: "#CA8A04", bg: "#FEFCE8" },
  low: { label: "Low", color: "#16A34A", bg: "#F0FDF4" },
};

export const STATUSES = {
  open: { label: "Open", color: "#DC2626", bg: "#FEF2F2" },
  in_progress: { label: "In Progress", color: "#2563EB", bg: "#EFF6FF" },
  review: { label: "Under Review", color: "#9333EA", bg: "#FAF5FF" },
  resolved: { label: "Resolved", color: "#16A34A", bg: "#F0FDF4" },
  blocked: { label: "Blocked", color: "#1F2937", bg: "#F3F4F6" },
};

export const TEAM_COLORS = [
  "#1B4965", "#6B2737", "#2D6A4F", "#7B2D8E", "#B45309", "#1E3A5F",
  "#9B2226", "#3D5A80", "#065F46", "#7C3AED", "#BE185D", "#92400E",
  "#0E7490", "#4338CA",
];

export const DEFAULT_CATEGORIES = [
  "Design", "Structural", "MEP", "Landscape", "Permitting",
  "Safety", "Coordination", "RFI", "Submittal", "Punchlist",
];

export const THEMES = {
  dark: {
    id: "dark",
    bg: "#050507",
    bgCard: "rgba(15,15,22,.6)",
    bgElevated: "rgba(20,20,29,.5)",
    bgInput: "rgba(20,20,29,.6)",
    bgSidebar: "rgba(10,10,15,.88)",
    bgModal: "rgba(15,15,22,.92)",
    bgHover: "rgba(30,30,40,.6)",
    bgSubRow: "rgba(5,5,7,.4)",
    border: "rgba(255,255,255,.06)",
    borderSubtle: "rgba(255,255,255,.04)",
    text: "#F0F0F5",
    textSecondary: "#9898AE",
    textMuted: "#5E5E72",
    textDim: "#3A3A48",
    textSub: "#7A7A90",
    accent: "#3B82F6",
    accentGlow: "rgba(59,130,246,.15)",
    shadow: "0 24px 80px rgba(0,0,0,.5)",
    gradientOrbs: [
      { color: "rgba(59,130,246,.20)", size: 400, top: "10%", left: "5%", blur: 60 },
      { color: "rgba(16,185,129,.18)", size: 300, top: "55%", right: "10%", blur: 50 },
      { color: "rgba(139,92,246,.16)", size: 350, top: "0%", right: "25%", blur: 55 },
      { color: "rgba(245,158,11,.12)", size: 250, bottom: "5%", left: "35%", blur: 45 },
    ],
    gradient: "radial-gradient(ellipse 600px 400px at 20% 80%, rgba(59,130,246,.25) 0%, transparent 70%), radial-gradient(ellipse 500px 350px at 80% 20%, rgba(16,185,129,.20) 0%, transparent 70%), radial-gradient(ellipse 450px 500px at 50% 50%, rgba(139,92,246,.15) 0%, transparent 70%)",
  },
  light: {
    id: "light",
    bg: "#F5F5F7",
    bgCard: "rgba(255,255,255,.7)",
    bgElevated: "rgba(255,255,255,.6)",
    bgInput: "rgba(255,255,255,.8)",
    bgSidebar: "rgba(255,255,255,.85)",
    bgModal: "rgba(255,255,255,.92)",
    bgHover: "rgba(0,0,0,.03)",
    bgSubRow: "rgba(0,0,0,.02)",
    border: "rgba(0,0,0,.08)",
    borderSubtle: "rgba(0,0,0,.05)",
    text: "#1A1A2E",
    textSecondary: "#5A5A72",
    textMuted: "#8888A0",
    textDim: "#B0B0C0",
    textSub: "#7A7A90",
    accent: "#2563EB",
    accentGlow: "rgba(37,99,235,.12)",
    shadow: "0 24px 80px rgba(0,0,0,.08)",
    gradientOrbs: [
      { color: "rgba(59,130,246,.08)", size: 400, top: "10%", left: "5%", blur: 80 },
      { color: "rgba(16,185,129,.06)", size: 300, top: "55%", right: "10%", blur: 60 },
      { color: "rgba(139,92,246,.05)", size: 350, top: "0%", right: "25%", blur: 70 },
      { color: "rgba(245,158,11,.04)", size: 250, bottom: "5%", left: "35%", blur: 55 },
    ],
    gradient: "radial-gradient(ellipse 600px 400px at 20% 80%, rgba(59,130,246,.08) 0%, transparent 70%), radial-gradient(ellipse 500px 350px at 80% 20%, rgba(16,185,129,.06) 0%, transparent 70%), radial-gradient(ellipse 450px 500px at 50% 50%, rgba(139,92,246,.05) 0%, transparent 70%)",
  },
};
