"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { PRIORITIES as PRI, STATUSES as STA, TEAM_COLORS, PHASE_CONFIG, FEATURES, DRAWING_SET_PHASES, DS_CORAL } from "@/lib/constants";
import { makeAvatar as av } from "@/lib/helpers";
import TaskCanvas from "@/components/TaskCanvas";
import usePermissions from "@/hooks/usePermissions";
import { ACTIONS } from "@/lib/permissions";
import PermissionGate from "@/components/PermissionGate";

const M = "'IBM Plex Mono', monospace";
const F = "'Inter', -apple-system, sans-serif";
const bs = { padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: F, transition: "all .15s" };
const ins = { background: "var(--t-input, rgba(15,15,22,.4))", border: "1px solid var(--t-border, #252535)", borderRadius: 8, padding: "10px 14px", color: "var(--t-text, #F0F0F5)", fontSize: 13, outline: "none", fontFamily: F, boxSizing: "border-box" };
const sl = { ...ins, cursor: "pointer" };
const lb = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--t-muted, #5E5E72)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6, fontFamily: M };
const Tg = ({ bg, fg, children, title }) => <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: bg, color: fg, fontWeight: 600, whiteSpace: "nowrap" }} title={title}>{children}</span>;
const CatTags = ({ cat, size = 9 }) => { const cats = (cat || "").split(",").filter(Boolean); if (cats.length === 0) return null; return cats.map((c) => <span key={c} style={{ fontSize: size, padding: "1px 5px", borderRadius: 3, background: "var(--t-border-s, #1A1A28)", color: "var(--t-text2, #9898AE)", fontWeight: 500, whiteSpace: "nowrap" }}>{c}</span>); };

function Modal({ onClose, title, children, wide }) {
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{ background: "var(--t-modal, rgba(15,15,22,.92))", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: 16, border: "1px solid var(--t-border, rgba(255,255,255,.06))", padding: "24px 28px", width: wide ? 940 : 580, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--t-shadow, 0 24px 80px rgba(0,0,0,.6))" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--t-text, #F0F0F5)" }}>{title}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t-muted, #5E5E72)", fontSize: 18 }}>✕</button>
      </div>{children}
    </div></div>);
}

function TaskForm({ task, onChange, onSubmit, btnLabel, team, locs, subs, cats, locLabel, subLabel, isPM, isEdit }) {
  const ls = subs[task.loc] || [];
  const statusEntries = Object.entries(STA).filter(([k]) => isPM || k !== "resolved");
  const selCats = (task.category || "").split(",").filter(Boolean);
  const toggleCat = (c) => {
    const next = selCats.includes(c) ? selCats.filter((x) => x !== c) : [...selCats, c];
    onChange({ ...task, category: next.join(",") });
  };
  const isDS = task.task_type === "drawing_set";
  return (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div><label style={lb}>Task Title</label><input value={task.title} onChange={(e) => onChange({ ...task, title: e.target.value })} placeholder="Describe the open item…" style={{ ...ins, width: "100%" }} /></div>
    {FEATURES.DRAWING_SETS && !isEdit && <div style={{ display: "grid", gridTemplateColumns: isDS ? "1fr 1fr" : "1fr", gap: 12 }}>
      <div><label style={lb}>Type</label><select value={task.task_type || "task"} onChange={(e) => onChange({ ...task, task_type: e.target.value, _template: e.target.value === "drawing_set" ? "architectural" : undefined })} style={{ ...sl, width: "100%", borderColor: isDS ? DS_CORAL : undefined }}><option value="task">Task</option><option value="drawing_set">Drawing Set</option></select></div>
      {isDS && <div><label style={lb}>Template</label><select value={task._template || "architectural"} onChange={(e) => onChange({ ...task, _template: e.target.value })} style={{ ...sl, width: "100%" }}><option value="architectural">Architectural (34 items)</option><option value="civil">Civil / Landscape (12 items)</option></select></div>}
    </div>}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      <div><label style={lb}>{locLabel}</label><select value={task.loc} onChange={(e) => onChange({ ...task, loc: e.target.value, sub: "" })} style={{ ...sl, width: "100%" }}><option value="">— None —</option>{locs.map((l) => <option key={l.id} value={l.id}>{l.id}: {l.name}</option>)}</select></div>
      <div><label style={lb}>{subLabel}</label><select value={task.sub || ""} onChange={(e) => onChange({ ...task, sub: e.target.value })} style={{ ...sl, width: "100%" }}><option value="">— None —</option>{ls.map((s) => <option key={s.id} value={s.id}>{s.id}: {s.name}</option>)}</select></div>
      <div><label style={lb}>Priority</label><select value={task.priority} onChange={(e) => onChange({ ...task, priority: e.target.value })} style={{ ...sl, width: "100%" }}>{Object.entries(PRI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
    </div>
    <div><label style={lb}>Categories</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {cats.map((c) => <button key={c} type="button" onClick={() => toggleCat(c)} style={{ padding: "4px 10px", borderRadius: 4, border: `1px solid ${selCats.includes(c) ? "var(--t-text, #FFF)" : "var(--t-border, #333)"}`, background: selCats.includes(c) ? "var(--t-elevated, #252525)" : "var(--t-elevated, #252525)", color: selCats.includes(c) ? "var(--t-text, #FFF)" : "var(--t-muted, #888)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: F, transition: "all .15s" }}>{c}</button>)}
        {cats.length === 0 && <span style={{ fontSize: 11, color: "var(--t-muted, #5E5E72)" }}>No categories defined. Add in Settings.</span>}
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      <div><label style={lb}>Status</label><select value={task.status} onChange={(e) => onChange({ ...task, status: e.target.value })} style={{ ...sl, width: "100%" }}>{statusEntries.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
      <div><label style={lb}>Assignee</label><select value={task.assignee || ""} onChange={(e) => onChange({ ...task, assignee: e.target.value || null })} style={{ ...sl, width: "100%" }}><option value="">Unassigned</option>{team.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}</select></div>
      <div><label style={lb}>Due Date</label><input type="date" value={task.dueDate || ""} onChange={(e) => onChange({ ...task, dueDate: e.target.value })} style={{ ...ins, width: "100%" }} /></div>
    </div>
    <div><label style={lb}>Notes</label><textarea value={task.notes || ""} onChange={(e) => onChange({ ...task, notes: e.target.value })} rows={3} style={{ ...ins, width: "100%", resize: "vertical" }} /></div>
    <button onClick={onSubmit} style={{ ...bs, background: "var(--t-text, #FFF)", color: "var(--t-bg, #191919)", width: "100%", padding: "12px", fontWeight: 600 }}>{btnLabel}</button>
  </div>);
}

export default function ProjectDetail({ project: p, userId, isPM, permissions = {}, onCreateTask, onUpdateTask, onDeleteTask, onReload, onEditProject, onDeleteProject, theme: T = {} }) {
  const { role: permRole, canDo } = usePermissions({ projectId: p.id });
  const allSubs = useMemo(() => Object.values(p.subs).flat(), [p.subs]);
  const tm = p.team || [];
  const [vw, setVw] = useState("board");
  const [sL, setSL] = useState("all");
  const [fP, setFP] = useState("all");
  const [fS, setFS] = useState("all");
  const [fA, setFA] = useState("all");
  const [fSub, setFSub] = useState("all");
  const [q, setQ] = useState("");
  const [drag, setDrag] = useState(null);
  const [showC, setShowC] = useState(false);
  const [showE, setShowE] = useState(false);
  const [eT, setET] = useState(null);
  const [showAs, setShowAs] = useState(null);
  const [showM, setShowM] = useState(false);
  const [notes, setNotes] = useState("");
  const [ext, setExt] = useState([]);
  const [showX, setShowX] = useState(false);
  const emp = { title: "", loc: p.locs[0]?.id || "", sub: "", priority: "medium", status: "open", assignee: null, category: p.cats[0] || "", dueDate: "", notes: "", source: "manual", task_type: "task" };
  const [nT, setNT] = useState(emp);
  const [showSettings, setShowSettings] = useState(false);
  const [sTab, setSTab] = useState("team");
  const [showEditProject, setShowEditProject] = useState(false);
  const [editProjData, setEditProjData] = useState({ name: p.name, subtitle: p.subtitle || "", location: p.location || "", icon: p.icon, color: p.color, locLabel: p.locLabel, subLabel: p.subLabel });
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [invName, setInvName] = useState("");
  const [invCompany, setInvCompany] = useState("");
  const [invRole, setInvRole] = useState("viewer");
  const [invStatus, setInvStatus] = useState("");
  const [invLoading, setInvLoading] = useState(false);
  const [newLocCode, setNewLocCode] = useState("");
  const [newLocName, setNewLocName] = useState("");
  const [newLocColor, setNewLocColor] = useState(TEAM_COLORS[0]);
  const [newLocDesc, setNewLocDesc] = useState("");
  const [addSubFor, setAddSubFor] = useState(null);
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [editLoc, setEditLoc] = useState(null); // {code, name, color, desc, _origCode}
  const [editSub, setEditSub] = useState(null); // {code, name, _origCode, _locCode}
  const [expandCard, setExpandCard] = useState(null); // task id for expanded card modal
  const [addSubForBoard, setAddSubForBoard] = useState(null); // parent task id for adding sub-task from board
  const [inlineNew, setInlineNew] = useState(false);
  const [inlineTask, setInlineTask] = useState({ title: "", loc: p.locs[0]?.id || "", sub: "", priority: "medium", status: "open", assignee: null, category: "", dueDate: "" });
  const submitInline = async () => { if (!inlineTask.title.trim()) return; await onCreateTask({ ...inlineTask, notes: "", source: "manual" }); setInlineTask({ title: "", loc: p.locs[0]?.id || "", sub: "", priority: "medium", status: "open", assignee: null, category: "", dueDate: "" }); };
  const [deleteConfirm, setDeleteConfirm] = useState(null); // {taskId, title, hasChildren, childCount}
  const [listSort, setListSort] = useState({ col: "priority", dir: "asc" });
  const [collapsedRows, setCollapsedRows] = useState({});
  const [boardSort, setBoardSort] = useState("priority");
  const [boardGroup, setBoardGroup] = useState("status"); // "status" or "priority"
  const priOrd = { critical: 0, high: 1, medium: 2, low: 3 };

  const childMap = useMemo(() => {
    const m = {};
    p.tasks.forEach((t) => { if (t.parent_task_id) { if (!m[t.parent_task_id]) m[t.parent_task_id] = []; m[t.parent_task_id].push(t); } });
    return m;
  }, [p.tasks]);

  // Collapsible phase state for drawing set checklists
  const [dsCollapsed, setDsCollapsed] = useState({});
  const toggleDsPhase = (taskId, phase) => setDsCollapsed(prev => ({ ...prev, [`${taskId}-${phase}`]: !prev[`${taskId}-${phase}`] }));

  // Inline drawing set checklist for board cards
  const DSChecklist = ({ taskId }) => {
    const children = childMap[taskId] || [];
    const checkItems = children.filter(c => c.task_type === "checklist_item");
    if (checkItems.length === 0) return null;
    const done = checkItems.filter(c => c.status === "resolved").length;
    return (
      <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8, borderTop: `1px solid ${DS_CORAL}33`, paddingTop: 6 }}>
        <div style={{ fontSize: 9, color: DS_CORAL, fontFamily: M, marginBottom: 4 }}>{done}/{checkItems.length} deliverables</div>
        {DRAWING_SET_PHASES.map(({ key, label, color }) => {
          const items = checkItems.filter(c => c.phase === key);
          if (items.length === 0) return null;
          const pDone = items.filter(c => c.status === "resolved").length;
          const isCol = dsCollapsed[`${taskId}-${key}`] !== undefined ? dsCollapsed[`${taskId}-${key}`] : true;
          return (
            <div key={key} style={{ marginBottom: 2 }}>
              <div onClick={() => toggleDsPhase(taskId, key)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 0", cursor: "pointer" }}>
                <span style={{ fontSize: 8, transform: isCol ? "rotate(0deg)" : "rotate(90deg)", transition: "transform .15s", display: "inline-block", color: T.textMuted }}>▶</span>
                <span style={{ fontSize: 9, fontWeight: 600, color }}>{label}</span>
                <span style={{ fontSize: 8, color: pDone === items.length ? "#0F7B6C" : T.textMuted, fontFamily: M, marginLeft: "auto" }}>{pDone}/{items.length}</span>
              </div>
              {!isCol && <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 12, marginBottom: 4 }}>
                {items.map(item => (
                  <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 0", cursor: "pointer", opacity: item.status === "resolved" ? 0.5 : 1 }}>
                    <input type="checkbox" checked={item.status === "resolved"} onChange={() => onUpdateTask(item.id, { status: item.status === "resolved" ? "open" : "resolved" })} style={{ accentColor: color, width: 11, height: 11, cursor: "pointer", flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: T.text, textDecoration: item.status === "resolved" ? "line-through" : "none", fontFamily: F }}>{item.title}</span>
                  </label>
                ))}
              </div>}
            </div>
          );
        })}
      </div>
    );
  };

  // Inline sub-task list for board cards (non-checklist children only for drawing_set parents)
  const SubTaskList = ({ taskId, parentType }) => {
    const children = childMap[taskId] || [];
    const subs = parentType === "drawing_set" ? children.filter(c => c.task_type !== "checklist_item") : children;
    if (subs.length === 0) return null;
    return (
      <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8, borderTop: "1px solid var(--t-border, #252535)", paddingTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 9, color: T.textMuted, fontFamily: M }}>{subs.filter((c) => c.status === "resolved").length}/{subs.length} sub-tasks</div>
        {subs.map((ch) => { const cPr = PRI[ch.priority], cSta = STA[ch.status], cA = tm.find((m) => m.id === ch.assignee);
          return (
            <div key={ch.id} onClick={() => opnE(ch)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", background: "rgba(15,15,22,.4)", borderRadius: 4, borderLeft: `2px solid ${cPr.color}`, cursor: "pointer", opacity: ch.status === "resolved" ? 0.5 : 1 }}>
              <span style={{ fontSize: 8, padding: "1px 3px", borderRadius: 2, background: cSta.bg, color: cSta.color, fontWeight: 600 }}>{cSta.label}</span>
              <span style={{ fontSize: 10, color: ch.status === "resolved" ? T.textMuted : "#E0E0E8", flex: 1, textDecoration: ch.status === "resolved" ? "line-through" : "none" }}>{ch.title.length > 30 ? ch.title.substring(0, 30) + "…" : ch.title}</span>
              {cA && <div style={{ width: 14, height: 14, borderRadius: "50%", background: cA.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 5, fontWeight: 700, color: "white" }}>{av(cA.name)}</div>}
            </div>);
        })}
      </div>
    );
  };

  const filAll = p.tasks.filter((t) => {
    if (sL !== "all" && t.loc !== sL) return false;
    if (fP !== "all" && t.priority !== fP) return false;
    if (fS !== "all" && t.status !== fS) return false;
    if (fA === "un" && t.assignee !== null) return false;
    if (fA !== "all" && fA !== "un" && t.assignee !== fA) return false;
    if (fSub !== "all" && (t.sub || "") !== fSub) return false;
    if (q && !t.title.toLowerCase().includes(q.toLowerCase()) && !(t.notes || "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const fil = filAll.filter((t) => {
    if (t.parent_task_id && t.parent_task_id !== "null" && t.parent_task_id !== "") return false;
    return true;
  });
  const _debugSubs = filAll.length - fil.length; // sub-tasks filtered out
  const getChildren = (taskId) => (childMap[taskId] || []).filter((c) => filAll.find((f) => f.id === c.id) || !q && !fP !== "all");

  // Sort helpers
  const sortByBoard = (tasks) => [...tasks].sort((a, b) => {
    const aRes = a.status === "resolved" ? 1 : 0, bRes = b.status === "resolved" ? 1 : 0;
    if (aRes !== bRes) return aRes - bRes;
    if (boardSort === "priority") return (priOrd[a.priority] ?? 9) - (priOrd[b.priority] ?? 9);
    if (!a.dueDate && !b.dueDate) return 0; if (!a.dueDate) return 1; if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
  const sortByList = (tasks) => {
    const c = listSort.col, d = listSort.dir === "asc" ? 1 : -1;
    return [...tasks].sort((a, b) => {
      if (c === "priority") return d * ((priOrd[a.priority] ?? 9) - (priOrd[b.priority] ?? 9));
      if (c === "status") return d * (Object.keys(STA).indexOf(a.status) - Object.keys(STA).indexOf(b.status));
      if (c === "due") { if (!a.dueDate && !b.dueDate) return 0; if (!a.dueDate) return d; if (!b.dueDate) return -d; return d * a.dueDate.localeCompare(b.dueDate); }
      if (c === "assignee") { const an = tm.find((m) => m.id === a.assignee)?.name || "zzz"; const bn = tm.find((m) => m.id === b.assignee)?.name || "zzz"; return d * an.localeCompare(bn); }
      if (c === "loc") return d * (a.loc || "").localeCompare(b.loc || "");
      if (c === "sub") return d * (a.sub || "").localeCompare(b.sub || "");
      if (c === "category") return d * (a.category || "").localeCompare(b.category || "");
      if (c === "task") return d * a.title.localeCompare(b.title);
      return 0;
    });
  };
  const toggleListSort = (col) => setListSort((s) => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });

  const addT = async () => { if (!nT.title.trim()) return; await onCreateTask(nT); setNT({ ...emp }); setShowC(false); };
  const savE = () => { if (!eT?.title.trim()) return; onUpdateTask(eT.id, eT); setET(null); setShowE(false); };
  const opnE = (t) => { setET({ ...t }); setShowE(true); };
  const delT = (id) => { onDeleteTask(id); if (eT?.id === id) { setShowE(false); setET(null); } setDeleteConfirm(null); };
  const confirmDel = (task) => { const children = childMap[task.id] || []; setDeleteConfirm({ taskId: task.id, title: task.title, hasChildren: children.length > 0, childCount: children.length }); };
  const startAddSub = (taskId) => { const parent = p.tasks.find((t) => t.id === taskId); setNT({ ...emp, loc: parent?.loc || "", sub: parent?.sub || "", priority: "medium" }); setAddSubForBoard(taskId); };
  const onDr = (field, value) => { if (drag) { onUpdateTask(drag.id, { [field]: value }); setDrag(null); } };

  const loadAllUsers = async () => { const { data } = await supabase.from("profiles").select("*"); setAllUsers(data || []); };
  const addMemberFromList = async (uid) => {
    await supabase.from("project_members").insert({ project_id: p.id, user_id: uid, role: "member" });
    onReload();
  };
  const removeMember = async (uid) => {
    await supabase.from("project_members").delete().eq("project_id", p.id).eq("user_id", uid);
    onReload();
  };
  const addLocation = async () => {
    if (!newLocCode.trim() || !newLocName.trim()) return;
    await supabase.from("locations").insert({ project_id: p.id, code: newLocCode.trim(), name: newLocName.trim(), color: newLocColor, accent: newLocColor + "99", description: newLocDesc, sort_order: p.locs.length });
    setNewLocCode(""); setNewLocName(""); setNewLocDesc(""); onReload();
  };
  const removeLocation = async (code) => {
    const { data } = await supabase.from("locations").select("id").eq("project_id", p.id).eq("code", code).single();
    if (data) await supabase.from("locations").delete().eq("id", data.id);
    onReload();
  };
  const addSubLocation = async (locCode) => {
    if (!newSubCode.trim() || !newSubName.trim()) return;
    const { data: loc } = await supabase.from("locations").select("id").eq("project_id", p.id).eq("code", locCode).single();
    if (!loc) return;
    await supabase.from("sub_locations").insert({ location_id: loc.id, code: newSubCode.trim(), name: newSubName.trim(), sort_order: (p.subs[locCode] || []).length });
    setNewSubCode(""); setNewSubName(""); setAddSubFor(null); onReload();
  };
  const removeSubLocation = async (subCode) => {
    const { data } = await supabase.from("sub_locations").select("id").eq("code", subCode).single();
    if (data) await supabase.from("sub_locations").delete().eq("id", data.id);
    onReload();
  };
  const saveLocation = async () => {
    if (!editLoc || !editLoc.name.trim()) return;
    const { data: loc } = await supabase.from("locations").select("id").eq("project_id", p.id).eq("code", editLoc._origCode).single();
    if (!loc) return;
    await supabase.from("locations").update({ code: editLoc.code.trim(), name: editLoc.name.trim(), color: editLoc.color, accent: editLoc.color + "99", description: editLoc.desc || "" }).eq("id", loc.id);
    // If code changed, update tasks that reference the old code
    if (editLoc.code.trim() !== editLoc._origCode) {
      await supabase.from("tasks").update({ location_code: editLoc.code.trim() }).eq("project_id", p.id).eq("location_code", editLoc._origCode);
    }
    setEditLoc(null); onReload();
  };
  const saveSubLocation = async () => {
    if (!editSub || !editSub.name.trim()) return;
    const { data: sub } = await supabase.from("sub_locations").select("id").eq("code", editSub._origCode).single();
    if (!sub) return;
    await supabase.from("sub_locations").update({ code: editSub.code.trim(), name: editSub.name.trim() }).eq("id", sub.id);
    // If code changed, update tasks that reference the old code
    if (editSub.code.trim() !== editSub._origCode) {
      await supabase.from("tasks").update({ sub_location_code: editSub.code.trim() }).eq("project_id", p.id).eq("sub_location_code", editSub._origCode);
    }
    setEditSub(null); onReload();
  };
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await supabase.from("categories").insert({ project_id: p.id, name: newCatName.trim(), sort_order: p.cats.length });
    setNewCatName(""); onReload();
  };
  const removeCategory = async (name) => {
    const { data } = await supabase.from("categories").select("id").eq("project_id", p.id).eq("name", name).single();
    if (data) await supabase.from("categories").delete().eq("id", data.id);
    onReload();
  };

  const scrub = () => {
    const lines = notes.split("\n").filter((l) => l.trim()); const ex = [];
    const kw = ["need to","needs to","required","to provide","to review","to develop","to study","to resolve","to update","to issue","coordinate with","requested change"];
    lines.forEach((line) => { if (!kw.some((k) => line.toLowerCase().includes(k))) return;
      let loc = ""; for (const l of p.locs) { if (line.toLowerCase().includes(l.name.toLowerCase()) || line.includes(l.id)) { loc = l.id; break; } }
      let pri = "medium"; if (/behind schedule|delayed|conflict/i.test(line)) pri = "high"; if (/safety|egress|critical/i.test(line)) pri = "critical";
      let ass = null, cat = p.cats[0] || "";
      if (/structural|steel/i.test(line)) { if (p.cats.includes("Structural")) cat = "Structural"; const m = tm.find((u) => u.role?.toLowerCase().includes("structural")); if (m) ass = m.id; }
      if (/architect/i.test(line) && !/landscape/i.test(line)) { if (p.cats.includes("Design")) cat = "Design"; const m = tm.find((u) => /architect/i.test(u.role||"") && !/landscape/i.test(u.role||"")); if (m) ass = m.id; }
      if (/mep|hvac|electrical|mechanical|plumbing/i.test(line)) { if (p.cats.includes("MEP")) cat = "MEP"; const m = tm.find((u) => /mep/i.test(u.role||"")); if (m) ass = m.id; }
      const dm = line.match(/(?:by|before|until)\s+(March|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Jan|Feb)\w*\s+(\d{1,2})/i);
      let dd = ""; if (dm) { const mo = {jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"}; dd = `2026-${mo[dm[1].toLowerCase().substring(0,3)]}-${dm[2].padStart(2,"0")}`; }
      const cl = line.replace(/^\d+\.\s*/,"").trim();
      ex.push({ title: cl.length>80?cl.substring(0,80)+"…":cl, loc, sub:"", priority:pri, status:"open", assignee:ass, category:cat, dueDate:dd, notes:cl, source:"meeting", sel:true });
    }); setExt(ex); setShowX(true);
  };
  const impX = async () => { for (const t of ext.filter((t) => t.sel)) { const {sel,...task} = t; await onCreateTask(task); } setExt([]); setShowX(false); setShowM(false); };

  const st = { tot:p.tasks.length, opn:p.tasks.filter((t)=>t.status==="open").length, prg:p.tasks.filter((t)=>t.status==="in_progress").length, blk:p.tasks.filter((t)=>t.status==="blocked").length, crt:p.tasks.filter((t)=>t.priority==="critical").length, una:p.tasks.filter((t)=>!t.assignee).length, res:p.tasks.filter((t)=>t.status==="resolved").length };
  const lSt = p.locs.map((l)=>({...l,tot:p.tasks.filter((t)=>t.loc===l.id).length}));

  return (<div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 48px)"}}>
    {/* FIXED HEADER */}
    <div style={{flexShrink:0}}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:44,height:44,borderRadius:12,background:p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"white" }}>{p.icon}</div>
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <h2 style={{ margin:0,fontSize:22,fontWeight:700 }}>{p.name}</h2>
            {p.current_phase && PHASE_CONFIG[p.current_phase] && (
              canDo(ACTIONS.EDIT_PROJECT) ? (
                <select value={p.current_phase} onChange={async(e)=>{await supabase.from("projects").update({current_phase:e.target.value}).eq("id",p.id);onReload();}} style={{...sl,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:PHASE_CONFIG[p.current_phase].color+"22",color:PHASE_CONFIG[p.current_phase].color,border:`1px solid ${PHASE_CONFIG[p.current_phase].color}44`,cursor:"pointer",letterSpacing:".04em",textTransform:"uppercase"}}>
                  {Object.entries(PHASE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              ) : (
                <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:PHASE_CONFIG[p.current_phase].color+"22",color:PHASE_CONFIG[p.current_phase].color,border:`1px solid ${PHASE_CONFIG[p.current_phase].color}44`,letterSpacing:".04em",textTransform:"uppercase"}}>{PHASE_CONFIG[p.current_phase].label}</span>
              )
            )}
          </div>
          <p style={{ margin:0,fontSize:12,color:T.textMuted }}>{p.subtitle}</p>
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        {canDo(ACTIONS.EDIT_PROJECT)&&<button onClick={()=>{setEditProjData({name:p.name,subtitle:p.subtitle||"",location:p.location||"",icon:p.icon,color:p.color,locLabel:p.locLabel,subLabel:p.subLabel});setShowEditProject(true);}} style={{...bs,background:T.bgElevated,color:T.textSecondary,border:`1px solid ${T.border}`}} onMouseDown={(e)=>{e.currentTarget.style.background=T.text;e.currentTarget.style.color=T.bg;}} onMouseUp={(e)=>{e.currentTarget.style.background=T.bgElevated;e.currentTarget.style.color=T.textSecondary;}} onMouseLeave={(e)=>{e.currentTarget.style.background=T.bgElevated;e.currentTarget.style.color=T.textSecondary;}}>✎ Edit</button>}
        <button onClick={()=>{setShowSettings(true);setSTab("team");loadAllUsers();}} style={{...bs,background:T.bgElevated,color:T.textSecondary,border:`1px solid ${T.border}`}} onMouseDown={(e)=>{e.currentTarget.style.background=T.text;e.currentTarget.style.color=T.bg;}} onMouseUp={(e)=>{e.currentTarget.style.background=T.bgElevated;e.currentTarget.style.color=T.textSecondary;}} onMouseLeave={(e)=>{e.currentTarget.style.background=T.bgElevated;e.currentTarget.style.color=T.textSecondary;}}>⚙ Settings</button>
        {canDo(ACTIONS.EDIT_MEETING_NOTES)&&<button onClick={()=>setShowM(true)} style={{...bs,background:T.bgElevated,color:T.textSecondary,border:`1px solid ${T.border}`}} onMouseDown={(e)=>{e.currentTarget.style.background=T.text;e.currentTarget.style.color=T.bg;}} onMouseUp={(e)=>{e.currentTarget.style.background=T.bgElevated;e.currentTarget.style.color=T.textSecondary;}} onMouseLeave={(e)=>{e.currentTarget.style.background=T.bgElevated;e.currentTarget.style.color=T.textSecondary;}}>✦ Scrub Notes</button>}

        {canDo(ACTIONS.CREATE_TASK)&&<button onClick={()=>setShowC(true)} style={{...bs,background:T.bgElevated,color:T.textSecondary,border:`1px solid ${T.border}`}} onMouseDown={(e)=>{e.currentTarget.style.background=T.text;e.currentTarget.style.color=T.bg;}} onMouseUp={(e)=>{e.currentTarget.style.background=T.bgElevated;e.currentTarget.style.color=T.textSecondary;}} onMouseLeave={(e)=>{e.currentTarget.style.background=T.bgElevated;e.currentTarget.style.color=T.textSecondary;}}>+ New Task</button>}
      </div>
    </div>
    <div style={{background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",marginBottom:10,position:"relative"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{fontSize:10,color:T.textMuted,textTransform:"uppercase",fontFamily:M}}>Progress</span>
        <span style={{fontSize:12,fontWeight:600,color:"#0F7B6C"}}>{st.res} / {st.tot} Resolved ({st.tot?Math.round(st.res/st.tot*100):0}%)</span>
      </div>
      <div style={{height:6,background:T.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${st.tot?Math.round(st.res/st.tot*100):0}%`,background:"#0F7B6C",borderRadius:3,transition:"width .3s"}} /></div>
    </div>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16 }}>
      {[{l:"Critical",v:st.crt,c:"#E03E3E"},{l:"Unassigned",v:st.una,c:T.textMuted},{l:"Open",v:st.opn,c:"#E03E3E"},{l:"In Prog",v:st.prg,c:"#2F80ED"},{l:"Blocked",v:st.blk,c:T.textMuted}].map((s,i)=>(
        <div key={i} style={{background:T.bgInput,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",position:"relative"}}><div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:s.c}} /><div style={{fontSize:10,color:T.textMuted,textTransform:"uppercase",fontFamily:M,marginBottom:2}}>{s.l}</div><div style={{fontSize:22,fontWeight:700,color:s.c}}>{s.v}</div></div>))}
    </div>
    {p.locs.length>0&&<div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
      <button onClick={()=>setSL("all")} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:12,fontWeight:500,background:sL==="all"?T.text:T.bgElevated,color:sL==="all"?T.bg:T.textSecondary}}>All {p.locLabel}s</button>
      {p.locs.map((l)=><button key={l.id} onClick={()=>setSL(l.id)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${sL===l.id?l.accent:T.border}`,cursor:"pointer",fontSize:12,fontWeight:500,background:sL===l.id?l.color:T.bgElevated,color:sL===l.id?"white":T.textSecondary}}><span style={{width:7,height:7,borderRadius:"50%",background:l.accent,display:"inline-block",marginRight:4}} />{l.id}{lSt.find((s)=>s.id===l.id)?.tot>0&&<span style={{marginLeft:4,background:"rgba(255,255,255,.15)",borderRadius:8,padding:"0 5px",fontSize:10}}>{lSt.find((s)=>s.id===l.id)?.tot}</span>}</button>)}
    </div>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search…" style={{...ins,width:150,padding:"7px 10px",fontSize:12}} />
        <select value={fP} onChange={(e)=>setFP(e.target.value)} style={{...sl,padding:"7px 8px",fontSize:12}}><option value="all">Priority</option>{Object.entries(PRI).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>
        <select value={fS} onChange={(e)=>setFS(e.target.value)} style={{...sl,padding:"7px 8px",fontSize:12}}><option value="all">Status</option>{Object.entries(STA).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>
        <select value={fA} onChange={(e)=>setFA(e.target.value)} style={{...sl,padding:"7px 8px",fontSize:12}}><option value="all">Assignee</option><option value="un">Unassigned</option>{tm.map((m)=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
        {allSubs.length>0&&<select value={fSub} onChange={(e)=>setFSub(e.target.value)} style={{...sl,padding:"7px 8px",fontSize:12}}><option value="all">All {p.subLabel}s</option><option value="">No {p.subLabel}</option>{(sL!=="all"?(p.subs[sL]||[]):allSubs).map((s)=><option key={s.id} value={s.id}>{s.id}: {s.name}</option>)}</select>}
      </div>
      <div style={{display:"flex",background:T.bgElevated,borderRadius:6,border:`1px solid ${T.border}`,overflow:"hidden"}}>
        {["board","list","canvas"].map((v)=><button key={v} onClick={()=>setVw(v)} style={{padding:"6px 14px",fontSize:12,fontWeight:500,border:"none",cursor:"pointer",background:vw===v?T.text:"transparent",color:vw===v?T.bg:T.textMuted,textTransform:"capitalize"}}>{v}</button>)}
      </div>
    </div>
    </div>{/* END FIXED HEADER */}

    {/* SCROLLABLE CONTENT */}
    <div style={{flex:1,overflowY:"auto",overflowX:"hidden",paddingTop:4}}>

    {/* Drawing Sets */}

    {vw==="board"&&<>
      <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:10,color:T.textMuted}}>Group by:</span>
        {[{id:"status",label:"Status"},{id:"priority",label:"Priority"},{id:"assignee",label:"Assignee"},{id:"location",label:p.locLabel},{id:"sublocation",label:p.subLabel}].map((g)=><button key={g.id} onClick={()=>setBoardGroup(g.id)} style={{...bs,padding:"3px 10px",fontSize:11,background:boardGroup===g.id?T.text:T.bgElevated,color:boardGroup===g.id?T.bg:T.textMuted}}>{g.label}</button>)}
        <div style={{width:1,height:16,background:T.border,margin:"0 4px"}} />
        <span style={{fontSize:10,color:T.textMuted}}>Sort:</span>
        {["priority","deadline"].map((s)=><button key={s} onClick={()=>setBoardSort(s)} style={{...bs,padding:"3px 10px",fontSize:11,background:boardSort===s?T.text:T.bgElevated,color:boardSort===s?T.bg:T.textMuted}}>{s==="priority"?"Priority":"Due Date"}</button>)}
      </div>
      {boardGroup==="status"&&<div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,overflowX:"auto"}}>
      {Object.entries(STA).map(([status,cfg])=>{const col=sortByBoard(fil.filter((t)=>t.status===status));return(
        <div key={status} onDragOver={(e)=>e.preventDefault()} onDrop={()=>onDr("status",status)} style={{background:T.bgCard,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:10,border:`1px solid ${T.border}`,minHeight:360}}>
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:cfg.color}} /><span style={{fontSize:12,fontWeight:600}}>{cfg.label}</span></div>
            <span style={{background:T.border,borderRadius:8,padding:"1px 6px",fontSize:11,color:T.textSecondary,fontFamily:M}}>{col.length}</span>
          </div>
          <div style={{padding:8,display:"flex",flexDirection:"column",gap:6}}>
            {col.map((task)=>{const loc=p.locs.find((l)=>l.id===task.loc),a=tm.find((m)=>m.id===task.assignee),pr=PRI[task.priority],sub=task.sub?allSubs.find((s)=>s.id===task.sub):null;
            const children=childMap[task.id]||[];const isDS=task.task_type==="drawing_set";
            return(<div key={task.id} draggable onDragStart={()=>setDrag(task)} onDragEnd={()=>setDrag(null)} onClick={()=>setExpandCard(task.id)} style={{background:isDS?`${DS_CORAL}08`:T.bgElevated,border:`1px solid ${isDS?DS_CORAL+"44":T.border}`,borderLeft:`3px solid ${isDS?DS_CORAL:pr.color}`,borderRadius:"0 6px 6px 0",padding:"10px 12px",cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{isDS&&<Tg bg={DS_CORAL+"22"} fg={DS_CORAL}>Drawing Set</Tg>}{loc&&<Tg bg={loc.color} fg="white">{task.loc}</Tg>}{sub&&<Tg bg={T.borderSubtle} fg={T.textSecondary} title={sub.name}>{sub.id}</Tg>}<Tg bg={pr.bg} fg={pr.color}>{pr.label}</Tg>{task.source==="meeting"&&<Tg bg="#FAF5FF" fg="#9333EA">✦</Tg>}<CatTags cat={task.category}/></div>
                <div style={{display:"flex",gap:3}}>
                  {canDo(ACTIONS.CREATE_TASK)&&<button onClick={(e)=>{e.stopPropagation();startAddSub(task.id);}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10}} title="Add sub-task">+</button>}
                  <button onClick={(e)=>{e.stopPropagation();opnE(task);}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10,display:canDo(ACTIONS.EDIT_TASK,{isOwner:task.assignee===userId})?"inline":"none"}} title="Edit">✎</button>
                  {canDo(ACTIONS.DELETE_TASK)&&<button onClick={(e)=>{e.stopPropagation();confirmDel(task);}} style={{background:"none",border:"none",cursor:"pointer",color:"#E03E3E",fontSize:11,opacity:0.6}} title="Delete">🗑</button>}
                </div>
              </div>
              <div style={{fontSize:isDS?13:12,fontWeight:isDS?700:500,lineHeight:1.3,marginBottom:6}}>{task.title}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                {a?<div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:20,height:20,borderRadius:"50%",background:a.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:"white"}}>{av(a.name)}</div><span style={{fontSize:10,color:T.textSecondary}}>{a.name}</span></div>
                :<button onClick={(e)=>{e.stopPropagation();setShowAs(task.id);}} style={{fontSize:9,color:"#CA8A04",background:"rgba(202,138,4,.1)",border:"1px dashed rgba(202,138,4,.3)",borderRadius:3,padding:"2px 6px",cursor:"pointer"}}>+ Assign</button>}
                <div style={{display:"flex",gap:6,alignItems:"center"}}>{children.length>0&&<span style={{fontSize:9,color:T.textMuted,fontFamily:M}}>{children.filter((c)=>c.status==="resolved").length}/{children.length}</span>}{task.dueDate&&<span style={{fontSize:9,color:T.textMuted,fontFamily:M}}>{task.dueDate}</span>}</div>
              </div>
              {isDS&&<DSChecklist taskId={task.id}/>}
              <SubTaskList taskId={task.id} parentType={task.task_type}/>
            </div>);})}
          </div></div>);})}
      </div>}
      {boardGroup==="priority"&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,overflowX:"auto"}}>
      {Object.entries(PRI).map(([priority,cfg])=>{const col=sortByBoard(fil.filter((t)=>t.priority===priority));return(
        <div key={priority} onDragOver={(e)=>e.preventDefault()} onDrop={()=>onDr("priority",priority)} style={{background:T.bgCard,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:10,border:`1px solid ${T.border}`,minHeight:360}}>
          <div style={{padding:"12px 14px",borderBottom:`2px solid ${cfg.color}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:cfg.color}} /><span style={{fontSize:12,fontWeight:600,color:cfg.color}}>{cfg.label}</span></div>
            <span style={{background:T.border,borderRadius:8,padding:"1px 6px",fontSize:11,color:T.textSecondary,fontFamily:M}}>{col.length}</span>
          </div>
          <div style={{padding:8,display:"flex",flexDirection:"column",gap:6}}>
            {col.map((task)=>{const loc=p.locs.find((l)=>l.id===task.loc),a=tm.find((m)=>m.id===task.assignee),sta=STA[task.status],sub=task.sub?allSubs.find((s)=>s.id===task.sub):null;
            const children=childMap[task.id]||[];const isDS=task.task_type==="drawing_set";
            return(<div key={task.id} draggable onDragStart={()=>setDrag(task)} onDragEnd={()=>setDrag(null)} onClick={()=>setExpandCard(task.id)} style={{background:isDS?`${DS_CORAL}08`:T.bgElevated,border:`1px solid ${isDS?DS_CORAL+"44":cfg.color+"33"}`,borderLeft:`3px solid ${isDS?DS_CORAL:sta.color}`,borderRadius:"0 6px 6px 0",padding:"10px 12px",cursor:"pointer",opacity:task.status==="resolved"?0.5:1}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{isDS&&<Tg bg={DS_CORAL+"22"} fg={DS_CORAL}>Drawing Set</Tg>}{loc&&<Tg bg={loc.color} fg="white">{task.loc}</Tg>}{sub&&<Tg bg={T.borderSubtle} fg={T.textSecondary} title={sub.name}>{sub.id}</Tg>}<Tg bg={sta.bg} fg={sta.color}>{sta.label}</Tg>{task.source==="meeting"&&<Tg bg="#FAF5FF" fg="#9333EA">✦</Tg>}<CatTags cat={task.category}/></div>
                <div style={{display:"flex",gap:3}}>
                  {canDo(ACTIONS.CREATE_TASK)&&<button onClick={(e)=>{e.stopPropagation();startAddSub(task.id);}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10}} title="Add sub-task">+</button>}
                  <button onClick={(e)=>{e.stopPropagation();opnE(task);}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10,display:canDo(ACTIONS.EDIT_TASK,{isOwner:task.assignee===userId})?"inline":"none"}} title="Edit">✎</button>
                  {canDo(ACTIONS.DELETE_TASK)&&<button onClick={(e)=>{e.stopPropagation();confirmDel(task);}} style={{background:"none",border:"none",cursor:"pointer",color:"#E03E3E",fontSize:11,opacity:0.6}} title="Delete">🗑</button>}
                </div>
              </div>
              <div style={{fontSize:12,fontWeight:500,lineHeight:1.3,marginBottom:6,textDecoration:task.status==="resolved"?"line-through":"none"}}>{task.title}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                {a?<div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:20,height:20,borderRadius:"50%",background:a.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:"white"}}>{av(a.name)}</div><span style={{fontSize:10,color:T.textSecondary}}>{a.name}</span></div>
                :<button onClick={(e)=>{e.stopPropagation();setShowAs(task.id);}} style={{fontSize:9,color:"#CA8A04",background:"rgba(202,138,4,.1)",border:"1px dashed rgba(202,138,4,.3)",borderRadius:3,padding:"2px 6px",cursor:"pointer"}}>+ Assign</button>}
                <div style={{display:"flex",gap:6,alignItems:"center"}}>{children.length>0&&<span style={{fontSize:9,color:T.textMuted,fontFamily:M}}>{children.filter((c)=>c.status==="resolved").length}/{children.length}</span>}{task.dueDate&&<span style={{fontSize:9,color:T.textMuted,fontFamily:M}}>{task.dueDate}</span>}</div>
              </div>
              {task.task_type==="drawing_set"&&<DSChecklist taskId={task.id}/>}
              <SubTaskList taskId={task.id} parentType={task.task_type}/>
            </div>);})}
          </div></div>);})}
      </div>}
      {boardGroup==="assignee"&&(()=>{
        const assignees=[...tm,{id:null,name:"Unassigned",color:T.textDim}];
        return <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(assignees.length,6)},1fr)`,gap:12,overflowX:"auto"}}>
        {assignees.map((asn)=>{const col=sortByBoard(fil.filter((t)=>asn.id?t.assignee===asn.id:!t.assignee));if(col.length===0&&asn.id)return null;return(
          <div key={asn.id||"un"} onDragOver={(e)=>e.preventDefault()} onDrop={()=>onDr("assignee",asn.id||null)} style={{background:T.bgCard,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:10,border:`1px solid ${T.border}`,minHeight:360}}>
            <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:asn.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"white"}}>{av(asn.name)}</div>
              <span style={{fontSize:12,fontWeight:600,flex:1}}>{asn.name}</span>
              <span style={{background:T.border,borderRadius:8,padding:"1px 6px",fontSize:11,color:T.textSecondary,fontFamily:M}}>{col.length}</span>
            </div>
            <div style={{padding:8,display:"flex",flexDirection:"column",gap:6}}>
              {col.map((task)=>{const loc=p.locs.find((l)=>l.id===task.loc),pr=PRI[task.priority],sta=STA[task.status],sub=task.sub?allSubs.find((s)=>s.id===task.sub):null;const children=childMap[task.id]||[];const isDS=task.task_type==="drawing_set";
              return(<div key={task.id} draggable onDragStart={()=>setDrag(task)} onDragEnd={()=>setDrag(null)} onClick={()=>setExpandCard(task.id)} style={{background:isDS?`${DS_CORAL}08`:T.bgElevated,border:`1px solid ${isDS?DS_CORAL+"44":T.border}`,borderLeft:`3px solid ${isDS?DS_CORAL:pr.color}`,borderRadius:"0 6px 6px 0",padding:"10px 12px",cursor:"pointer",opacity:task.status==="resolved"?0.5:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{isDS&&<Tg bg={DS_CORAL+"22"} fg={DS_CORAL}>Drawing Set</Tg>}{loc&&<Tg bg={loc.color} fg="white">{task.loc}</Tg>}{sub&&<Tg bg={T.borderSubtle} fg={T.textSecondary}>{sub.id}</Tg>}<Tg bg={sta.bg} fg={sta.color}>{sta.label}</Tg><Tg bg={pr.bg} fg={pr.color}>{pr.label}</Tg><CatTags cat={task.category}/></div>
                  <div style={{display:"flex",gap:3}}>{canDo(ACTIONS.CREATE_TASK)&&<button onClick={(e)=>{e.stopPropagation();startAddSub(task.id);}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10}} title="Add sub-task">+</button>}<button onClick={(e)=>{e.stopPropagation();opnE(task);}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10,display:canDo(ACTIONS.EDIT_TASK,{isOwner:task.assignee===userId})?"inline":"none"}} title="Edit">✎</button>{canDo(ACTIONS.DELETE_TASK)&&<button onClick={(e)=>{e.stopPropagation();confirmDel(task);}} style={{background:"none",border:"none",cursor:"pointer",color:"#E03E3E",fontSize:11,opacity:0.6}} title="Delete">🗑</button>}</div>
                </div>
                <div style={{fontSize:12,fontWeight:500,lineHeight:1.3,marginBottom:4}}>{task.title}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>{task.dueDate&&<span style={{fontSize:9,color:T.textMuted,fontFamily:M}}>{task.dueDate}</span>}{children.length>0&&<span style={{fontSize:9,color:T.textMuted,fontFamily:M}}>{children.filter((c)=>c.status==="resolved").length}/{children.length}</span>}</div>
                {task.task_type==="drawing_set"&&<DSChecklist taskId={task.id}/>}
              <SubTaskList taskId={task.id} parentType={task.task_type}/>
              </div>);})}
            </div></div>);}).filter(Boolean)}
        </div>;})()}
      {boardGroup==="location"&&<div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(p.locs.length+1,6)},1fr)`,gap:12,overflowX:"auto"}}>
      {[...p.locs,{id:"",name:"No "+p.locLabel,color:T.textDim,accent:T.textDim}].map((loc)=>{const col=sortByBoard(fil.filter((t)=>loc.id?t.loc===loc.id:!t.loc));if(col.length===0&&!loc.id)return null;return(
        <div key={loc.id||"none"} style={{background:T.bgCard,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:10,border:`1px solid ${T.border}`,minHeight:360}}>
          <div style={{padding:"12px 14px",borderBottom:`2px solid ${loc.color}`,display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:loc.color}} />
            <span style={{fontSize:12,fontWeight:600,flex:1}}>{loc.id?`${p.locLabel} ${loc.id} – ${loc.name}`:loc.name}</span>
            <span style={{background:T.border,borderRadius:8,padding:"1px 6px",fontSize:11,color:T.textSecondary,fontFamily:M}}>{col.length}</span>
          </div>
          <div style={{padding:8,display:"flex",flexDirection:"column",gap:6}}>
            {col.map((task)=>{const a=tm.find((m)=>m.id===task.assignee),pr=PRI[task.priority],sta=STA[task.status],sub=task.sub?allSubs.find((s)=>s.id===task.sub):null;const children=childMap[task.id]||[];const isDS=task.task_type==="drawing_set";
            return(<div key={task.id} onClick={()=>setExpandCard(task.id)} style={{background:isDS?`${DS_CORAL}08`:T.bgElevated,border:`1px solid ${isDS?DS_CORAL+"44":T.border}`,borderLeft:`3px solid ${isDS?DS_CORAL:pr.color}`,borderRadius:"0 6px 6px 0",padding:"10px 12px",cursor:"pointer",opacity:task.status==="resolved"?0.5:1}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{isDS&&<Tg bg={DS_CORAL+"22"} fg={DS_CORAL}>Drawing Set</Tg>}{sub&&<Tg bg={T.borderSubtle} fg={T.textSecondary}>{sub.id}</Tg>}<Tg bg={sta.bg} fg={sta.color}>{sta.label}</Tg><Tg bg={pr.bg} fg={pr.color}>{pr.label}</Tg><CatTags cat={task.category}/></div>
                <div style={{display:"flex",gap:3}}>{canDo(ACTIONS.CREATE_TASK)&&<button onClick={(e)=>{e.stopPropagation();startAddSub(task.id);}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10}} title="Add sub-task">+</button>}<button onClick={(e)=>{e.stopPropagation();opnE(task);}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10,display:canDo(ACTIONS.EDIT_TASK,{isOwner:task.assignee===userId})?"inline":"none"}} title="Edit">✎</button>{canDo(ACTIONS.DELETE_TASK)&&<button onClick={(e)=>{e.stopPropagation();confirmDel(task);}} style={{background:"none",border:"none",cursor:"pointer",color:"#E03E3E",fontSize:11,opacity:0.6}} title="Delete">🗑</button>}</div>
              </div>
              <div style={{fontSize:12,fontWeight:500,lineHeight:1.3,marginBottom:4}}>{task.title}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                {a?<div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:16,height:16,borderRadius:"50%",background:a.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:6,fontWeight:700,color:"white"}}>{av(a.name)}</div><span style={{fontSize:9,color:T.textSecondary}}>{a.name}</span></div>:<span/>}
                <div style={{display:"flex",gap:6}}>{task.dueDate&&<span style={{fontSize:9,color:T.textMuted,fontFamily:M}}>{task.dueDate}</span>}{children.length>0&&<span style={{fontSize:9,color:T.textMuted,fontFamily:M}}>{children.filter((c)=>c.status==="resolved").length}/{children.length}</span>}</div>
              </div>
              {task.task_type==="drawing_set"&&<DSChecklist taskId={task.id}/>}
              <SubTaskList taskId={task.id} parentType={task.task_type}/>
            </div>);})}
          </div></div>);}).filter(Boolean)}
      </div>}
      {boardGroup==="sublocation"&&(()=>{
        const subs=[...allSubs,{id:"",name:"No "+p.subLabel}];
        return <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(subs.length,6)},1fr)`,gap:12,overflowX:"auto"}}>
        {subs.map((sub)=>{const col=sortByBoard(fil.filter((t)=>sub.id?t.sub===sub.id:!t.sub));if(col.length===0&&!sub.id)return null;const parentLoc=p.locs.find((l)=>(p.subs[l.id]||[]).find((s)=>s.id===sub.id));return(
          <div key={sub.id||"none"} style={{background:T.bgCard,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:10,border:`1px solid ${T.border}`,minHeight:360}}>
            <div style={{padding:"12px 14px",borderBottom:`2px solid ${parentLoc?.color||T.textDim}`,display:"flex",flexDirection:"column",gap:2}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,fontWeight:600}}>{sub.id?`${sub.id}: ${sub.name}`:sub.name}</span><span style={{background:T.border,borderRadius:8,padding:"1px 6px",fontSize:11,color:T.textSecondary,fontFamily:M}}>{col.length}</span></div>
              {parentLoc&&<span style={{fontSize:9,color:parentLoc.color,fontFamily:M}}>{p.locLabel} {parentLoc.id}</span>}
            </div>
            <div style={{padding:8,display:"flex",flexDirection:"column",gap:6}}>
              {col.map((task)=>{const a=tm.find((m)=>m.id===task.assignee),pr=PRI[task.priority],sta=STA[task.status],loc=p.locs.find((l)=>l.id===task.loc);const children=childMap[task.id]||[];const isDS=task.task_type==="drawing_set";
              return(<div key={task.id} onClick={()=>setExpandCard(task.id)} style={{background:isDS?`${DS_CORAL}08`:T.bgElevated,border:`1px solid ${isDS?DS_CORAL+"44":T.border}`,borderLeft:`3px solid ${isDS?DS_CORAL:pr.color}`,borderRadius:"0 6px 6px 0",padding:"10px 12px",cursor:"pointer",opacity:task.status==="resolved"?0.5:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{isDS&&<Tg bg={DS_CORAL+"22"} fg={DS_CORAL}>Drawing Set</Tg>}{loc&&<Tg bg={loc.color} fg="white">{task.loc}</Tg>}<Tg bg={sta.bg} fg={sta.color}>{sta.label}</Tg><Tg bg={pr.bg} fg={pr.color}>{pr.label}</Tg><CatTags cat={task.category}/></div>
                  <div style={{display:"flex",gap:3}}>{canDo(ACTIONS.CREATE_TASK)&&<button onClick={(e)=>{e.stopPropagation();startAddSub(task.id);}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10}} title="Add sub-task">+</button>}<button onClick={(e)=>{e.stopPropagation();opnE(task);}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10,display:canDo(ACTIONS.EDIT_TASK,{isOwner:task.assignee===userId})?"inline":"none"}} title="Edit">✎</button>{canDo(ACTIONS.DELETE_TASK)&&<button onClick={(e)=>{e.stopPropagation();confirmDel(task);}} style={{background:"none",border:"none",cursor:"pointer",color:"#E03E3E",fontSize:11,opacity:0.6}} title="Delete">🗑</button>}</div>
                </div>
                <div style={{fontSize:12,fontWeight:500,lineHeight:1.3,marginBottom:4}}>{task.title}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  {a?<div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:16,height:16,borderRadius:"50%",background:a.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:6,fontWeight:700,color:"white"}}>{av(a.name)}</div><span style={{fontSize:9,color:T.textSecondary}}>{a.name}</span></div>:<span/>}
                  <div style={{display:"flex",gap:6}}>{task.dueDate&&<span style={{fontSize:9,color:T.textMuted,fontFamily:M}}>{task.dueDate}</span>}{children.length>0&&<span style={{fontSize:9,color:T.textMuted,fontFamily:M}}>{children.filter((c)=>c.status==="resolved").length}/{children.length}</span>}</div>
                </div>
                {task.task_type==="drawing_set"&&<DSChecklist taskId={task.id}/>}
              <SubTaskList taskId={task.id} parentType={task.task_type}/>
              </div>);})}
            </div></div>);}).filter(Boolean)}
        </div>;})()}
    </>}

    {vw==="list"&&<div style={{background:T.bgCard,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
        {[{l:p.locLabel,k:"loc"},{l:p.subLabel,k:"sub"},{l:"Task",k:"task"},{l:"Priority",k:"priority"},{l:"Status",k:"status"},{l:"Assignee",k:"assignee"},{l:"Category",k:"category"},{l:"Due",k:"due"},{l:"",k:"actions"}].map((h)=><th key={h.k||h.l} onClick={()=>h.k&&h.k!=="actions"&&toggleListSort(h.k)} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:listSort.col===h.k?T.text:T.textMuted,textTransform:"uppercase",fontFamily:M,cursor:h.k&&h.k!=="actions"?"pointer":"default",userSelect:"none"}}>{h.l}{listSort.col===h.k?<span style={{marginLeft:4}}>{listSort.dir==="asc"?"▲":"▼"}</span>:""}</th>)}
      </tr></thead><tbody>
        {sortByList(fil).map((task)=>{const loc=p.locs.find((l)=>l.id===task.loc),a=tm.find((m)=>m.id===task.assignee),pr=PRI[task.priority],sta=STA[task.status],sub=task.sub?allSubs.find((x)=>x.id===task.sub):null;
        const children=childMap[task.id]||[];const isDS=task.task_type==="drawing_set";
        return(<><tr key={task.id} style={{borderBottom:`1px solid ${T.borderSubtle}`,cursor:"pointer",borderLeft:isDS?`3px solid ${DS_CORAL}`:"3px solid transparent",background:isDS?`${DS_CORAL}06`:"transparent"}} onClick={()=>setExpandCard(task.id)} >
          <td style={{padding:"8px 12px"}}>{loc?<span style={{padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600,background:loc.color,color:"white"}}>{task.loc}</span>:"—"}</td>
          <td style={{padding:"8px 12px"}}>{sub?<span style={{fontSize:10,color:T.text,background:T.borderSubtle,padding:"2px 5px",borderRadius:3}}>{sub.id}</span>:"—"}</td>
          <td style={{padding:"8px 12px",fontSize:12,fontWeight:isDS?700:500,maxWidth:280}}>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              {children.length>0&&<button onClick={(e)=>{e.stopPropagation();setCollapsedRows((r)=>({...r,[task.id]:!r[task.id]}));}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10,padding:"0 2px",width:16,flexShrink:0,transition:"transform .15s",transform:collapsedRows[task.id]?"rotate(-90deg)":"rotate(0deg)"}}>▼</button>}
              {children.length===0&&<span style={{width:16,flexShrink:0}}/>}
              {isDS&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:DS_CORAL+"22",color:DS_CORAL,fontWeight:600}}>DS</span>}
              <span>{task.title}</span>
              {children.length>0&&<span style={{marginLeft:4,fontSize:9,color:T.textMuted,fontFamily:M}}>{children.filter((c)=>c.status==="resolved").length}/{children.length}</span>}
            </div>
          </td>
          <td style={{padding:"8px 6px"}} onClick={(e)=>e.stopPropagation()}>
            <select value={task.priority} onChange={(e)=>onUpdateTask(task.id,{priority:e.target.value})} style={{background:pr.bg,color:pr.color,border:"none",borderRadius:4,padding:"3px 6px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:F,outline:"none"}}>
              {Object.entries(PRI).map(([k,v])=><option key={k} value={k} style={{background:T.bgCard,color:v.color}}>{v.label}</option>)}
            </select>
          </td>
          <td style={{padding:"8px 6px"}} onClick={(e)=>e.stopPropagation()}>
            <select value={task.status} onChange={(e)=>onUpdateTask(task.id,{status:e.target.value})} style={{background:sta.bg,color:sta.color,border:"none",borderRadius:4,padding:"3px 6px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:F,outline:"none"}}>
              {Object.entries(STA).filter(([k])=>isPM||k!=="resolved").map(([k,v])=><option key={k} value={k} style={{background:T.bgCard,color:v.color}}>{v.label}</option>)}
            </select>
          </td>
          <td style={{padding:"8px 6px"}} onClick={(e)=>e.stopPropagation()}>
            <select value={task.assignee||""} onChange={(e)=>onUpdateTask(task.id,{assignee:e.target.value||null})} style={{background:"transparent",color:a?T.text:T.textMuted,border:`1px solid ${T.border}`,borderRadius:4,padding:"3px 6px",fontSize:10,cursor:"pointer",fontFamily:F,outline:"none",maxWidth:120}}>
              <option value="" style={{background:T.bgCard}}>Unassigned</option>
              {tm.map((m)=><option key={m.id} value={m.id} style={{background:T.bgCard}}>{m.name}</option>)}
            </select>
          </td>
          <td style={{padding:"8px 8px"}}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}><CatTags cat={task.category} size={10}/></div></td>
          <td style={{padding:"8px 12px",fontSize:11,color:T.textSecondary,fontFamily:M}}>{task.dueDate||"—"}</td>
          <td style={{padding:"8px 8px"}} onClick={(e)=>e.stopPropagation()}>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {canDo(ACTIONS.CREATE_TASK)&&<button onClick={()=>startAddSub(task.id)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:4,cursor:"pointer",color:T.textMuted,fontSize:10,padding:"2px 6px",fontFamily:F}} title="Add sub-task">+ sub</button>}
              <button onClick={()=>opnE(task)} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:11}} title="Edit">✎</button>
              {canDo(ACTIONS.DELETE_TASK)&&<button onClick={()=>confirmDel(task)} style={{background:"none",border:"none",cursor:"pointer",color:"#E03E3E",fontSize:13,padding:"0 2px",opacity:0.6}} title="Delete task">🗑</button>}
            </div>
          </td>
        </tr>
        {isDS&&!collapsedRows[task.id]&&<tr key={`ds-${task.id}`}><td colSpan={9} style={{padding:"0 12px 8px 40px",background:`${DS_CORAL}06`,borderBottom:`1px solid ${T.borderSubtle}`}}><DSChecklist taskId={task.id}/></td></tr>}
        {!collapsedRows[task.id]&&(isDS?children.filter(c=>c.task_type!=="checklist_item"):children).map((ch)=>{const cLoc=p.locs.find((l)=>l.id===ch.loc),cA=tm.find((m)=>m.id===ch.assignee),cPr=PRI[ch.priority],cSta=STA[ch.status],cSub=ch.sub?allSubs.find((x)=>x.id===ch.sub):null;
        return(<tr key={ch.id} style={{borderBottom:`1px solid ${T.borderSubtle}`,cursor:"pointer",background:T.bgSubRow,opacity:ch.status==="resolved"?0.5:1}} onClick={()=>setExpandCard(ch.id)} onMouseEnter={(e)=>{e.currentTarget.style.background=T.bgHover;e.currentTarget.style.opacity="1";}} onMouseLeave={(e)=>{e.currentTarget.style.background=T.bgSubRow;e.currentTarget.style.opacity=ch.status==="resolved"?"0.5":"1";}}>
          <td style={{padding:"6px 12px 6px 24px"}}>{cLoc?<span style={{padding:"1px 6px",borderRadius:3,fontSize:10,fontWeight:600,background:cLoc.color,color:"white"}}>{ch.loc}</span>:"—"}</td>
          <td style={{padding:"6px 12px"}}>{cSub?<span style={{fontSize:9,color:T.text,background:T.borderSubtle,padding:"1px 4px",borderRadius:3}}>{cSub.id}</span>:"—"}</td>
          <td style={{padding:"6px 12px",fontSize:11,fontWeight:400,maxWidth:280,color:T.textSecondary}}><span style={{color:T.textDim,marginRight:6}}>↳</span>{ch.title}</td>
          <td style={{padding:"6px 6px"}} onClick={(e)=>e.stopPropagation()}>
            <select value={ch.priority} onChange={(e)=>onUpdateTask(ch.id,{priority:e.target.value})} style={{background:cPr.bg,color:cPr.color,border:"none",borderRadius:3,padding:"2px 5px",fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:F,outline:"none"}}>
              {Object.entries(PRI).map(([k,v])=><option key={k} value={k} style={{background:T.bgCard,color:v.color}}>{v.label}</option>)}
            </select>
          </td>
          <td style={{padding:"6px 6px"}} onClick={(e)=>e.stopPropagation()}>
            <select value={ch.status} onChange={(e)=>onUpdateTask(ch.id,{status:e.target.value})} style={{background:cSta.bg,color:cSta.color,border:"none",borderRadius:3,padding:"2px 5px",fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:F,outline:"none"}}>
              {Object.entries(STA).filter(([k])=>isPM||k!=="resolved").map(([k,v])=><option key={k} value={k} style={{background:T.bgCard,color:v.color}}>{v.label}</option>)}
            </select>
          </td>
          <td style={{padding:"6px 6px"}} onClick={(e)=>e.stopPropagation()}>
            <select value={ch.assignee||""} onChange={(e)=>onUpdateTask(ch.id,{assignee:e.target.value||null})} style={{background:"transparent",color:cA?T.text:T.textMuted,border:`1px solid ${T.border}`,borderRadius:3,padding:"2px 5px",fontSize:9,cursor:"pointer",fontFamily:F,outline:"none",maxWidth:110}}>
              <option value="" style={{background:T.bgCard}}>Unassigned</option>
              {tm.map((m)=><option key={m.id} value={m.id} style={{background:T.bgCard}}>{m.name}</option>)}
            </select>
          </td>
          <td style={{padding:"6px 8px"}}><div style={{display:"flex",gap:2,flexWrap:"wrap"}}><CatTags cat={ch.category} size={9}/></div></td>
          <td style={{padding:"6px 12px",fontSize:10,color:T.textMuted,fontFamily:M}}>{ch.dueDate||"—"}</td>
          <td style={{padding:"6px 8px"}} onClick={(e)=>e.stopPropagation()}>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <button onClick={()=>opnE(ch)} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10}} title="Edit">✎</button>
              {canDo(ACTIONS.DELETE_TASK)&&<button onClick={()=>confirmDel(ch)} style={{background:"none",border:"none",cursor:"pointer",color:"#E03E3E",fontSize:12,padding:"0 2px",opacity:0.6}} title="Delete sub-task">🗑</button>}
            </div>
          </td>
        </tr>);})}
        </>);})}
        {/* Inline new task row */}
        {canDo(ACTIONS.CREATE_TASK)&&inlineNew&&<tr style={{borderBottom:`1px solid ${T.borderSubtle}`,background:T.bgElevated}}>
          <td style={{padding:"6px 8px"}}><select value={inlineTask.loc} onChange={(e)=>setInlineTask({...inlineTask,loc:e.target.value,sub:""})} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:4,padding:"3px 6px",fontSize:10,cursor:"pointer",fontFamily:F,outline:"none",maxWidth:80}}>{p.locs.map((l)=><option key={l.id} value={l.id}>{l.id}</option>)}</select></td>
          <td style={{padding:"6px 8px"}}><select value={inlineTask.sub} onChange={(e)=>setInlineTask({...inlineTask,sub:e.target.value})} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:4,padding:"3px 6px",fontSize:10,cursor:"pointer",fontFamily:F,outline:"none",maxWidth:80}}><option value="">—</option>{(p.subs[inlineTask.loc]||[]).map((s)=><option key={s.id} value={s.id}>{s.id}</option>)}</select></td>
          <td style={{padding:"6px 8px"}}><input value={inlineTask.title} onChange={(e)=>setInlineTask({...inlineTask,title:e.target.value})} onKeyDown={(e)=>{if(e.key==="Enter")submitInline();if(e.key==="Escape"){setInlineNew(false);}}} placeholder="Task title…" autoFocus style={{background:"transparent",border:"none",outline:"none",color:T.text,fontSize:12,fontWeight:500,width:"100%",fontFamily:F,padding:0}} /></td>
          <td style={{padding:"6px 6px"}}><select value={inlineTask.priority} onChange={(e)=>setInlineTask({...inlineTask,priority:e.target.value})} style={{background:PRI[inlineTask.priority].bg,color:PRI[inlineTask.priority].color,border:"none",borderRadius:4,padding:"3px 6px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:F,outline:"none"}}>{Object.entries(PRI).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></td>
          <td style={{padding:"6px 6px"}}><select value={inlineTask.status} onChange={(e)=>setInlineTask({...inlineTask,status:e.target.value})} style={{background:STA[inlineTask.status].bg,color:STA[inlineTask.status].color,border:"none",borderRadius:4,padding:"3px 6px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:F,outline:"none"}}>{Object.entries(STA).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></td>
          <td style={{padding:"6px 6px"}}><select value={inlineTask.assignee||""} onChange={(e)=>setInlineTask({...inlineTask,assignee:e.target.value||null})} style={{background:"transparent",color:T.text,border:`1px solid ${T.border}`,borderRadius:4,padding:"3px 6px",fontSize:10,cursor:"pointer",fontFamily:F,outline:"none",maxWidth:120}}><option value="">Unassigned</option>{tm.map((m)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></td>
          <td style={{padding:"6px 8px"}}><span style={{fontSize:9,color:T.textDim}}>—</span></td>
          <td style={{padding:"6px 8px"}}><input type="date" value={inlineTask.dueDate} onChange={(e)=>setInlineTask({...inlineTask,dueDate:e.target.value})} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:4,color:T.text,fontSize:10,fontFamily:F,outline:"none",padding:"2px 4px"}} /></td>
          <td style={{padding:"6px 8px"}}><div style={{display:"flex",gap:4}}>
            <button onClick={submitInline} style={{background:T.text,color:T.bg,border:"none",borderRadius:4,cursor:"pointer",fontSize:10,padding:"3px 8px",fontWeight:600,fontFamily:F}}>Add</button>
            <button onClick={()=>setInlineNew(false)} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10,fontFamily:F}}>✕</button>
          </div></td>
        </tr>}
      </tbody></table>
      {/* Notion-style + New button */}
      {canDo(ACTIONS.CREATE_TASK)&&!inlineNew&&<div onClick={()=>setInlineNew(true)} style={{padding:"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:T.textMuted,fontSize:13,borderTop:`1px solid ${T.border}`,transition:"all .12s"}} onMouseEnter={(e)=>{e.currentTarget.style.background=T.bgHover;e.currentTarget.style.color=T.text;}} onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.textMuted;}}>
        <span style={{width:18,height:18,borderRadius:4,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>+</span>
        New
      </div>}
    </div>}

    {vw==="canvas"&&<TaskCanvas project={p} onCreateTask={onCreateTask} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} onEditTask={opnE} onReload={onReload} isPM={isPM} permissions={permissions} filters={{priority:fP,status:fS,assignee:fA,subLoc:fSub}} theme={T} />}

    </div>{/* END SCROLLABLE CONTENT */}

    {showC&&<Modal onClose={()=>setShowC(false)} title="Create Task"><TaskForm task={nT} onChange={setNT} onSubmit={addT} btnLabel="Create Task" team={tm} locs={p.locs} subs={p.subs} cats={p.cats} locLabel={p.locLabel} subLabel={p.subLabel} isPM={isPM} /></Modal>}

    {showE&&eT&&<Modal onClose={()=>{setShowE(false);setET(null);}} title="Edit Task">
      <div style={{marginBottom:14,padding:"8px 12px",background:T.borderSubtle,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color:T.textMuted,fontFamily:M}}>Source: {eT.source||"manual"} · Created: {eT.created}</span>
        <button onClick={()=>delT(eT.id)} style={{...bs,background:"#E03E3E",color:"white",padding:"3px 10px",fontSize:11}}>Delete</button>
      </div>
      <TaskForm task={eT} onChange={setET} onSubmit={savE} btnLabel="Save Changes" team={tm} locs={p.locs} subs={p.subs} cats={p.cats} locLabel={p.locLabel} subLabel={p.subLabel} isPM={isPM} isEdit />
    </Modal>}

    {showAs&&<Modal onClose={()=>setShowAs(null)} title="Assign Team Member">
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {tm.map((m)=><button key={m.id} onClick={()=>{onUpdateTask(showAs,{assignee:m.id});setShowAs(null);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.bgInput,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:`1px solid ${T.border}`,borderRadius:8,cursor:"pointer",color:T.text}} onMouseEnter={(e)=>e.currentTarget.style.borderColor=m.color} onMouseLeave={(e)=>e.currentTarget.style.borderColor=T.border}>
          <div style={{width:32,height:32,borderRadius:"50%",background:m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"white"}}>{av(m.name)}</div>
          <div style={{textAlign:"left",flex:1}}><div style={{fontSize:13,fontWeight:600}}>{m.name}</div><div style={{fontSize:11,color:T.textMuted}}>{m.role}</div></div>
        </button>)}
        <button onClick={()=>{onUpdateTask(showAs,{assignee:null});setShowAs(null);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.bgElevated,border:"1px dashed #3A3A48",borderRadius:8,cursor:"pointer",color:T.textMuted}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:T.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>—</div>
          <span style={{fontSize:13}}>Remove Assignment</span>
        </button>
      </div>
    </Modal>}

    {showSettings&&<Modal onClose={()=>setShowSettings(false)} title="Project Settings" wide>
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:`1px solid ${T.border}`}}>
        {[{id:"team",label:"Team Members"},{id:"locations",label:`${p.locLabel}s & ${p.subLabel}s`},{id:"categories",label:"Categories"}].map((t)=>(
          <button key={t.id} onClick={()=>setSTab(t.id)} style={{padding:"10px 20px",fontSize:13,fontWeight:600,border:"none",borderBottom:sTab===t.id?`2px solid ${T.text}`:"2px solid transparent",cursor:"pointer",background:"transparent",color:sTab===t.id?T.text:T.textMuted,fontFamily:F}}>{t.label}</button>))}
      </div>

      {sTab==="team"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        {/* Current team - grouped by internal/external */}
        {(()=>{const internal=tm.filter((m)=>!m.is_external);const external=tm.filter((m)=>m.is_external);const companies=[...new Set(external.map((m)=>m.company||"Other"))].sort();
        return(<>
          <div style={{fontSize:13,fontWeight:600}}>Internal Team ({internal.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {internal.map((m)=>{const mRole=m.memberRole||"member";const roleCfg={admin:{bg:"#E03E3E",label:"Admin"},pm:{bg:"#2F80ED",label:"PM"},member:{bg:T.borderSubtle,label:"Member"},viewer:{bg:T.textDim,label:"Viewer"}}[mRole]||{bg:T.borderSubtle,label:mRole};
            return(<div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:T.bgElevated,border:`1px solid ${mRole==="admin"?"#E03E3E44":mRole==="pm"?"#2F80ED44":T.border}`,borderRadius:8}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:m.color||"#2F80ED",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"white"}}>{av(m.name||"?")}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{m.name}<span style={{marginLeft:6,fontSize:9,padding:"1px 5px",borderRadius:3,background:roleCfg.bg,color:"white",fontWeight:600}}>{roleCfg.label}</span></div><div style={{fontSize:11,color:T.textMuted}}>{m.role}</div></div>
              <span style={{fontSize:10,color:T.textMuted,fontFamily:M}}>{p.tasks.filter((t)=>t.assignee===m.id).length} tasks</span>
              {isPM?<select value={mRole} onChange={async(e)=>{const {error}=await supabase.from("project_members").update({role:e.target.value}).eq("project_id",p.id).eq("user_id",m.id);if(error)alert("Error: "+error.message);else onReload();}} style={{...sl,padding:"4px 8px",fontSize:11,width:90}}>
                <option value="admin">Admin</option><option value="pm">PM</option><option value="member">Member</option><option value="viewer">Viewer</option>
              </select>:<span style={{fontSize:10,color:T.textMuted,background:T.borderSubtle,padding:"3px 8px",borderRadius:4}}>{roleCfg.label}</span>}
              {canDo(ACTIONS.REMOVE_MEMBER)&&<button onClick={()=>removeMember(m.id)} style={{...bs,background:T.border,color:"#E03E3E",padding:"4px 10px",fontSize:11}}>Remove</button>}
            </div>);})}
          </div>
          {external.length>0&&<>
            <div style={{fontSize:13,fontWeight:600,borderTop:`1px solid ${T.border}`,paddingTop:12}}>External Collaborators ({external.length})</div>
            {companies.map((co)=>{const coMembers=external.filter((m)=>(m.company||"Other")===co);return(
              <div key={co}>
                <div style={{fontSize:11,fontWeight:600,color:"#CA8A04",marginBottom:4,fontFamily:M}}>{co}</div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {coMembers.map((m)=>{const mRole=m.memberRole||"viewer";const roleCfg={admin:{bg:"#E03E3E",label:"Admin"},pm:{bg:"#2F80ED",label:"PM"},member:{bg:T.borderSubtle,label:"Member"},viewer:{bg:T.textDim,label:"Viewer"}}[mRole]||{bg:T.textDim,label:mRole};
                  return(<div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 14px",background:T.bgCard,border:`1px solid ${T?.borderSubtle||"#1A1A28"}`,borderRadius:8}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:m.color||T.textMuted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"white"}}>{av(m.name||"?")}</div>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{m.name}<span style={{marginLeft:6,fontSize:9,padding:"1px 5px",borderRadius:3,background:roleCfg.bg,color:"white",fontWeight:600}}>{roleCfg.label}</span><span style={{marginLeft:4,fontSize:9,padding:"1px 4px",borderRadius:3,background:"#CA8A0422",color:"#CA8A04"}}>External</span></div><div style={{fontSize:10,color:T.textMuted}}>{m.role}</div></div>
                    {isPM?<select value={mRole} onChange={async(e)=>{await supabase.from("project_members").update({role:e.target.value}).eq("project_id",p.id).eq("user_id",m.id);onReload();}} style={{...sl,padding:"4px 8px",fontSize:11,width:90}}>
                      <option value="pm">PM</option><option value="member">Member</option><option value="viewer">Viewer</option>
                    </select>:<span style={{fontSize:10,color:T.textMuted,background:T.borderSubtle,padding:"3px 8px",borderRadius:4}}>{roleCfg.label}</span>}
                    {canDo(ACTIONS.REMOVE_MEMBER)&&<button onClick={()=>removeMember(m.id)} style={{...bs,background:T.border,color:"#E03E3E",padding:"3px 8px",fontSize:10}}>Remove</button>}
                  </div>);})}
                </div>
              </div>);})}
          </>}
        </>);})()}

        {/* Add internal from org roster */}
        {isPM&&<div style={{borderTop:`1px solid ${T.border}`,paddingTop:12}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Add Internal Members</div>
          <p style={{fontSize:11,color:T.textMuted,margin:"0 0 8px"}}>Assign org members to this project. Manage the full roster in the Team page.</p>
          <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:180,overflowY:"auto"}}>
            {allUsers.filter((u)=>!tm.find((m)=>m.id===u.id)&&!u.is_external).map((u)=>(
              <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 12px",background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:6}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:u.color||"#2F80ED",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"white"}}>{av(u.name||"?")}</div>
                <div style={{flex:1}}><span style={{fontSize:12,fontWeight:500}}>{u.name}</span><span style={{marginLeft:6,fontSize:10,color:T.textMuted}}>{u.role}</span></div>
                <button onClick={()=>addMemberFromList(u.id)} style={{...bs,background:"#0F7B6C",color:"white",padding:"3px 10px",fontSize:11}}>+ Add</button>
              </div>))}
            {allUsers.filter((u)=>!tm.find((m)=>m.id===u.id)&&!u.is_external).length===0&&<div style={{padding:10,textAlign:"center",color:T.textMuted,fontSize:11}}>All internal members assigned.</div>}
          </div>
        </div>}

        {/* Invite external */}
        {isPM&&<div style={{borderTop:`1px solid ${T.border}`,paddingTop:12}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Invite External Collaborator</div>
          <p style={{fontSize:11,color:T.textMuted,margin:"0 0 8px"}}>Consultants, contractors, or clients. They can only see this project.</p>
          <div style={{display:"flex",gap:8,marginBottom:6}}>
            <input value={invName} onChange={(e)=>setInvName(e.target.value)} placeholder="Full Name" style={{...ins,width:140,fontSize:12}} />
            <input value={invEmail} onChange={(e)=>setInvEmail(e.target.value)} placeholder="email@company.com" style={{...ins,flex:1,fontSize:12}} />
            <input value={invCompany} onChange={(e)=>setInvCompany(e.target.value)} placeholder="Company" style={{...ins,width:140,fontSize:12}} />
            <select value={invRole} onChange={(e)=>setInvRole(e.target.value)} style={{...sl,width:85,fontSize:11}}>
              <option value="viewer">Viewer</option><option value="member">Member</option><option value="pm">PM</option>
            </select>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button disabled={invLoading||!invEmail.trim()||!invName.trim()} onClick={async()=>{
              setInvLoading(true);setInvStatus("");
              try{const res=await fetch("/api/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"invite",email:invEmail.trim(),name:invName.trim(),company:invCompany.trim(),projectId:p.id,role:invRole,isExternal:true})});
              const data=await res.json();
              if(data.success){setInvStatus("✓ "+data.message);setInvEmail("");setInvName("");setInvCompany("");onReload();}else{setInvStatus("✗ "+(data.error||"Failed"));}
              }catch(err){setInvStatus("✗ "+err.message);}
              setInvLoading(false);
            }} style={{...bs,background:invLoading?T.border:"#CA8A04",color:"white",padding:"8px 16px",fontSize:12,whiteSpace:"nowrap"}}>{invLoading?"Sending…":"Invite External"}</button>
          </div>
          {invStatus&&<div style={{fontSize:11,color:invStatus.startsWith("✓")?"#0F7B6C":"#E03E3E",marginTop:6}}>{invStatus}</div>}
        </div>}
      </div>}

      {sTab==="locations"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{fontSize:13,fontWeight:600}}>Current {p.locLabel}s ({p.locs.length})</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {p.locs.map((loc)=>{const locSubs=p.subs[loc.id]||[];const isEditing=editLoc?._origCode===loc.id;return(
            <div key={loc.id} style={{background:T.bgElevated,border:`1px solid ${isEditing?T.text:T.border}`,borderRadius:8,padding:"12px 14px"}}>
              {isEditing?<div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr",gap:8}}>
                  <div><label style={lb}>Code</label><input value={editLoc.code} onChange={(e)=>setEditLoc({...editLoc,code:e.target.value})} style={{...ins,width:"100%"}} /></div>
                  <div><label style={lb}>Name</label><input value={editLoc.name} onChange={(e)=>setEditLoc({...editLoc,name:e.target.value})} style={{...ins,width:"100%"}} /></div>
                  <div><label style={lb}>Description</label><input value={editLoc.desc} onChange={(e)=>setEditLoc({...editLoc,desc:e.target.value})} style={{...ins,width:"100%"}} /></div>
                </div>
                <div><label style={lb}>Color</label><div style={{display:"flex",gap:5}}>{TEAM_COLORS.map((c)=><div key={c} onClick={()=>setEditLoc({...editLoc,color:c})} style={{width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",border:editLoc.color===c?"2px solid white":"2px solid transparent"}} />)}</div></div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>setEditLoc(null)} style={{...bs,background:T.border,color:T.textSecondary,padding:"4px 12px",fontSize:11}}>Cancel</button>
                  <button onClick={saveLocation} style={{...bs,background:T.text,color:T.bg,padding:"4px 12px",fontSize:11}}>Save</button>
                </div>
              </div>
              :<>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:locSubs.length>0||addSubFor===loc.id?10:0}}>
                <span style={{width:12,height:12,borderRadius:"50%",background:loc.color,flexShrink:0}} />
                <span style={{fontSize:14,fontWeight:600,flex:1}}>{p.locLabel} {loc.id} – {loc.name}</span>
                <span style={{fontSize:11,color:T.textMuted}}>{locSubs.length} {p.subLabel.toLowerCase()}{locSubs.length!==1?"s":""}</span>
                <button onClick={()=>setEditLoc({code:loc.id,name:loc.name,color:loc.color,desc:loc.desc||"",_origCode:loc.id})} style={{...bs,background:T.borderSubtle,color:T.textSecondary,padding:"4px 10px",fontSize:11}}>Edit</button>
                <button onClick={()=>{setAddSubFor(addSubFor===loc.id?null:loc.id);setNewSubCode("");setNewSubName("");}} style={{...bs,background:T.borderSubtle,color:T.textSecondary,padding:"4px 10px",fontSize:11}}>+ {p.subLabel}</button>
                {canDo(ACTIONS.MANAGE_LOCATIONS)&&<button onClick={()=>removeLocation(loc.id)} style={{...bs,background:T.border,color:"#E03E3E",padding:"4px 10px",fontSize:11}}>Remove</button>}
              </div>
              {locSubs.length>0&&<div style={{marginLeft:22,display:"flex",flexDirection:"column",gap:4}}>
                {locSubs.map((s)=>{const isEditingSub=editSub?._origCode===s.id;const subTaskCount=p.tasks.filter((t)=>t.sub===s.id).length;return isEditingSub?(
                  <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,background:T.bgCard,border:`1px solid ${T.text}`,borderRadius:6,padding:"8px 12px"}}>
                    <div style={{flex:0}}><label style={{...lb,marginBottom:0,fontSize:9}}>Code</label><input value={editSub.code} onChange={(e)=>setEditSub({...editSub,code:e.target.value})} style={{...ins,padding:"4px 8px",fontSize:12,width:80}} /></div>
                    <div style={{flex:1}}><label style={{...lb,marginBottom:0,fontSize:9}}>Name</label><input value={editSub.name} onChange={(e)=>setEditSub({...editSub,name:e.target.value})} style={{...ins,padding:"4px 8px",fontSize:12,width:"100%"}} onKeyDown={(e)=>{if(e.key==="Enter")saveSubLocation();if(e.key==="Escape")setEditSub(null);}} /></div>
                    <button onClick={saveSubLocation} style={{...bs,background:T.text,color:T.bg,padding:"4px 10px",fontSize:11,marginTop:12}}>Save</button>
                    <button onClick={()=>setEditSub(null)} style={{...bs,background:T.border,color:T.textSecondary,padding:"4px 10px",fontSize:11,marginTop:12}}>Cancel</button>
                  </div>
                ):(
                  <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,background:T.bgCard,borderRadius:6,padding:"8px 12px",borderLeft:`2px solid ${T?.border||"#252535"}`}}>
                    <span style={{fontSize:12,fontWeight:600,color:T.textSecondary,fontFamily:M,minWidth:50}}>{s.id}</span>
                    <span style={{fontSize:12,color:T.text,flex:1}}>{s.name}</span>
                    <span style={{fontSize:10,color:T.textDim,fontFamily:M}}>{subTaskCount} task{subTaskCount!==1?"s":""}</span>
                    <button onClick={()=>setEditSub({code:s.id,name:s.name,_origCode:s.id,_locCode:loc.id})} style={{...bs,background:T.borderSubtle,color:T.textMuted,padding:"3px 8px",fontSize:10}}>Edit</button>
                    {canDo(ACTIONS.MANAGE_LOCATIONS)&&<button onClick={()=>removeSubLocation(s.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#E03E3E",fontSize:11,padding:"0 2px"}}>✕</button>}
                  </div>
                );})}
              </div>}
              {addSubFor===loc.id&&<div style={{marginLeft:22,marginTop:8,display:"flex",gap:6}}>
                <input value={newSubCode} onChange={(e)=>setNewSubCode(e.target.value)} placeholder="Code (e.g. A-1)" style={{...ins,width:120,fontSize:12}} />
                <input value={newSubName} onChange={(e)=>setNewSubName(e.target.value)} placeholder={`${p.subLabel} name`} style={{...ins,flex:1,fontSize:12}} onKeyDown={(e)=>{if(e.key==="Enter")addSubLocation(loc.id);}} />
                <button onClick={()=>addSubLocation(loc.id)} style={{...bs,background:"#0F7B6C",color:"white",padding:"4px 12px",fontSize:11}}>Add</button>
              </div>}
              </>}
            </div>);})}
        </div>
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:12}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>Add New {p.locLabel}</div>
          <div style={{display:"grid",gridTemplateColumns:"100px 1fr 1fr auto",gap:8,alignItems:"end"}}>
            <div><label style={lb}>Code</label><input value={newLocCode} onChange={(e)=>setNewLocCode(e.target.value)} placeholder="A" style={{...ins,width:"100%"}} /></div>
            <div><label style={lb}>Name</label><input value={newLocName} onChange={(e)=>setNewLocName(e.target.value)} placeholder="Grand Entry" style={{...ins,width:"100%"}} /></div>
            <div><label style={lb}>Description</label><input value={newLocDesc} onChange={(e)=>setNewLocDesc(e.target.value)} placeholder="Optional" style={{...ins,width:"100%"}} /></div>
            <button onClick={addLocation} style={{...bs,background:"#0F7B6C",color:"white",height:42}}>+ Add</button>
          </div>
          <div style={{marginTop:8}}><label style={lb}>Color</label><div style={{display:"flex",gap:5}}>{TEAM_COLORS.map((c)=><div key={c} onClick={()=>setNewLocColor(c)} style={{width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",border:newLocColor===c?"2px solid white":"2px solid transparent"}} />)}</div></div>
        </div>
      </div>}

      {sTab==="categories"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{fontSize:13,fontWeight:600}}>Current Categories ({p.cats.length})</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {p.cats.map((cat)=>(<div key={cat} style={{display:"flex",alignItems:"center",gap:6,background:T.bgElevated,border:`1px solid ${T.border}`,borderRadius:6,padding:"6px 10px",fontSize:12}}>
            <span style={{color:T.text}}>{cat}</span>
            {canDo(ACTIONS.MANAGE_CATEGORIES)&&<button onClick={()=>removeCategory(cat)} style={{background:"none",border:"none",cursor:"pointer",color:"#E03E3E",fontSize:11,padding:0}}>✕</button>}
          </div>))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={newCatName} onChange={(e)=>setNewCatName(e.target.value)} placeholder="New category name…" style={{...ins,flex:1}} onKeyDown={(e)=>{if(e.key==="Enter")addCategory();}} />
          <button onClick={addCategory} style={{...bs,background:"#0F7B6C",color:"white"}}>+ Add</button>
        </div>
      </div>}
    </Modal>}

    {showM&&<Modal onClose={()=>{setShowM(false);setShowX(false);setExt([]);}} title="Meeting Notes Scrubber" wide>
      <div style={{display:"grid",gridTemplateColumns:showX?"1fr 1fr":"1fr",gap:20}}>
        <div>
          <label style={lb}>Meeting Notes / Minutes</label>
          <p style={{fontSize:12,color:T.textMuted,margin:"0 0 8px"}}>Paste text to extract action items, {p.locLabel.toLowerCase()}s, assignees, and due dates.</p>
          <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={16} style={{...ins,width:"100%",resize:"vertical",fontFamily:M,fontSize:12,lineHeight:1.7}} placeholder="Paste meeting notes here…" />
          <button onClick={scrub} disabled={!notes.trim()} style={{...bs,background:notes.trim()?T.text:T.border,color:notes.trim()?T.bg:T.textMuted,width:"100%",padding:"12px",fontWeight:600,marginTop:12}}>✦ Extract Action Items</button>
        </div>
        {showX&&ext.length>0&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <label style={{...lb,margin:0}}>Extracted ({ext.length})</label>
            <button onClick={impX} style={{...bs,background:"#0F7B6C",color:"white",fontWeight:600}}>Import ({ext.filter((t)=>t.sel).length})</button>
          </div>
          <div style={{maxHeight:430,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
            {ext.map((task,i)=>{const loc=p.locs.find((l)=>l.id===task.loc),a=tm.find((m)=>m.id===task.assignee);return(
              <div key={i} style={{background:task.sel?"rgba(20,20,29,.5)":"rgba(5,5,7,.4)",border:`1px solid ${task.sel?T.text:T.border}`,borderRadius:6,padding:"10px 12px",cursor:"pointer"}} onClick={()=>setExt((x)=>x.map((t,j)=>j===i?{...t,sel:!t.sel}:t))}>
                <div style={{display:"flex",gap:8}}>
                  <div style={{width:18,height:18,borderRadius:3,border:`2px solid ${task.sel?T.text:T.textDim}`,background:task.sel?T.text:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{task.sel&&<span style={{color:"white",fontSize:10}}>✓</span>}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:500,marginBottom:4}}>{task.title}</div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {loc&&<Tg bg={loc.color} fg="white">{p.locLabel} {task.loc}</Tg>}
                      <Tg bg={PRI[task.priority].bg} fg={PRI[task.priority].color}>{PRI[task.priority].label}</Tg>
                      <Tg bg={T.borderSubtle} fg={T.textSecondary}>{task.category}</Tg>
                      {a&&<Tg bg="#EFF6FF" fg="#2F80ED">{a.name}</Tg>}
                      {task.dueDate&&<span style={{fontSize:9,padding:"2px 5px",borderRadius:3,background:T.borderSubtle,color:T.textSecondary,fontFamily:M}}>{task.dueDate}</span>}
                    </div>
                  </div>
                </div>
              </div>);})}
          </div>
        </div>}
      </div>
    </Modal>}

    {/* Expanded Card Detail Modal */}
    {expandCard&&(()=>{const task=p.tasks.find((t)=>t.id===expandCard);if(!task)return null;
    const loc=p.locs.find((l)=>l.id===task.loc),a=tm.find((m)=>m.id===task.assignee),pr=PRI[task.priority],sta=STA[task.status],sub=task.sub?allSubs.find((s)=>s.id===task.sub):null;
    const children=childMap[task.id]||[];const progress=children.length?{rv:children.filter((c)=>c.status==="resolved").length,tot:children.length}:null;
    return(<Modal onClose={()=>setExpandCard(null)} title="" wide>
      <div style={{display:"flex",gap:20}}>
        {/* Left: task detail */}
        <div style={{flex:1}}>
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            {loc&&<Tg bg={loc.color} fg="white">{p.locLabel} {task.loc} – {loc.name}</Tg>}
            {sub&&<Tg bg={T.borderSubtle} fg={T.textSecondary}>{p.subLabel} {sub.id}: {sub.name}</Tg>}
            <Tg bg={sta.bg} fg={sta.color}>{sta.label}</Tg>
            <Tg bg={pr.bg} fg={pr.color}>{pr.label}</Tg>
            {task.source&&task.source!=="manual"&&<Tg bg="#FAF5FF" fg="#9333EA">✦ {task.source}</Tg>}
          </div>
          <h3 style={{margin:"0 0 8px",fontSize:18,fontWeight:700}}>{task.title}</h3>
          {task.notes&&<div style={{fontSize:13,color:T.textSecondary,lineHeight:1.6,marginBottom:12,whiteSpace:"pre-wrap"}}>{task.notes}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            <div style={{background:T.bgCard,borderRadius:6,padding:"8px 12px"}}><div style={{fontSize:9,color:T.textMuted,fontFamily:M,marginBottom:2}}>Assignee</div>{a?<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:22,height:22,borderRadius:"50%",background:a.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"white"}}>{av(a.name)}</div><span style={{fontSize:12}}>{a.name}</span></div>:<span style={{fontSize:12,color:T.textMuted}}>Unassigned</span>}</div>
            <div style={{background:T.bgCard,borderRadius:6,padding:"8px 12px"}}><div style={{fontSize:9,color:T.textMuted,fontFamily:M,marginBottom:2}}>Due Date</div><span style={{fontSize:12,color:task.dueDate?T.text:T.textMuted}}>{task.dueDate||"Not set"}</span></div>
            <div style={{background:T.bgCard,borderRadius:6,padding:"8px 12px"}}><div style={{fontSize:9,color:T.textMuted,fontFamily:M,marginBottom:4}}>Categories</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{task.category?<CatTags cat={task.category} size={11}/>:<span style={{fontSize:12,color:T.textMuted}}>—</span>}</div></div>
            <div style={{background:T.bgCard,borderRadius:6,padding:"8px 12px"}}><div style={{fontSize:9,color:T.textMuted,fontFamily:M,marginBottom:2}}>Created</div><span style={{fontSize:12,color:T.textMuted}}>{task.created}</span></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setExpandCard(null);opnE(task);}} style={{...bs,background:T.text,color:T.bg,fontSize:12}}>✎ Edit Task</button>
            {canDo(ACTIONS.CREATE_TASK)&&<button onClick={()=>{setExpandCard(null);startAddSub(task.id);}} style={{...bs,background:"#0F7B6C",color:"white",fontSize:12}}>+ Add Sub-Task</button>}
          </div>
        </div>
        {/* Right: sub-tasks */}
        <div style={{width:340,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:600}}>Sub-Tasks{progress&&<span style={{marginLeft:6,fontSize:11,color:T.textMuted,fontFamily:M}}>{progress.rv}/{progress.tot}</span>}</div>
            {canDo(ACTIONS.CREATE_TASK)&&<button onClick={()=>{setExpandCard(null);startAddSub(task.id);}} style={{...bs,background:T.bgElevated,color:T.textSecondary,padding:"3px 10px",fontSize:11}}>+ Add</button>}
          </div>
          {progress&&<div style={{height:3,background:T.border,borderRadius:2,marginBottom:10,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.round(progress.rv/progress.tot*100)}%`,background:progress.rv===progress.tot?"#0F7B6C":T.text,borderRadius:2}} /></div>}
          {children.length===0&&<div style={{padding:20,textAlign:"center",color:T.textDim,fontSize:12}}>No sub-tasks yet</div>}
          <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:400,overflowY:"auto"}}>
            {children.map((ch)=>{const cPr=PRI[ch.priority],cSta=STA[ch.status],cA=tm.find((m)=>m.id===ch.assignee);
            return(<div key={ch.id} style={{background:T.bgElevated,border:`1px solid ${T.border}`,borderLeft:`3px solid ${cPr.color}`,borderRadius:"0 6px 6px 0",padding:"8px 10px",opacity:ch.status==="resolved"?0.5:1}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{display:"flex",gap:3}}><Tg bg={cSta.bg} fg={cSta.color}>{cSta.label}</Tg><Tg bg={cPr.bg} fg={cPr.color}>{cPr.label}</Tg></div>
                <button onClick={()=>{setExpandCard(null);opnE(ch);}} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:10}}>✎</button>
              </div>
              <div style={{fontSize:12,fontWeight:500,marginBottom:4,textDecoration:ch.status==="resolved"?"line-through":"none"}}>{ch.title}</div>
              {ch.notes&&<div style={{fontSize:10,color:T.textMuted,marginBottom:4,lineHeight:1.4}}>{ch.notes.length>80?ch.notes.substring(0,80)+"…":ch.notes}</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                {cA?<div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:16,height:16,borderRadius:"50%",background:cA.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:6,fontWeight:700,color:"white"}}>{av(cA.name)}</div><span style={{fontSize:9,color:T.textSecondary}}>{cA.name}</span></div>:<span/>}
                {ch.dueDate&&<span style={{fontSize:9,color:T.textMuted,fontFamily:M}}>{ch.dueDate}</span>}
              </div>
            </div>);})}
          </div>
        </div>
      </div>
    </Modal>);})()}

    {/* Add sub-task from board */}
    {addSubForBoard&&(()=>{const parentTask=p.tasks.find((t)=>t.id===addSubForBoard);return(
    <Modal onClose={()=>{setAddSubForBoard(null);setNT({...emp});}} title="Add Sub-Task">
      <p style={{fontSize:12,color:T.textMuted,margin:"0 0 12px"}}>Under: {parentTask?.title}</p>
      <TaskForm task={nT} onChange={setNT} onSubmit={async()=>{if(!nT.title?.trim())return;await onCreateTask({...nT,loc:parentTask?.loc||"",sub:parentTask?.sub||"",parent_task_id:addSubForBoard,status:nT.status||"open",source:"manual"});setNT({...emp});setAddSubForBoard(null);}} btnLabel="Create Sub-Task" team={tm} locs={p.locs} subs={p.subs} cats={p.cats} locLabel={p.locLabel} subLabel={p.subLabel} isPM={isPM} isEdit />
    </Modal>);})()}

    {/* Delete Confirmation Modal */}
    {deleteConfirm&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,backdropFilter:"blur(6px)"}} onClick={()=>setDeleteConfirm(null)}>
      <div onClick={(e)=>e.stopPropagation()} style={{background:"var(--t-modal, rgba(15,15,22,.92))",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderRadius:16,border:"1px solid rgba(239,68,68,.15)",padding:"32px 36px",width:420,maxWidth:"90vw",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.6), 0 0 1px rgba(255,255,255,.1) inset"}}>
        <div style={{width:48,height:48,borderRadius:"50%",background:"#E03E3E18",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:22}}>🗑</div>
        <h3 style={{margin:"0 0 8px",fontSize:18,fontWeight:700,color:T.text}}>Are you sure you want to delete this task?</h3>
        <p style={{margin:"0 0 6px",fontSize:13,color:T.textSecondary,lineHeight:1.5}}>"{deleteConfirm.title}"</p>
        {deleteConfirm.hasChildren&&<p style={{margin:"0 0 16px",fontSize:12,color:"#E03E3E"}}>This will also delete {deleteConfirm.childCount} sub-task{deleteConfirm.childCount!==1?"s":""}.</p>}
        {!deleteConfirm.hasChildren&&<div style={{height:16}}/>}
        <p style={{margin:"0 0 24px",fontSize:11,color:T.textMuted}}>This action cannot be undone.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          <button onClick={()=>setDeleteConfirm(null)} style={{...bs,background:T.bgElevated,border:`1px solid ${T.border}`,color:T.textSecondary,padding:"10px 28px",fontSize:13,fontWeight:600}}>No, Cancel</button>
          <button onClick={()=>delT(deleteConfirm.taskId)} style={{...bs,background:"#E03E3E",color:"white",padding:"10px 28px",fontSize:13,fontWeight:600}}>Yes, Delete</button>
        </div>
      </div>
    </div>}

    {/* Edit Project Modal */}
    {showEditProject&&<Modal onClose={()=>setShowEditProject(false)} title="Edit Project">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label style={lb}>Project Name</label><input value={editProjData.name} onChange={(e)=>setEditProjData({...editProjData,name:e.target.value})} style={{...ins,width:"100%"}} /></div>
        <div><label style={lb}>Subtitle / Description</label><input value={editProjData.subtitle} onChange={(e)=>setEditProjData({...editProjData,subtitle:e.target.value})} style={{...ins,width:"100%"}} /></div>
        <div><label style={lb}>Location</label><input value={editProjData.location} onChange={(e)=>setEditProjData({...editProjData,location:e.target.value})} placeholder="San Antonio, TX" style={{...ins,width:"100%"}} /></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12}}>
          <div><label style={lb}>Icon</label><input value={editProjData.icon} onChange={(e)=>setEditProjData({...editProjData,icon:e.target.value})} maxLength={3} style={{...ins,width:"100%",textAlign:"center"}} /></div>
          <div><label style={lb}>Color</label><input type="color" value={editProjData.color} onChange={(e)=>setEditProjData({...editProjData,color:e.target.value})} style={{...ins,width:"100%",height:42,padding:4,cursor:"pointer"}} /></div>
          <div><label style={lb}>Location Label</label><input value={editProjData.locLabel} onChange={(e)=>setEditProjData({...editProjData,locLabel:e.target.value})} placeholder="Zone" style={{...ins,width:"100%"}} /></div>
          <div><label style={lb}>Sub-Location Label</label><input value={editProjData.subLabel} onChange={(e)=>setEditProjData({...editProjData,subLabel:e.target.value})} placeholder="Building" style={{...ins,width:"100%"}} /></div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"space-between"}}>
          {canDo(ACTIONS.DELETE_PROJECT)&&<button onClick={()=>{setShowEditProject(false);setShowDeleteProject(true);setDeleteConfirmName("");}} style={{...bs,background:"transparent",color:"#E03E3E",border:"1px solid #E03E3E33",padding:"10px 20px",fontSize:13}}>Delete Project</button>}
          <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
            <button onClick={()=>setShowEditProject(false)} style={{...bs,background:T.bgElevated,color:T.textSecondary,padding:"10px 20px"}}>Cancel</button>
            <button onClick={()=>{onEditProject(editProjData);setShowEditProject(false);}} style={{...bs,background:T.text,color:T.bg,padding:"10px 20px",fontWeight:600}}>Save Changes</button>
          </div>
        </div>
      </div>
    </Modal>}

    {/* Delete Project Modal */}
    {showDeleteProject&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1200,backdropFilter:"blur(8px)"}} onClick={()=>setShowDeleteProject(false)}>
      <div onClick={(e)=>e.stopPropagation()} style={{background:"var(--t-modal, rgba(25,25,25,.95))",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderRadius:16,border:"1px solid #E03E3E33",padding:"32px 36px",width:460,maxWidth:"90vw",textAlign:"center",boxShadow:"var(--t-shadow, 0 16px 48px rgba(0,0,0,.4))"}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:"#E03E3E15",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:26}}>🗑</div>
        <h3 style={{margin:"0 0 8px",fontSize:20,fontWeight:700,color:T.text}}>Delete Project</h3>
        <p style={{margin:"0 0 6px",fontSize:14,color:T.textSecondary,lineHeight:1.5}}>This will permanently delete <strong style={{color:T.text}}>"{p.name}"</strong> and all its tasks, locations, and team assignments.</p>
        <p style={{margin:"0 0 20px",fontSize:12,color:"#E03E3E"}}>This action cannot be undone.</p>
        <div style={{marginBottom:20}}>
          <label style={{...lb,textAlign:"left"}}>Type "{p.name}" to confirm</label>
          <input value={deleteConfirmName} onChange={(e)=>setDeleteConfirmName(e.target.value)} placeholder={p.name} style={{...ins,width:"100%",textAlign:"center",fontSize:14}} autoFocus />
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          <button onClick={()=>setShowDeleteProject(false)} style={{...bs,background:T.bgElevated,color:T.textSecondary,padding:"10px 28px",fontSize:13,fontWeight:600}}>Cancel</button>
          <button disabled={deleteConfirmName!==p.name} onClick={()=>{onDeleteProject();setShowDeleteProject(false);}} style={{...bs,background:deleteConfirmName===p.name?"#E03E3E":"#E03E3E44",color:deleteConfirmName===p.name?"white":"#E03E3E66",padding:"10px 28px",fontSize:13,fontWeight:600,cursor:deleteConfirmName===p.name?"pointer":"not-allowed"}}>Yes, Delete Project</button>
        </div>
      </div>
    </div>}
  </div>);
}
