"use client";
import { useState } from "react";
import { TEAM_COLORS } from "@/lib/constants";
import { makeAvatar as av } from "@/lib/helpers";

const M = "'Space Mono', monospace";
const F = "'DM Sans', -apple-system, sans-serif";
const bs = { padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: F };
const ins = { background: "#14141D", border: "1px solid #252535", borderRadius: 8, padding: "10px 14px", color: "#F0F0F5", fontSize: 13, outline: "none", fontFamily: F, boxSizing: "border-box" };
const lb = { display: "block", fontSize: 11, fontWeight: 600, color: "#5E5E72", textTransform: "uppercase", marginBottom: 6, fontFamily: M };
const Stat = ({ label, value, color, icon }) => (
  <div style={{ background: "#14141D", border: "1px solid #252535", borderRadius: 10, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: color }} />
    <div style={{ fontSize: 11, color: "#5E5E72", textTransform: "uppercase", letterSpacing: ".08em", fontFamily: M, marginBottom: 4 }}>{icon} {label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
  </div>
);

export default function ProjectsHome({ projects, goProj, onNew }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", subtitle: "", icon: "", color: TEAM_COLORS[0], locLabel: "Zone", subLabel: "Building" });

  const tot = projects.reduce((a, p) => a + p.tasks.length, 0);
  const opn = projects.reduce((a, p) => a + p.tasks.filter((t) => t.status === "open").length, 0);
  const crt = projects.reduce((a, p) => a + p.tasks.filter((t) => t.priority === "critical" && t.status !== "resolved").length, 0);
  const blk = projects.reduce((a, p) => a + p.tasks.filter((t) => t.status === "blocked").length, 0);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await onNew(form);
    setForm({ name: "", subtitle: "", icon: "", color: TEAM_COLORS[0], locLabel: "Zone", subLabel: "Building" });
    setShowNew(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Projects</h2><p style={{ margin: 0, fontSize: 13, color: "#5E5E72" }}>{projects.length} active · {tot} total items</p></div>
        <button onClick={() => setShowNew(true)} style={{ ...bs, background: "#10B981", color: "white" }}>+ New Project</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <Stat label="Total Items" value={tot} color="#5FA8D3" icon="▣" />
        <Stat label="Open" value={opn} color="#EF4444" icon="○" />
        <Stat label="Critical" value={crt} color="#EF4444" icon="▲" />
        <Stat label="Blocked" value={blk} color="#5E5E72" icon="⊘" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(370px, 1fr))", gap: 16 }}>
        {projects.map((p) => {
          const t = p.tasks, op = t.filter((x) => x.status === "open").length, ip = t.filter((x) => x.status === "in_progress").length;
          const bl = t.filter((x) => x.status === "blocked").length, rv = t.filter((x) => x.status === "resolved").length;
          const cr = t.filter((x) => x.priority === "critical" && x.status !== "resolved").length, ua = t.filter((x) => !x.assignee).length;
          const pct = t.length ? Math.round(rv / t.length * 100) : 0;
          return (
            <div key={p.id} onClick={() => goProj(p.id)} style={{ background: "#0F0F16", borderRadius: 14, border: "1px solid #252535", overflow: "hidden", cursor: "pointer", transition: "border .2s", position: "relative" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = p.color} onMouseLeave={(e) => e.currentTarget.style.borderColor = "#252535"}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${p.color},${p.color}44)` }} />
              <div style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: "white" }}>{p.icon}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 17, fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 12, color: "#5E5E72", marginTop: 2 }}>{p.subtitle}</div></div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: "#5E5E72" }}>Progress</span><span style={{ fontSize: 11, fontWeight: 600, color: p.color }}>{pct}%</span></div>
                  <div style={{ height: 4, background: "#252535", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: p.color, borderRadius: 2 }} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
                  {[{ l: "Open", v: op, c: "#EF4444" }, { l: "In Progress", v: ip, c: "#3B82F6" }, { l: "Blocked", v: bl, c: "#5E5E72" }, { l: "Critical", v: cr, c: "#EA580C" }, { l: "Unassigned", v: ua, c: "#CA8A04" }, { l: "Resolved", v: rv, c: "#10B981" }].map((s, i) => (
                    <div key={i} style={{ textAlign: "center", padding: 6, background: "#14141D", borderRadius: 6 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 9, color: "#5E5E72", textTransform: "uppercase", fontFamily: M }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "#1A1A28", color: "#9898AE" }}>{p.locs.length} {p.locLabel}s</span>
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "#1A1A28", color: "#9898AE" }}>{Object.values(p.subs).flat().length} {p.subLabel}s</span>
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "#1A1A28", color: "#9898AE" }}>{p.cats.length} categories</span>
                </div>
                <div style={{ display: "flex" }}>
                  {(p.team || []).slice(0, 8).map((u, i) => (
                    <div key={u.id || i} style={{ width: 28, height: 28, borderRadius: "50%", background: u.color || "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white", border: "2px solid #0F0F16", marginLeft: i ? -6 : 0, zIndex: 10 - i }} title={u.name}>{av(u.name || "?")}</div>
                  ))}
                  {(p.team || []).length > 8 && <span style={{ fontSize: 11, color: "#5E5E72", marginLeft: 6 }}>+{p.team.length - 8}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div onClick={() => setShowNew(true)} style={{ background: "#0F0F16", borderRadius: 14, border: "2px dashed #252535", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, cursor: "pointer" }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#3A3A48"} onMouseLeave={(e) => e.currentTarget.style.borderColor = "#252535"}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 36, color: "#3A3A48", marginBottom: 8 }}>+</div><div style={{ fontSize: 14, color: "#5E5E72" }}>New Project</div></div>
        </div>
      </div>

      {/* New Project Modal */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && setShowNew(false)}>
          <div style={{ background: "#0F0F16", borderRadius: 16, border: "1px solid #252535", padding: "24px 28px", width: 580, maxWidth: "95vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create New Project</h2>
              <button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5E5E72", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={lb}>Project Name</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Horizon Park" style={{ ...ins, width: "100%", fontSize: 16, fontWeight: 600 }} /></div>
              <div><label style={lb}>Subtitle</label><input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="28-Acre Theme Park · 7 Zones" style={{ ...ins, width: "100%" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: 12 }}>
                <div><label style={lb}>Icon</label><input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value.substring(0, 2) }))} placeholder="HP" maxLength={2} style={{ ...ins, width: "100%", textAlign: "center", fontSize: 16, fontWeight: 700 }} /></div>
                <div><label style={lb}>Location Label</label><input value={form.locLabel} onChange={(e) => setForm((f) => ({ ...f, locLabel: e.target.value }))} placeholder="Zone, Floor…" style={{ ...ins, width: "100%" }} /></div>
                <div><label style={lb}>Sub-Location Label</label><input value={form.subLabel} onChange={(e) => setForm((f) => ({ ...f, subLabel: e.target.value }))} placeholder="Building, Room…" style={{ ...ins, width: "100%" }} /></div>
              </div>
              <div><label style={lb}>Color</label><div style={{ display: "flex", gap: 6 }}>{TEAM_COLORS.map((c) => (<div key={c} onClick={() => setForm((f) => ({ ...f, color: c }))} style={{ width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "2px solid white" : "2px solid transparent" }} />))}</div></div>
              <button onClick={handleCreate} style={{ ...bs, background: "#10B981", color: "white", width: "100%", padding: "12px", fontWeight: 600 }}>Create Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
