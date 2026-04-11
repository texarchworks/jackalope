export const genId = () => Math.random().toString(36).substr(2, 9);

export const makeAvatar = (name) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

export const isOverdue = (dueDate, readinessState) => {
  if (!dueDate || readinessState === "phase_ready") return false;
  return dueDate < new Date().toISOString().split("T")[0];
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return dateStr;
};
