"use client";
import { PRIORITIES as PRI, STATUSES as STA } from "@/lib/constants";
import { makeAvatar as av } from "@/lib/helpers";

const M = "'IBM Plex Mono', monospace";
const Stat = ({ label, value, color, icon }) => (
  <div style={{ background: "var(--t-elevated, #252525)", border: "1px solid #252535", borderRadius: 10, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: color }} />
    <div style={{ fontSize: 11, color: "var(--t-muted, #888)", textTransform: "uppercase", letterSpacing: ".08em", fontFamily: M, marginBottom: 4 }}>{icon} {label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
  </div>
);

export default function MyWork({ user, projects, goProj, goEditTask, onUpdateTask }) {
  const my = [];
  projects.forEach((p) => p.tasks.filter((t) => t.assignee === user.id).forEach((t) => my.push({ ...t, _p: p })));
  const today = new Date().toISOString().split("T")[0];
  const overdue = my.filter((t) => t.dueDate && t.dueDate < today && t.status !== "resolved");
  const active = my.filter((t) => t.status !== "resolved");
  const bySta = {};
  active.forEach((t) => { if (!bySta[t.status]) bySta[t.status] = []; bySta[t.status].push(t); });
  const byProj = {};
  my.forEach((t) => { if (!byProj[t._p.id]) byProj[t._p.id] = { p: t._p, ts: [] }; byProj[t._p.id].ts.push(t); });

  const ResolveBtn = ({ onClick, dark }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} title="Close / Resolve"
      style={{ width: 20, height: 20, borderRadius: 4, border: `1px solid ${dark ? "#7f1d1d" : "var(--t-border, #333)"}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: dark ? "#FCA5A5" : "var(--t-muted, #888)", flexShrink: 0, transition: "all .15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#0F7B6C"; e.currentTarget.style.color = "white"; e.currentTarget.style.borderColor = "#0F7B6C"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = dark ? "#FCA5A5" : "var(--t-muted, #888)"; e.currentTarget.style.borderColor = dark ? "#7f1d1d" : "var(--t-border, #333)"; }}>
      ✓
    </button>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Welcome back, {user.name?.split(".").pop().trim()}</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--t-muted, #888)" }}>{user.role} · {active.length} active items across {Object.keys(byProj).length} project{Object.keys(byProj).length !== 1 ? "s" : ""}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <Stat label="Active Items" value={active.length} color="#2F80ED" icon="◐" />
        <Stat label="Critical" value={active.filter((t) => t.priority === "critical").length} color="#E03E3E" icon="▲" />
        <Stat label="Overdue" value={overdue.length} color="#EA580C" icon="⚠" />
        <Stat label="Projects" value={Object.keys(byProj).length} color="#0F7B6C" icon="▣" />
      </div>

      {overdue.length > 0 && (
        <div style={{ background: "#451a1a", border: "1px solid #7f1d1d", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#FCA5A5", marginBottom: 8 }}>⚠ {overdue.length} Overdue Item{overdue.length > 1 ? "s" : ""}</div>
          {overdue.slice(0, 5).map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #7f1d1d33", gap: 8 }}>
              <span onClick={() => goEditTask(t._p.id, t)} style={{ fontSize: 12, fontWeight: 500, color: "#FECACA", cursor: "pointer", flex: 1 }}>{t.title}</span>
              <span style={{ fontSize: 11, color: "#F87171", fontFamily: M }}>{t.dueDate}</span>
              <ResolveBtn onClick={() => onUpdateTask(t._p.id, t.id, { status: "resolved" })} dark />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(Object.keys(bySta).length || 1, 5)}, 1fr)`, gap: 12, marginBottom: 24 }}>
        {Object.entries(STA).filter(([k]) => bySta[k]?.length > 0).map(([st, cfg]) => (
          <div key={st} style={{ background: "var(--t-card, #202020)", borderRadius: 10, border: "1px solid #252535", overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #252535", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color }} /><span style={{ fontSize: 12, fontWeight: 600 }}>{cfg.label}</span></div>
              <span style={{ fontSize: 11, color: "var(--t-muted, #888)", fontFamily: M }}>{bySta[st].length}</span>
            </div>
            <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
              {bySta[st].slice(0, 8).map((t) => {
                const loc = t._p.locs.find((l) => l.id === t.loc);
                return (
                  <div key={t.id} style={{ background: "var(--t-elevated, #252525)", borderLeft: `3px solid ${PRI[t.priority].color}`, borderRadius: "0 6px 6px 0", padding: "7px 10px", position: "relative" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--t-border-s, #2A2A2A)"} onMouseLeave={(e) => e.currentTarget.style.background = "var(--t-elevated, #252525)"}>
                    <div onClick={() => goEditTask(t._p.id, t)} style={{ cursor: "pointer" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3, lineHeight: 1.3, paddingRight: 24 }}>{t.title}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: t._p.color + "22", color: t._p.color, fontWeight: 600 }}>{t._p.name}</span>
                        {loc && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: loc.color, color: "white" }}>{t.loc}</span>}
                        {t.dueDate && <span style={{ fontSize: 9, color: t.dueDate < today ? "#F87171" : "var(--t-muted, #888)", fontFamily: M, marginLeft: "auto" }}>{t.dueDate}</span>}
                      </div>
                    </div>
                    <div style={{ position: "absolute", top: 7, right: 6 }}>
                      <ResolveBtn onClick={() => onUpdateTask(t._p.id, t.id, { status: "resolved" })} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>By Project</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {Object.values(byProj).map(({ p: proj, ts }) => {
          const cr = ts.filter((t) => t.priority === "critical" && t.status !== "resolved").length;
          return (
            <div key={proj.id} onClick={() => goProj(proj.id)} style={{ background: "var(--t-card, #202020)", borderRadius: 10, border: "1px solid #252535", overflow: "hidden", cursor: "pointer", transition: "border .15s" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = proj.color} onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--t-border, #333)"}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #252535", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: proj.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white" }}>{proj.icon}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{proj.name}</div><div style={{ fontSize: 11, color: "var(--t-muted, #888)" }}>{ts.length} items</div></div>
                {cr > 0 && <div style={{ background: "#FEF2F2", borderRadius: 6, padding: "3px 7px", fontSize: 10, color: "#E03E3E", fontWeight: 600 }}>▲ {cr}</div>}
              </div>
              <div style={{ padding: "8px 14px" }}>
                {ts.filter((t) => t.status !== "resolved").slice(0, 4).map((t) => (
                  <div key={t.id} style={{ padding: "5px 8px", borderLeft: `2px solid ${PRI[t.priority].color}`, marginBottom: 3, background: "var(--t-elevated, #252525)", borderRadius: "0 4px 4px 0", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontWeight: 500, flex: 1 }}>{t.title.length > 38 ? t.title.substring(0, 38) + "…" : t.title}</span>
                    <span style={{ color: PRI[t.priority].color, fontWeight: 600, fontSize: 10, flexShrink: 0 }}>{PRI[t.priority].label}</span>
                    <ResolveBtn onClick={() => onUpdateTask(proj.id, t.id, { status: "resolved" })} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
