"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { makeAvatar as av } from "@/lib/helpers";

const M = "'Space Mono', monospace";
const F = "'DM Sans', -apple-system, sans-serif";
const bs = { padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: F, transition: "all .15s" };
const ins = { background: "#14141D", border: "1px solid #252535", borderRadius: 8, padding: "10px 14px", color: "#F0F0F5", fontSize: 13, outline: "none", fontFamily: F, boxSizing: "border-box" };
const sl = { ...ins, cursor: "pointer" };

export default function OrgTeam({ org, orgMembers, projects, userId, onReload }) {
  const [invName, setInvName] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [invLoading, setInvLoading] = useState(false);
  const [invStatus, setInvStatus] = useState("");
  const [filter, setFilter] = useState("active");
  const [actionLoading, setActionLoading] = useState(null);

  const currentMember = orgMembers.find((m) => m.user_id === userId);
  const myOrgRole = currentMember?.org_role || "member";
  const isOrgAdmin = myOrgRole === "owner" || myOrgRole === "admin";

  const active = orgMembers.filter((m) => m.is_active !== false);
  const inactive = orgMembers.filter((m) => m.is_active === false);
  const shown = filter === "active" ? active : filter === "inactive" ? inactive : orgMembers;

  const sendInvite = async () => {
    if (!invName.trim() || !invEmail.trim()) return;
    if (!invEmail.trim().toLowerCase().endsWith("@texarchworks.com")) {
      setInvStatus("✗ Internal members must use @texarchworks.com. Use Project Settings for external collaborators.");
      return;
    }
    setInvLoading(true); setInvStatus("");
    try {
      const res = await fetch("/api/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", email: invEmail.trim(), name: invName.trim(), orgId: org.id }),
      });
      const data = await res.json();
      if (data.success) { setInvStatus("✓ " + data.message); setInvName(""); setInvEmail(""); onReload(); }
      else { setInvStatus("✗ " + (data.error || "Failed")); }
    } catch (err) { setInvStatus("✗ " + err.message); }
    setInvLoading(false);
  };

  const doAction = async (action, uid, extra = {}) => {
    setActionLoading(uid);
    try {
      const res = await fetch("/api/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: uid, orgId: org.id, ...extra }),
      });
      const data = await res.json();
      if (data.success) onReload(); else alert("Error: " + (data.error || "Failed"));
    } catch (err) { alert("Error: " + err.message); }
    setActionLoading(null);
  };

  const updateOrgRole = async (memberId, newRole) => {
    await supabase.from("org_members").update({ org_role: newRole }).eq("id", memberId);
    onReload();
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Team</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5E5E72" }}>{org.name} — {active.length} active internal member{active.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Invite - org admins only */}
      {isOrgAdmin && <div style={{ background: "#0F0F16", border: "1px solid #252535", borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Invite Internal Member</div>
        <p style={{ fontSize: 11, color: "#5E5E72", margin: "0 0 10px" }}>Only @texarchworks.com emails. For external collaborators (consultants, contractors), use Project Settings.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Full Name" style={{ ...ins, width: 170 }} />
          <input value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="name@texarchworks.com" style={{ ...ins, flex: 1 }}
            onKeyDown={(e) => { if (e.key === "Enter") sendInvite(); }} />
          <button disabled={invLoading || !invName.trim() || !invEmail.trim()} onClick={sendInvite}
            style={{ ...bs, background: invLoading ? "#252535" : "#10B981", color: "white", padding: "10px 20px", whiteSpace: "nowrap" }}>
            {invLoading ? "Sending…" : "Send Invite"}
          </button>
        </div>
        {invStatus && <div style={{ fontSize: 12, color: invStatus.startsWith("✓") ? "#10B981" : "#EF4444", marginTop: 8 }}>{invStatus}</div>}
      </div>}

      {/* Filter */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid #252535" }}>
        {[{ id: "active", label: `Active (${active.length})` }, { id: "inactive", label: `Inactive (${inactive.length})` }, { id: "all", label: `All (${orgMembers.length})` }].map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, border: "none", borderBottom: filter === t.id ? "2px solid #3B82F6" : "2px solid transparent", cursor: "pointer", background: "transparent", color: filter === t.id ? "#F0F0F5" : "#5E5E72", fontFamily: F }}>{t.label}</button>
        ))}
      </div>

      {/* Members */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {shown.map((m) => {
          const memberProjects = projects.filter((p) => p.team.find((t) => t.id === m.user_id));
          const isInactive = m.is_active === false;
          const roleCfg = { owner: { bg: "#CA8A04", label: "Owner" }, admin: { bg: "#EF4444", label: "Admin" }, member: { bg: "#1A1A28", label: "Member" } }[m.org_role] || { bg: "#1A1A28", label: m.org_role };
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#14141D", border: `1px solid ${isInactive ? "#1A1A28" : "#252535"}`, borderRadius: 8, opacity: isInactive ? 0.5 : 1 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: m.profile?.color || "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white" }}>{av(m.profile?.name || "?")}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {m.profile?.name || "Pending"}
                  <span style={{ marginLeft: 8, fontSize: 9, padding: "1px 5px", borderRadius: 3, background: roleCfg.bg, color: "white", fontWeight: 600 }}>{roleCfg.label}</span>
                  {isInactive && <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#3A3A48", color: "#9898AE" }}>Inactive</span>}
                  {!m.joined_at && <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#3B82F622", color: "#93C5FD" }}>Pending Invite</span>}
                </div>
                <div style={{ fontSize: 11, color: "#5E5E72" }}>{m.profile?.role || "No title"}</div>
                {memberProjects.length > 0 && <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                  {memberProjects.map((p) => {
                    const projRole = p.team.find((t) => t.id === m.user_id)?.memberRole || "—";
                    return <span key={p.id} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "#0F0F16", color: "#9898AE", border: "1px solid #252535" }}>{p.name} <span style={{ color: "#5E5E72" }}>({projRole})</span></span>;
                  })}
                </div>}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {isOrgAdmin && m.user_id !== userId && <select value={m.org_role} onChange={(e) => updateOrgRole(m.id, e.target.value)} style={{ ...sl, padding: "4px 8px", fontSize: 11, width: 90 }}>
                  {myOrgRole === "owner" && <option value="owner">Owner</option>}<option value="admin">Admin</option><option value="member">Member</option>
                </select>}
                {!isOrgAdmin && <span style={{ fontSize: 10, color: "#5E5E72", fontFamily: M }}>{m.org_role}</span>}
                {isOrgAdmin && !m.joined_at && <button disabled={actionLoading === m.user_id} onClick={() => doAction("resend", m.user_id)}
                  style={{ ...bs, background: "#3B82F6", color: "white", padding: "4px 10px", fontSize: 11 }}>
                  {actionLoading === m.user_id ? "…" : "Resend"}
                </button>}
                {isOrgAdmin && m.user_id !== userId && (isInactive
                  ? <button onClick={() => doAction("reactivate", m.user_id)} style={{ ...bs, background: "#10B981", color: "white", padding: "4px 10px", fontSize: 11 }}>Reactivate</button>
                  : <button onClick={() => doAction("deactivate", m.user_id)} style={{ ...bs, background: "#CA8A04", color: "white", padding: "4px 10px", fontSize: 11 }}>Deactivate</button>
                )}
                {isOrgAdmin && m.user_id !== userId && <button onClick={() => { if (confirm(`Remove ${m.profile?.name || "this user"} permanently?`)) doAction("delete", m.user_id); }}
                  style={{ ...bs, background: "#252535", color: "#EF4444", padding: "4px 10px", fontSize: 11 }}>Delete</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
