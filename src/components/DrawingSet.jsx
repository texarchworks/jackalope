"use client";
import { useState } from "react";
import { DRAWING_SET_PHASES } from "@/lib/constants";
import { toggleDrawingSetItem, addCustomItem, deleteCustomItem, deleteDrawingSet } from "@/lib/drawingSets";
import PermissionGate from "@/components/PermissionGate";

const M = "'IBM Plex Mono', monospace";
const F = "'Inter', -apple-system, sans-serif";

export default function DrawingSet({ drawingSet, currentPhase, role, userId, onUpdate, theme: T = {} }) {
  const ds = drawingSet;
  const [expanded, setExpanded] = useState(() => {
    const out = {};
    DRAWING_SET_PHASES.forEach(({ key }) => {
      const items = ds.phases[key] || [];
      const allDone = items.length > 0 && items.every((i) => i.readiness_state === "phase_ready");
      out[key] = key === currentPhase ? true : !allDone;
    });
    return out;
  });
  const [adding, setAdding] = useState(null); // phase key
  const [newName, setNewName] = useState("");

  const pct = ds.totalItems ? Math.round((ds.completedItems / ds.totalItems) * 100) : 0;

  const handleToggle = async (item) => {
    const isReady = item.readiness_state === "phase_ready";
    await toggleDrawingSetItem(item.id, !isReady, userId);
    onUpdate();
  };

  const handleAdd = async (phase) => {
    if (!newName.trim()) return;
    await addCustomItem({ drawingSetId: ds.id, name: newName.trim(), phase });
    setNewName("");
    setAdding(null);
    onUpdate();
  };

  const handleDelete = async (itemId) => {
    await deleteCustomItem(itemId);
    onUpdate();
  };

  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{ds.name}</span>
          <span style={{ fontSize: 11, color: T.textMuted, fontFamily: M }}>{ds.completedItems}/{ds.totalItems}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#0F7B6C", fontFamily: M }}>{pct}%</span>
          <PermissionGate action="edit_project" role={role}>
            <button
              onClick={async () => { if (confirm(`Delete "${ds.name}" and all its items?`)) { try { await deleteDrawingSet(ds.id); onUpdate(); } catch (e) { alert(e.message); } } }}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 14, padding: "2px 4px" }}
              title="Delete drawing set"
            >✕</button>
          </PermissionGate>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#0F7B6C", borderRadius: 2, transition: "width .3s" }} />
      </div>

      {/* Phase sections */}
      {DRAWING_SET_PHASES.map(({ key, label, color }) => {
        const items = ds.phases[key] || [];
        if (items.length === 0 && key !== currentPhase) return null;
        const done = items.filter((i) => i.readiness_state === "phase_ready").length;
        const isOpen = expanded[key];

        return (
          <div key={key} style={{ marginBottom: 10 }}>
            {/* Phase header */}
            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", cursor: "pointer", padding: "6px 0" }}
            >
              <span style={{ fontSize: 10, transform: isOpen ? "rotate(90deg)" : "rotate(0)", transition: "transform .15s", color: T.textMuted }}>▶</span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: color + "22", color, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: M }}>{key}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.textSecondary }}>{label}</span>
              <span style={{ fontSize: 10, color: T.textMuted, fontFamily: M, marginLeft: "auto" }}>{done}/{items.length}</span>
            </button>

            {/* Items */}
            {isOpen && (
              <div style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 2 }}>
                {items.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                    <input
                      type="checkbox"
                      checked={item.readiness_state === "phase_ready"}
                      onChange={() => handleToggle(item)}
                      style={{ cursor: "pointer", accentColor: color }}
                    />
                    <span style={{
                      fontSize: 12, color: item.readiness_state === "phase_ready" ? T.textMuted : T.text,
                      textDecoration: item.readiness_state === "phase_ready" ? "line-through" : "none",
                      flex: 1,
                    }}>{item.name}</span>
                    {item.is_custom && (
                      <PermissionGate action="edit_project" role={role}>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 12, padding: "2px 4px" }}
                          title="Delete custom item"
                        >✕</button>
                      </PermissionGate>
                    )}
                  </div>
                ))}

                {/* Add custom item */}
                <PermissionGate action="edit_project" role={role}>
                  {adding === key ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                      <input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd(key)}
                        placeholder="Item name…"
                        style={{ flex: 1, background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 4, padding: "4px 8px", color: T.text, fontSize: 12, outline: "none", fontFamily: F }}
                      />
                      <button onClick={() => handleAdd(key)} style={{ background: color, color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Add</button>
                      <button onClick={() => { setAdding(null); setNewName(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 12 }}>✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAdding(key)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 11, padding: "4px 0", textAlign: "left" }}
                    >+ Add item</button>
                  )}
                </PermissionGate>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
