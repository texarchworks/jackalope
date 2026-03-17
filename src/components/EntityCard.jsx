"use client";
import { ENTITY_TYPE_CONFIG, PHASE_CONFIG, COLORS } from "@/lib/constants";

const M = "'IBM Plex Mono', monospace";
const F = "'Inter', -apple-system, sans-serif";

const TYPE_COLORS = {
  building: COLORS.blue,
  zone: "#D9730D",
};

export default function EntityCard({ entity, onClick, theme: T = {} }) {
  const cfg = ENTITY_TYPE_CONFIG[entity.entity_type] || ENTITY_TYPE_CONFIG.building;
  const phaseKey = entity.effective_phase || entity.phase;
  const phaseCfg = phaseKey && PHASE_CONFIG[phaseKey];
  const total = Number(entity.total_items) || 0;
  const completed = Number(entity.completed_items) || 0;
  const openTasks = Number(entity.open_tasks) || 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const typeColor = TYPE_COLORS[entity.entity_type] || COLORS.blue;

  return (
    <div
      onClick={onClick}
      style={{
        background: T.bgElevated || "#252525",
        border: `1px solid ${T.border || "#333"}`,
        borderLeft: `4px solid ${typeColor}`,
        borderRadius: "0 10px 10px 0",
        padding: "14px 16px",
        cursor: "pointer",
        transition: "all .15s",
        minHeight: 100,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = typeColor; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border || "#333"; e.currentTarget.style.borderLeftColor = typeColor; }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text || "#FFF", marginBottom: 2 }}>{entity.name}</div>
          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: typeColor + "22", color: typeColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>
            {cfg.label}
          </span>
        </div>
        {phaseCfg && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: phaseCfg.color + "22", color: phaseCfg.color, border: `1px solid ${phaseCfg.color}44`, letterSpacing: ".04em", textTransform: "uppercase" }}>
            {phaseCfg.short}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ height: 4, background: T.border || "#333", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#0F7B6C" : typeColor, borderRadius: 2, transition: "width .3s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 10, color: T.textMuted || "#888", fontFamily: M }}>{completed} / {total} items</span>
            <span style={{ fontSize: 10, color: pct === 100 ? "#0F7B6C" : (T.textMuted || "#888"), fontWeight: 600, fontFamily: M }}>{pct}%</span>
          </div>
        </div>
      )}

      {/* Open tasks indicator */}
      {openTasks > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#E03E3E" }} />
          <span style={{ fontSize: 10, color: T.textSecondary || "#888", fontFamily: F }}>{openTasks} open task{openTasks !== 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}
