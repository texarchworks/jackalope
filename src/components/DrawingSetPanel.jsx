"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchDrawingSetItems, toggleDrawingSetItem, addCustomItem, deleteCustomItem } from "@/lib/entities";
import { DRAWING_SET_PHASES } from "@/lib/constants";
import PermissionGate from "@/components/PermissionGate";
import { ACTIONS } from "@/lib/permissions";

const M = "'IBM Plex Mono', monospace";
const F = "'Inter', -apple-system, sans-serif";

export default function DrawingSetPanel({ projectId, entityId = null, currentPhase = "SD", role, userId, onUpdate, theme: T = {} }) {
  const [data, setData] = useState({ items: [], phases: { SD: [], DD: [], CD: [] }, totalItems: 0, completedItems: 0 });
  const [expanded, setExpanded] = useState({});
  const [addingTo, setAddingTo] = useState(null);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await fetchDrawingSetItems({ projectId, entityId });
      setData(result);
    } catch (e) { console.error(e); }
  }, [projectId, entityId]);

  useEffect(() => { load(); }, [load]);

  // Auto-expand current phase on mount
  useEffect(() => {
    setExpanded(prev => ({ ...prev, [currentPhase]: true }));
  }, [currentPhase]);

  const handleToggle = async (item) => {
    const next = !item.is_complete;
    // Optimistic update
    setData(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === item.id ? { ...i, is_complete: next, completed_at: next ? new Date().toISOString() : null, completed_by: next ? userId : null } : i),
      phases: {
        SD: prev.phases.SD.map(i => i.id === item.id ? { ...i, is_complete: next } : i),
        DD: prev.phases.DD.map(i => i.id === item.id ? { ...i, is_complete: next } : i),
        CD: prev.phases.CD.map(i => i.id === item.id ? { ...i, is_complete: next } : i),
      },
      completedItems: prev.completedItems + (next ? 1 : -1),
    }));
    try {
      await toggleDrawingSetItem(item.id, next, userId);
      if (onUpdate) onUpdate();
    } catch (e) {
      console.error(e);
      load(); // revert on error
    }
  };

  const handleAdd = async (phase) => {
    if (!newName.trim()) return;
    try {
      await addCustomItem({ projectId, entityId, name: newName.trim(), phase });
      setNewName("");
      setAddingTo(null);
      load();
      if (onUpdate) onUpdate();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (itemId) => {
    try {
      await deleteCustomItem(itemId);
      load();
      if (onUpdate) onUpdate();
    } catch (e) { console.error(e); }
  };

  if (data.totalItems === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {DRAWING_SET_PHASES.map(({ key, label, color }) => {
        const items = data.phases[key] || [];
        const done = items.filter(i => i.is_complete).length;
        const allDone = items.length > 0 && done === items.length;
        const isExpanded = expanded[key] !== undefined ? expanded[key] : key === currentPhase;

        return (
          <div key={key} style={{ border: `1px solid ${T.border || "#333"}`, borderLeft: `3px solid ${color}`, borderRadius: "0 8px 8px 0", overflow: "hidden" }}>
            {/* Phase header */}
            <div
              onClick={() => setExpanded(prev => ({ ...prev, [key]: !isExpanded }))}
              style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: T.bgCard || "#202020" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s", display: "inline-block", color: T.textMuted || "#888" }}>▶</span>
                {allDone && <span style={{ fontSize: 12, color: "#0F7B6C" }}>✓</span>}
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text || "#FFF" }}>{label}</span>
              </div>
              <span style={{ fontSize: 11, color: allDone ? "#0F7B6C" : (T.textMuted || "#888"), fontFamily: M }}>
                {done} / {items.length}
              </span>
            </div>

            {/* Items */}
            {isExpanded && (
              <div style={{ padding: "4px 14px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
                {items.map(item => (
                  <div
                    key={item.id}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", opacity: item.is_complete ? 0.5 : 1, transition: "opacity .15s" }}
                    onMouseEnter={e => { if (item.is_custom) e.currentTarget.querySelector('[data-del]')?.style && (e.currentTarget.querySelector('[data-del]').style.opacity = "1"); }}
                    onMouseLeave={e => { if (item.is_custom) e.currentTarget.querySelector('[data-del]')?.style && (e.currentTarget.querySelector('[data-del]').style.opacity = "0"); }}
                  >
                    <input
                      type="checkbox"
                      checked={item.is_complete}
                      onChange={() => handleToggle(item)}
                      style={{ accentColor: color, cursor: "pointer", width: 14, height: 14, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 12, color: T.text || "#FFF", textDecoration: item.is_complete ? "line-through" : "none", flex: 1, fontFamily: F }}>
                      {item.name}
                    </span>
                    {item.is_custom && (
                      <PermissionGate action={ACTIONS.EDIT_PROJECT} role={role}>
                        <button
                          data-del="true"
                          onClick={() => handleDelete(item.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#E03E3E", fontSize: 10, opacity: 0, transition: "opacity .15s", padding: "0 4px" }}
                        >✕</button>
                      </PermissionGate>
                    )}
                  </div>
                ))}

                {/* Add custom item */}
                <PermissionGate action={ACTIONS.EDIT_PROJECT} role={role}>
                  {addingTo === key ? (
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAdd(key); if (e.key === "Escape") { setAddingTo(null); setNewName(""); } }}
                        placeholder="Item name…"
                        autoFocus
                        style={{ flex: 1, background: T.bgInput || "#252525", border: `1px solid ${T.border || "#333"}`, borderRadius: 4, padding: "4px 8px", color: T.text || "#FFF", fontSize: 11, outline: "none", fontFamily: F }}
                      />
                      <button onClick={() => handleAdd(key)} style={{ background: T.text || "#FFF", color: T.bg || "#191919", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F }}>Add</button>
                      <button onClick={() => { setAddingTo(null); setNewName(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted || "#888", fontSize: 11 }}>✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTo(key)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted || "#888", fontSize: 11, padding: "4px 0", textAlign: "left", fontFamily: F }}
                      onMouseEnter={e => { e.currentTarget.style.color = T.text || "#FFF"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = T.textMuted || "#888"; }}
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
