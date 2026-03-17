"use client";
import { ENTITY_TYPE_CONFIG, PHASE_CONFIG, COLORS } from "@/lib/constants";
import DrawingSetPanel from "@/components/DrawingSetPanel";

const M = "'IBM Plex Mono', monospace";
const F = "'Inter', -apple-system, sans-serif";

const TYPE_COLORS = {
  building: COLORS.blue,
  zone: "#D9730D",
};

export default function EntityRow({ entity, isExpanded, onToggle, projectId, role, userId, onUpdate, theme: T = {} }) {
  const cfg = ENTITY_TYPE_CONFIG[entity.entity_type] || ENTITY_TYPE_CONFIG.building;
  const phaseKey = entity.effective_phase || entity.phase;
  const phaseCfg = phaseKey && PHASE_CONFIG[phaseKey];
  const total = Number(entity.total_items) || 0;
  const completed = Number(entity.completed_items) || 0;
  const openTasks = Number(entity.open_tasks) || 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const typeColor = TYPE_COLORS[entity.entity_type] || COLORS.blue;

  return (
    <div style={{ borderBottom: `1px solid ${T.border || "#333"}` }}>
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          cursor: "pointer",
          borderLeft: `4px solid ${typeColor}`,
          background: T.bgCard || "#202020",
          transition: "background .15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = T.bgHover || "#2A2A2A"; }}
        onMouseLeave={e => { e.currentTarget.style.background = T.bgCard || "#202020"; }}
      >
        <span style={{ fontSize: 10, transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s", display: "inline-block", color: T.textMuted || "#888", width: 14, textAlign: "center" }}>▶</span>

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text || "#FFF" }}>{entity.name}</span>
          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: typeColor + "22", color: typeColor, fontWeight: 600, textTransform: "uppercase" }}>
            {cfg.label}
          </span>
          {phaseCfg && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: phaseCfg.color + "22", color: phaseCfg.color, letterSpacing: ".04em" }}>
              {phaseCfg.short}
            </span>
          )}
        </div>

        {/* Progress */}
        {total > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 180 }}>
            <div style={{ flex: 1, height: 4, background: T.border || "#333", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#0F7B6C" : typeColor, borderRadius: 2, transition: "width .3s" }} />
            </div>
            <span style={{ fontSize: 10, color: T.textMuted || "#888", fontFamily: M, whiteSpace: "nowrap" }}>{completed}/{total}</span>
          </div>
        )}

        {openTasks > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#E03E3E" }} />
            <span style={{ fontSize: 10, color: T.textSecondary || "#888", fontFamily: M }}>{openTasks}</span>
          </div>
        )}
      </div>

      {/* Expanded drawing set panel */}
      {isExpanded && (
        <div style={{ padding: "12px 14px 16px 32px", background: T.bgElevated || "#252525", borderLeft: `4px solid ${typeColor}` }}>
          <DrawingSetPanel
            projectId={projectId}
            entityId={entity.id}
            currentPhase={phaseKey || "SD"}
            role={role}
            userId={userId}
            onUpdate={onUpdate}
            theme={T}
          />
        </div>
      )}
    </div>
  );
}
