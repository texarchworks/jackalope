"use client";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { PRIORITIES as PRI, STATUSES as STA, DS_CORAL, DRAWING_SET_PHASES } from "@/lib/constants";
import { makeAvatar as av } from "@/lib/helpers";

const M = "'IBM Plex Mono', monospace";
const F = "'Inter', -apple-system, sans-serif";
const bs = { padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: F, transition: "all .15s" };
const ins = { background: "var(--t-elevated, #14141D)", border: "1px solid var(--t-border, #252535)", borderRadius: 8, padding: "10px 14px", color: "var(--t-text, #F0F0F5)", fontSize: 13, outline: "none", fontFamily: F, boxSizing: "border-box" };
const sl = { ...ins, cursor: "pointer" };
const lb = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--t-muted, #5E5E72)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6, fontFamily: M };
const LOC_W = 200, LOC_H = 48, SUB_W = 200, SUB_H = 40, TASK_W = 260, TASK_H = 82, STASK_W = 240, STASK_H = 60, COL_GAP = 60, ROW_GAP = 18;
const DETAIL_W = 300, DETAIL_GAP = 10;
const priOrder = { critical: 0, high: 1, medium: 2, low: 3 };

function SubTaskModal({ onClose, onSubmit, team, cats, parentTitle, T = {} }) {
  const [title, setTitle] = useState(""); const [priority, setPriority] = useState("medium"); const [assignee, setAssignee] = useState(null);
  const [selCats, setSelCats] = useState([]); const [dueDate, setDueDate] = useState(""); const [notes, setNotes] = useState("");
  const toggleCat = (c) => setSelCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  const submit = () => { if (!title.trim()) return; onSubmit({ title, priority, assignee, category: selCats.join(","), dueDate, notes }); };
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{ background: "var(--t-card, #0F0F16)", borderRadius: 16, border: `1px solid ${T?.border||"#252535"}`, padding: "24px 28px", width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Sub-Task</h2><button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t-muted, #5E5E72)", fontSize: 18 }}>✕</button></div>
      <p style={{ fontSize: 12, color: "var(--t-muted, #5E5E72)", margin: "0 0 16px" }}>Under: {parentTitle}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><label style={lb}>Sub-Task Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to happen?" style={{ ...ins, width: "100%" }} autoFocus /></div>
        <div><label style={lb}>Priority</label><select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...sl, width: "100%" }}>{Object.entries(PRI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div><label style={lb}>Categories</label><div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{cats.map((c) => <button key={c} type="button" onClick={() => toggleCat(c)} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${selCats.includes(c) ? "var(--t-text, #FFF)" : "var(--t-border, #252535)"}`, background: selCats.includes(c) ? "var(--t-text, #FFF)18" : "var(--t-elevated, #252525)", color: selCats.includes(c) ? "var(--t-text, #FFF)" : "var(--t-muted, #888)", fontSize: 10, cursor: "pointer", fontFamily: F }}>{c}</button>)}</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={lb}>Assignee</label><select value={assignee || ""} onChange={(e) => setAssignee(e.target.value || null)} style={{ ...sl, width: "100%" }}><option value="">Unassigned</option>{team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div><label style={lb}>Due Date</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ ...ins, width: "100%" }} /></div>
        </div>
        <div><label style={lb}>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...ins, width: "100%", resize: "vertical" }} /></div>
        <button onClick={submit} style={{ ...bs, background: "#0F7B6C", color: "white", width: "100%", padding: "12px", fontWeight: 600 }}>Create Sub-Task</button>
      </div></div></div>);
}
function AddSubLocModal({ locCode, locLabel, subLabel, onClose, onSubmit, T = {} }) {
  const [code, setCode] = useState(""); const [name, setName] = useState("");
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{ background: "var(--t-card, #0F0F16)", borderRadius: 16, border: `1px solid ${T?.border||"#252535"}`, padding: "24px 28px", width: 420, maxWidth: "95vw" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add {subLabel}</h2><button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t-muted, #5E5E72)", fontSize: 18 }}>✕</button></div>
      <p style={{ fontSize: 12, color: "var(--t-muted, #5E5E72)", margin: "0 0 16px" }}>Under {locLabel}: {locCode}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><label style={lb}>Code</label><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. A-1" style={{ ...ins, width: "100%" }} autoFocus /></div>
        <div><label style={lb}>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${subLabel} name`} style={{ ...ins, width: "100%" }} onKeyDown={(e) => { if (e.key === "Enter" && code.trim() && name.trim()) onSubmit({ code, name }); }} /></div>
        <button onClick={() => { if (code.trim() && name.trim()) onSubmit({ code, name }); }} style={{ ...bs, background: "#0F7B6C", color: "white", width: "100%", padding: "12px", fontWeight: 600 }}>Add {subLabel}</button>
      </div></div></div>);
}
function AddTaskModal({ loc, sub, team, cats, onClose, onSubmit, T = {} }) {
  const [title, setTitle] = useState(""); const [priority, setPriority] = useState("medium"); const [assignee, setAssignee] = useState(null);
  const [selCats, setSelCats] = useState([]); const [dueDate, setDueDate] = useState(""); const [notes, setNotes] = useState("");
  const toggleCat = (c) => setSelCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  const submit = () => { if (!title.trim()) return; onSubmit({ title, priority, assignee, category: selCats.join(","), dueDate, notes, loc, sub }); };
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{ background: "var(--t-card, #0F0F16)", borderRadius: 16, border: `1px solid ${T?.border||"#252535"}`, padding: "24px 28px", width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Task</h2><button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t-muted, #5E5E72)", fontSize: 18 }}>✕</button></div>
      <p style={{ fontSize: 12, color: "var(--t-muted, #5E5E72)", margin: "0 0 16px" }}>In: {loc}{sub ? ` → ${sub}` : ""}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><label style={lb}>Task Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Describe the open item…" style={{ ...ins, width: "100%" }} autoFocus /></div>
        <div><label style={lb}>Priority</label><select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...sl, width: "100%" }}>{Object.entries(PRI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div><label style={lb}>Categories</label><div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{cats.map((c) => <button key={c} type="button" onClick={() => toggleCat(c)} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${selCats.includes(c) ? "var(--t-text, #FFF)" : "var(--t-border, #252535)"}`, background: selCats.includes(c) ? "var(--t-text, #FFF)18" : "var(--t-elevated, #252525)", color: selCats.includes(c) ? "var(--t-text, #FFF)" : "var(--t-muted, #888)", fontSize: 10, cursor: "pointer", fontFamily: F }}>{c}</button>)}</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={lb}>Assignee</label><select value={assignee || ""} onChange={(e) => setAssignee(e.target.value || null)} style={{ ...sl, width: "100%" }}><option value="">Unassigned</option>{team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div><label style={lb}>Due Date</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ ...ins, width: "100%" }} /></div>
        </div>
        <div><label style={lb}>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...ins, width: "100%", resize: "vertical" }} /></div>
        <button onClick={submit} style={{ ...bs, background: "#0F7B6C", color: "white", width: "100%", padding: "12px", fontWeight: 600 }}>Create Task</button>
      </div></div></div>);
}

export default function TaskCanvas({ project: p, onCreateTask, onUpdateTask, onDeleteTask, onEditTask, onReload, isPM, permissions = {}, filters = {}, theme: T = {} }) {
  const tm = p.team || [];
  const canvasRef = useRef(null);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(0.85);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [addSubFor, setAddSubFor] = useState(null);
  const [addSubLocFor, setAddSubLocFor] = useState(null);
  const [addTaskFor, setAddTaskFor] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [sortBy, setSortBy] = useState("priority");
  const [tagMenu, setTagMenu] = useState(null);
  const [lockedNodes, setLockedNodes] = useState({}); // {taskId: true} for multiple locked panels

  const toggleLock = (id) => setLockedNodes((prev) => { const next = { ...prev }; if (next[id]) delete next[id]; else next[id] = true; return next; });
  const isLocked = (id) => !!lockedNodes[id];

  const toggleCollapse = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const hasActiveFilter = filters.priority !== "all" || filters.status !== "all" || filters.assignee !== "all" || (filters.subLoc && filters.subLoc !== "all");

  // Check if a task matches the current filters
  const taskMatchesFilter = (task) => {
    if (!hasActiveFilter) return true;
    if (filters.priority !== "all" && task.priority !== filters.priority) return false;
    if (filters.status !== "all" && task.status !== filters.status) return false;
    if (filters.assignee === "un" && task.assignee !== null) return false;
    if (filters.assignee !== "all" && filters.assignee !== "un" && task.assignee !== filters.assignee) return false;
    if (filters.subLoc && filters.subLoc !== "all" && (task.sub || "") !== filters.subLoc) return false;
    return true;
  };

  // Sort tasks: by priority (critical first) or deadline (soonest first)
  const sortTasks = (tasks) => {
    return [...tasks].sort((a, b) => {
      // Resolved always goes to bottom
      if (a.status === "resolved" && b.status !== "resolved") return 1;
      if (a.status !== "resolved" && b.status === "resolved") return -1;
      if (sortBy === "priority") return (priOrder[a.priority] ?? 9) - (priOrder[b.priority] ?? 9);
      if (sortBy === "deadline") {
        if (!a.dueDate && !b.dueDate) return (priOrder[a.priority] ?? 9) - (priOrder[b.priority] ?? 9);
        if (!a.dueDate) return 1; if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return 0;
    });
  };

  // Build tree
  const tree = useMemo(() => {
    const tasksByLoc = {}, tasksBySub = {}, childTasks = {}, rootTasks = [];
    p.tasks.forEach((t) => {
      if (t.parent_task_id) { if (!childTasks[t.parent_task_id]) childTasks[t.parent_task_id] = []; childTasks[t.parent_task_id].push(t); }
      else if (t.sub) { if (!tasksBySub[t.sub]) tasksBySub[t.sub] = []; tasksBySub[t.sub].push(t); }
      else if (t.loc) { if (!tasksByLoc[t.loc]) tasksByLoc[t.loc] = []; tasksByLoc[t.loc].push(t); }
      else { rootTasks.push(t); }
    });
    // Sort within each group — drawing_sets always first
    const dsFirst = (arr) => { const sorted = sortTasks(arr); return sorted.sort((a, b) => (a.task_type === "drawing_set" ? 0 : 1) - (b.task_type === "drawing_set" ? 0 : 1)); };
    Object.keys(tasksByLoc).forEach((k) => { tasksByLoc[k] = dsFirst(tasksByLoc[k]); });
    Object.keys(tasksBySub).forEach((k) => { tasksBySub[k] = dsFirst(tasksBySub[k]); });
    Object.keys(childTasks).forEach((k) => { childTasks[k] = sortTasks(childTasks[k]); });
    return { tasksByLoc, tasksBySub, childTasks, rootTasks: dsFirst(rootTasks) };
  }, [p.tasks, sortBy]);

  // Layout
  const { positions, wires } = useMemo(() => {
    const pos = {}, wires = [];
    let y = 0;
    const col0 = 0, col1 = LOC_W + COL_GAP, col2Sub = SUB_W + COL_GAP + col1, col2Direct = col1;
    const col3FromSub = TASK_W + COL_GAP + col2Sub, col3Direct = TASK_W + COL_GAP + col2Direct;

    const DETAIL_H_TASK = 170; // detail panel height for tasks
    const DETAIL_H_SUB = 130; // detail panel height for subtasks

    const placeTaskSubs = (task, taskX, taskY, subX) => {
      const isExp = isLocked(task.id);
      const effectiveSubX = isExp ? subX + DETAIL_W + DETAIL_GAP : subX;
      const isDS = task.task_type === "drawing_set";
      const allChildren = tree.childTasks[task.id] || [];
      // For drawing_set: checklist_items render inside the node, only task-type children get wired nodes
      const subs = isDS ? allChildren.filter(c => c.task_type !== "checklist_item") : allChildren;
      const checkItems = isDS ? allChildren.filter(c => c.task_type === "checklist_item") : [];
      // Drawing set node is taller to fit inline checklist (collapsed: just phase headers)
      const dsExtraH = isDS && checkItems.length > 0 ? Math.min(checkItems.length, 3) * 14 + 30 : 0;
      const baseTaskH = TASK_H + dsExtraH;
      const effectiveTaskH = isExp ? Math.max(baseTaskH, DETAIL_H_TASK) : baseTaskH;
      let stY = taskY;
      subs.forEach((st) => {
        const stColor = st.status === "resolved" ? "#0F7B6C44" : (PRI[st.priority]?.color || T.border);
        const isStExp = isLocked(st.id);
        const effectiveStH = isStExp ? Math.max(STASK_H, DETAIL_H_SUB) : STASK_H;
        pos[st.id] = { x: effectiveSubX, y: stY, w: STASK_W, h: STASK_H, type: "subtask", data: st, expanded: isStExp };
        wires.push({ x1: taskX + TASK_W + (isExp ? DETAIL_W + DETAIL_GAP : 0), y1: taskY + baseTaskH / 2, x2: effectiveSubX, y2: stY + STASK_H / 2, color: stColor, dashed: st.status === "resolved", taskId: st.id });
        stY += effectiveStH + ROW_GAP;
      });
      return { stEnd: stY, effectiveTaskH };
    };

    // Sort locations alphabetically
    const sortedLocs = [...p.locs].sort((a, b) => a.id.localeCompare(b.id));

    sortedLocs.forEach((loc) => {
      const locId = `loc-${loc.id}`;
      const locSubs = [...(p.subs[loc.id] || [])].sort((a, b) => a.id.localeCompare(b.id));
      const directTasks = tree.tasksByLoc[loc.id] || [];
      const isCollapsed = collapsed[locId];
      const locY = y;
      pos[locId] = { x: col0, y: locY, w: LOC_W, h: LOC_H, type: "location", data: loc };
      if (isCollapsed) { y += LOC_H + ROW_GAP * 2; return; }
      let childY = locY; let hadChildren = false;

      locSubs.forEach((sub) => {
        const subId = `sub-${sub.id}`;
        const subTasks = tree.tasksBySub[sub.id] || [];
        const isSubC = collapsed[subId];
        const subY = Math.max(childY, locY);
        pos[subId] = { x: col1, y: subY, w: SUB_W, h: SUB_H, type: "sublocation", data: sub };
        wires.push({ x1: col0 + LOC_W, y1: locY + LOC_H / 2, x2: col1, y2: subY + SUB_H / 2, color: loc.color, dashed: false });
        hadChildren = true;
        if (isSubC) { childY = subY + SUB_H + ROW_GAP; return; }
        let taskY = subY;
        subTasks.forEach((task) => {
          const tY = Math.max(taskY, subY);
          const tColor = task.status === "resolved" ? "#0F7B6C44" : (task.task_type === "drawing_set" ? DS_CORAL : (PRI[task.priority]?.color || T.border));
          const isExp = isLocked(task.id);
          const tCheckItems = task.task_type === "drawing_set" ? (tree.childTasks[task.id] || []).filter(c => c.task_type === "checklist_item") : [];
          const tDsExtra = tCheckItems.length > 0 ? Math.min(tCheckItems.length, 3) * 14 + 30 : 0;
          const tH = TASK_H + tDsExtra;
          pos[task.id] = { x: col2Sub, y: tY, w: TASK_W, h: tH, type: "task", data: task, expanded: isExp };
          wires.push({ x1: col1 + SUB_W, y1: subY + SUB_H / 2, x2: col2Sub, y2: tY + tH / 2, color: tColor, dashed: task.status === "resolved", taskId: task.id });
          const { stEnd, effectiveTaskH } = placeTaskSubs(task, col2Sub, tY, col3FromSub);
          taskY = Math.max(tY + effectiveTaskH + ROW_GAP, stEnd);
        });
        childY = Math.max(childY, taskY);
        if (subTasks.length === 0) childY = subY + SUB_H + ROW_GAP;
      });

      directTasks.forEach((task) => {
        const tY = Math.max(childY, locY);
        const tColor = task.status === "resolved" ? "#0F7B6C44" : (task.task_type === "drawing_set" ? DS_CORAL : (PRI[task.priority]?.color || loc.color));
        const isExp = isLocked(task.id);
        const tCheckItems = task.task_type === "drawing_set" ? (tree.childTasks[task.id] || []).filter(c => c.task_type === "checklist_item") : [];
        const tDsExtra = tCheckItems.length > 0 ? Math.min(tCheckItems.length, 3) * 14 + 30 : 0;
        const tH = TASK_H + tDsExtra;
        pos[task.id] = { x: col2Direct, y: tY, w: TASK_W, h: tH, type: "task", data: task, expanded: isExp };
        wires.push({ x1: col0 + LOC_W, y1: locY + LOC_H / 2, x2: col2Direct, y2: tY + tH / 2, color: tColor, dashed: task.status === "resolved", taskId: task.id });
        hadChildren = true;
        const { stEnd, effectiveTaskH } = placeTaskSubs(task, col2Direct, tY, col3Direct);
        childY = Math.max(childY, Math.max(tY + effectiveTaskH + ROW_GAP, stEnd));
      });
      if (!hadChildren) childY = locY + LOC_H + ROW_GAP;
      y = Math.max(y, childY) + ROW_GAP;
    });

    if (tree.rootTasks.length > 0) {
      const unId = "loc-unassigned";
      pos[unId] = { x: col0, y, w: LOC_W, h: LOC_H, type: "location", data: { id: "—", name: "Unassigned", color: "#CA8A04", accent: "#CA8A04" } };
      if (!collapsed[unId]) {
        let tY = y;
        tree.rootTasks.forEach((task) => {
          const tColor = task.status === "resolved" ? "#0F7B6C44" : (PRI[task.priority]?.color || "#CA8A04");
          const isExp = isLocked(task.id);
          pos[task.id] = { x: col2Direct, y: tY, w: TASK_W, h: TASK_H, type: "task", data: task, expanded: isExp };
          wires.push({ x1: col0 + LOC_W, y1: y + LOC_H / 2, x2: col2Direct, y2: tY + TASK_H / 2, color: tColor, dashed: true, taskId: task.id });
          const { stEnd, effectiveTaskH } = placeTaskSubs(task, col2Direct, tY, col3Direct);
          tY = Math.max(tY + effectiveTaskH + ROW_GAP, stEnd);
        });
        y = tY;
      } else { y += LOC_H + ROW_GAP; }
    }
    return { positions: pos, wires };
  }, [p.locs, p.subs, tree, collapsed, lockedNodes]);

  // Cursor-centered zoom
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom((prevZoom) => {
      const newZoom = Math.min(2, Math.max(0.2, prevZoom * factor));
      const scale = newZoom / prevZoom;
      setPan((prevPan) => ({
        x: mouseX - scale * (mouseX - prevPan.x),
        y: mouseY - scale * (mouseY - prevPan.y),
      }));
      return newZoom;
    });
  }, []);

  // Pan
  const onMouseDown = (e) => {
    if (e.button === 0 && (e.target === canvasRef.current || e.target.dataset?.bg || e.target.tagName === "svg" || e.target.tagName === "rect")) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const onMouseMove = (e) => { if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); };
  const onMouseUp = () => setIsPanning(false);
  useEffect(() => { const el = canvasRef.current; if (el) el.addEventListener("wheel", onWheel, { passive: false }); return () => { if (el) el.removeEventListener("wheel", onWheel); }; }, [onWheel]);

  const handleAddSubTask = async (parentId, subTask) => {
    const parent = p.tasks.find((t) => t.id === parentId);
    await onCreateTask({ ...subTask, loc: parent?.loc || "", sub: parent?.sub || "", status: "open", source: "manual", parent_task_id: parentId });
    setAddSubFor(null);
  };
  const handleAddTask = async (taskData) => { await onCreateTask({ ...taskData, status: "open", source: "manual" }); setAddTaskFor(null); };
  const handleAddSubLoc = async (locCode, subLocData) => {
    const { supabase } = await import("@/lib/supabase");
    const { data: loc } = await supabase.from("locations").select("id").eq("project_id", p.id).eq("code", locCode).single();
    if (!loc) return;
    await supabase.from("sub_locations").insert({ location_id: loc.id, code: subLocData.code.trim(), name: subLocData.name.trim(), sort_order: (p.subs[locCode] || []).length });
    setAddSubLocFor(null);
    if (onReload) onReload();
  };
  const getProgress = (taskId) => { const ch = tree.childTasks[taskId] || []; if (!ch.length) return null; const rv = ch.filter((c) => c.status === "resolved").length; return { rv, tot: ch.length, pct: Math.round(rv / ch.length * 100) }; };

  // Determine opacity for filter dimming
  const getNodeOpacity = (nodeType, data) => {
    if (!hasActiveFilter) return 1;
    if (nodeType === "task" || nodeType === "subtask") return taskMatchesFilter(data) ? 1 : 0.12;
    if (nodeType === "location") {
      // Location stays visible if any child task matches
      const locTasks = [...(tree.tasksByLoc[data.id] || []), ...(p.subs[data.id] || []).flatMap((s) => tree.tasksBySub[s.id] || [])];
      return locTasks.some(taskMatchesFilter) ? 0.7 : 0.12;
    }
    if (nodeType === "sublocation") {
      const subTasks = tree.tasksBySub[data.id] || [];
      return subTasks.some(taskMatchesFilter) ? 0.7 : 0.12;
    }
    return 1;
  };
  const getWireOpacity = (w) => {
    if (!hasActiveFilter) return 1;
    if (w.taskId) { const t = p.tasks.find((x) => x.id === w.taskId); return t && taskMatchesFilter(t) ? 1 : 0.08; }
    return 0.15;
  };

  // Render wires
  const renderWires = () => wires.map((w, i) => {
    const isHot = hoveredNode && Object.entries(positions).find(([id]) => id === hoveredNode && positions[id] && (Math.abs(positions[id].y + positions[id].h / 2 - w.y1) < 2 || Math.abs(positions[id].y + positions[id].h / 2 - w.y2) < 2));
    const opacity = getWireOpacity(w);
    return <path key={i} d={`M ${w.x1} ${w.y1} C ${w.x1 + 30} ${w.y1}, ${w.x2 - 30} ${w.y2}, ${w.x2} ${w.y2}`} fill="none" stroke={isHot ? T.text : w.color} strokeWidth={isHot ? 2.5 : 1.5} strokeDasharray={w.dashed ? "4 4" : "none"} opacity={opacity} style={{ transition: "opacity .3s" }} />;
  });

  const renderNode = (id) => {
    const n = positions[id]; if (!n) return null;
    const isHov = hoveredNode === id;
    const opacity = getNodeOpacity(n.type, n.data);

    if (n.type === "location") {
      const loc = n.data; const isC = collapsed[id];
      const taskCount = (tree.tasksByLoc[loc.id] || []).length + (p.subs[loc.id] || []).flatMap((s) => tree.tasksBySub[s.id] || []).length;
      return (<foreignObject key={id} x={n.x} y={n.y} width={n.w + 60} height={n.h}>
        <div onMouseEnter={() => setHoveredNode(id)} onMouseLeave={() => setHoveredNode(null)} style={{ display: "flex", alignItems: "center", gap: 4, opacity, transition: "opacity .3s" }}>
          <div onClick={() => toggleCollapse(id)} style={{ width: n.w, height: n.h, background: loc.color + "22", border: `1.5px solid ${isHov ? loc.color : loc.color + "66"}`, borderLeft: `3px solid ${loc.color}`, borderRadius: "0 8px 8px 0", padding: "8px 12px", cursor: "pointer", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: isC ? T.textMuted : T.text, transition: "transform .15s", display: "inline-block", transform: isC ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: loc.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{p.locLabel} {loc.id} – {loc.name}</div></div>
            <span style={{ fontSize: 10, color: T.textMuted, fontFamily: M }}>{taskCount}</span>
          </div>
          {isHov && loc.id !== "—" && permissions.canCreate && <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <button onClick={(e) => { e.stopPropagation(); setAddSubLocFor(loc.id); }} title={`Add ${p.subLabel}`} style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${T?.border||"#252535"}`, background: T.bgElevated, cursor: "pointer", color: T.textSecondary, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>+B</button>
            <button onClick={(e) => { e.stopPropagation(); setAddTaskFor({ loc: loc.id, sub: "" }); }} title="Add Task" style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${T?.border||"#252535"}`, background: T.bgElevated, cursor: "pointer", color: T.textSecondary, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>+T</button>
          </div>}
        </div></foreignObject>);
    }
    if (n.type === "sublocation") {
      const sub = n.data; const isC = collapsed[id];
      const taskCount = (tree.tasksBySub[sub.id] || []).length;
      const parentLoc = p.locs.find((l) => (p.subs[l.id] || []).find((s) => s.id === sub.id));
      return (<foreignObject key={id} x={n.x} y={n.y} width={n.w + 30} height={n.h}>
        <div onMouseEnter={() => setHoveredNode(id)} onMouseLeave={() => setHoveredNode(null)} style={{ display: "flex", alignItems: "center", gap: 4, opacity, transition: "opacity .3s" }}>
          <div onClick={() => toggleCollapse(id)} style={{ width: n.w, height: n.h, background: T.bgElevated, border: `1.5px solid ${isHov ? "#5FA8D3" : T.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, color: isC ? T.textMuted : T.textSecondary, transition: "transform .15s", display: "inline-block", transform: isC ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{sub.id}: {sub.name}</div></div>
            <span style={{ fontSize: 9, color: T.textMuted, fontFamily: M }}>{taskCount}</span>
          </div>
          {isHov && permissions.canCreate && <button onClick={(e) => { e.stopPropagation(); setAddTaskFor({ loc: parentLoc?.id || "", sub: sub.id }); }} title="Add Task" style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${T?.border||"#252535"}`, background: T.bgElevated, cursor: "pointer", color: T.textSecondary, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>}
        </div></foreignObject>);
    }
    if (n.type === "task") {
      const task = n.data; const assignee = tm.find((m) => m.id === task.assignee);
      const pr = PRI[task.priority]; const sta = STA[task.status]; const progress = getProgress(task.id);
      const isRes = task.status === "resolved"; const isCritHigh = task.priority === "critical" || task.priority === "high";
      const isDS = task.task_type === "drawing_set";
      const borderColor = isRes ? T.border : (isDS ? DS_CORAL : pr.color);
      const isLocked = n.expanded;
      const isShowDetail = isHov || isLocked;
      const openStatusMenu = (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setTagMenu({ taskId: task.id, type: "status", x: r.left, y: r.bottom + 4 }); };
      const openPriorityMenu = (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setTagMenu({ taskId: task.id, type: "priority", x: r.left, y: r.bottom + 4 }); };
      const overdue = task.dueDate && task.dueDate < new Date().toISOString().split("T")[0] && task.status !== "resolved";
      // Drawing set inline checklist data
      const dsCheckItems = isDS ? (tree.childTasks[task.id] || []).filter(c => c.task_type === "checklist_item") : [];
      const dsDone = dsCheckItems.filter(c => c.status === "resolved").length;
      const totalW = n.w + (isShowDetail ? DETAIL_W + DETAIL_GAP : 0);
      const nodeH = n.h + (progress ? 10 : 0);
      const detailH = Math.max(nodeH, 120);
      return (<foreignObject key={id} x={n.x} y={n.y} width={totalW + 4} height={Math.max(nodeH, isShowDetail ? detailH : nodeH)} style={{ overflow: "visible" }}>
        <div onMouseEnter={() => setHoveredNode(id)} onMouseLeave={() => setHoveredNode(null)} style={{ display: "flex", gap: DETAIL_GAP }}>
          <div
            style={{ width: n.w, flexShrink: 0, background: isDS ? `${DS_CORAL}08` : (isRes ? T.bgCard : T.bgElevated), border: `1.5px solid ${borderColor}`, borderLeft: `3px solid ${isDS ? DS_CORAL : pr.color}`, borderRadius: "0 8px 8px 0", padding: "8px 10px", boxSizing: "border-box", opacity: isRes ? 0.5 : opacity, boxShadow: isDS ? `0 0 12px ${DS_CORAL}22` : (isCritHigh && !isRes ? `0 0 10px ${pr.color}44` : "none"), transition: "opacity .3s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <div style={{ display: "flex", gap: 3 }}>
                {isDS && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 2, background: DS_CORAL + "22", color: DS_CORAL, fontWeight: 700 }}>DS</span>}
                <span onClick={openStatusMenu} style={{ fontSize: 9, padding: "1px 4px", borderRadius: 2, background: sta.bg, color: sta.color, fontWeight: 600, cursor: "pointer" }} title="Change status">{sta.label} ▾</span>
                <span onClick={openPriorityMenu} style={{ fontSize: 9, padding: "1px 4px", borderRadius: 2, background: pr.bg, color: pr.color, fontWeight: 600, cursor: "pointer" }} title="Change priority">{pr.label} ▾</span>
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                <button onClick={(e) => { e.stopPropagation(); toggleLock(task.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: isLocked ? T.text : T.textMuted, fontSize: 10, padding: "0 2px" }} title={isLocked ? "Unlock" : "Lock open"}>{isLocked ? "🔒" : "▸"}</button>
                {permissions.canCreate&&<button onClick={(e) => { e.stopPropagation(); setAddSubFor(task.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 10, padding: "0 2px" }} title="Add sub-task">+</button>}
                {!permissions.isViewer&&<button onClick={(e) => { e.stopPropagation(); onEditTask(task); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 10, padding: "0 2px" }} title="Edit">✎</button>}
              </div>
            </div>
            <div style={{ fontSize: isDS ? 12 : 11, fontWeight: isDS ? 700 : 500, lineHeight: 1.3, color: isRes ? T.textMuted : T.text, textDecoration: isRes ? "line-through" : "none", marginBottom: 4 }}>{task.title.length > 42 ? task.title.substring(0, 42) + "…" : task.title}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {assignee ? <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 16, height: 16, borderRadius: "50%", background: assignee.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, fontWeight: 700, color: "white" }}>{av(assignee.name)}</div><span style={{ fontSize: 9, color: T.textSecondary }}>{assignee.name}</span></div> : <span />}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {isDS && dsCheckItems.length > 0 && <span style={{ fontSize: 9, color: DS_CORAL, fontFamily: M }}>{dsDone}/{dsCheckItems.length}</span>}
                {progress && !isDS && <span style={{ fontSize: 9, color: T.textMuted, fontFamily: M }}>{progress.rv}/{progress.tot}</span>}
                {task.dueDate && <span style={{ fontSize: 9, color: overdue ? "#F87171" : T.textMuted, fontWeight: overdue ? 600 : 400, fontFamily: M }}>{task.dueDate}{overdue ? " ⚠" : ""}</span>}
              </div>
            </div>
            {progress && !isDS && <div style={{ marginTop: 3, height: 2, background: T.border, borderRadius: 1, overflow: "hidden" }}><div style={{ height: "100%", width: `${progress.pct}%`, background: progress.pct === 100 ? "#0F7B6C" : T.text, borderRadius: 1 }} /></div>}
            {isDS && dsCheckItems.length > 0 && <div style={{ marginTop: 4, borderTop: `1px solid ${DS_CORAL}33`, paddingTop: 3 }}>
              {DRAWING_SET_PHASES.map(({ key, label, color }) => {
                const items = dsCheckItems.filter(c => c.phase === key);
                if (items.length === 0) return null;
                const pDone = items.filter(c => c.status === "resolved").length;
                return <div key={key} style={{ marginBottom: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "1px 0" }}>
                    <span style={{ fontSize: 8, fontWeight: 600, color }}>{key}</span>
                    <span style={{ fontSize: 7, color: pDone === items.length ? "#0F7B6C" : T.textMuted, fontFamily: M }}>{pDone}/{items.length}</span>
                  </div>
                </div>;
              })}
            </div>}
          </div>
          {isShowDetail && <div style={{ width: DETAIL_W, background: T.bgCard, border: `1px solid ${isLocked ? T.text+"44" : T.border}`, borderRadius: 6, padding: "8px 10px", boxSizing: "border-box", fontSize: 10, color: T.textSecondary, lineHeight: 1.6, overflow: "hidden", opacity: isRes ? 0.5 : 1 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", fontFamily: M, marginBottom: 4, letterSpacing: ".05em" }}>Details</div>
            {task.title.length > 42 && <div style={{ color: T.text, marginBottom: 6 }}>{task.title}</div>}
            {task.notes && <div style={{ marginBottom: 6 }}><span style={{ color: T.textMuted, fontFamily: M, fontSize: 9 }}>Notes: </span>{task.notes.length > 120 ? task.notes.substring(0, 120) + "…" : task.notes}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
              {task.category && <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{task.category.split(",").filter(Boolean).map((c) => <span key={c} style={{ fontSize: 9, padding: "1px 4px", borderRadius: 2, background: T.borderSubtle, color: T.textSecondary }}>{c}</span>)}</div>}
              {task.source && task.source !== "manual" && <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 2, background: "#FAF5FF", color: "#9333EA" }}>✦ {task.source}</span>}
            </div>
            {task.loc && <div><span style={{ color: T.textMuted, fontFamily: M, fontSize: 9 }}>{p.locLabel}: </span>{task.loc}{task.sub ? ` → ${task.sub}` : ""}</div>}
            {assignee && <div><span style={{ color: T.textMuted, fontFamily: M, fontSize: 9 }}>Assigned: </span>{assignee.name}</div>}
            {task.dueDate && <div><span style={{ color: T.textMuted, fontFamily: M, fontSize: 9 }}>Due: </span><span style={{ color: overdue ? "#F87171" : T.text }}>{task.dueDate}</span></div>}
            {task.created && <div><span style={{ color: T.textMuted, fontFamily: M, fontSize: 9 }}>Created: </span>{task.created}</div>}
          </div>}
        </div></foreignObject>);
    }
    if (n.type === "subtask") {
      const task = n.data; const assignee = tm.find((m) => m.id === task.assignee);
      const pr = PRI[task.priority]; const sta = STA[task.status];
      const isRes = task.status === "resolved"; const isCritHigh = task.priority === "critical" || task.priority === "high";
      const borderColor = isRes ? T.borderSubtle : pr.color;
      const isLocked = n.expanded;
      const isShowDetail = isHov || isLocked;
      const openStatusMenu = (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setTagMenu({ taskId: task.id, type: "status", x: r.left, y: r.bottom + 4 }); };
      const openPriorityMenu = (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setTagMenu({ taskId: task.id, type: "priority", x: r.left, y: r.bottom + 4 }); };
      const overdue = task.dueDate && task.dueDate < new Date().toISOString().split("T")[0] && task.status !== "resolved";
      const totalW = n.w + (isShowDetail ? DETAIL_W + DETAIL_GAP : 0);
      return (<foreignObject key={id} x={n.x} y={n.y} width={totalW + 4} height={Math.max(n.h, isShowDetail ? 100 : n.h)} style={{ overflow: "visible" }}>
        <div onMouseEnter={() => setHoveredNode(id)} onMouseLeave={() => setHoveredNode(null)} style={{ display: "flex", gap: DETAIL_GAP }}>
          <div
            style={{ width: n.w, flexShrink: 0, background: isRes ? T.bg : T.bgCard, border: `1px solid ${borderColor}`, borderLeft: `2px solid ${pr.color}`, borderRadius: "0 6px 6px 0", padding: "6px 8px", boxSizing: "border-box", opacity: isRes ? 0.45 : opacity, boxShadow: isCritHigh && !isRes ? `0 0 8px ${pr.color}33` : "none", transition: "opacity .3s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <div style={{ display: "flex", gap: 3 }}>
                <span onClick={openStatusMenu} style={{ fontSize: 8, padding: "1px 3px", borderRadius: 2, background: sta.bg, color: sta.color, fontWeight: 600, cursor: "pointer" }} title="Change status">{sta.label} ▾</span>
                <span onClick={openPriorityMenu} style={{ fontSize: 8, padding: "1px 3px", borderRadius: 2, background: pr.bg, color: pr.color, fontWeight: 600, cursor: "pointer" }} title="Change priority">{pr.label} ▾</span>
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                <button onClick={(e) => { e.stopPropagation(); toggleLock(task.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: isLocked ? T.text : T.textMuted, fontSize: 9, padding: 0 }} title={isLocked ? "Unlock" : "Lock open"}>{isLocked ? "🔒" : "▸"}</button>
                {!permissions.isViewer&&<button onClick={(e) => { e.stopPropagation(); onEditTask(task); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 9, padding: 0 }}>✎</button>}
              </div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.3, color: isRes ? T.textMuted : T.text, textDecoration: isRes ? "line-through" : "none", marginBottom: 2 }}>{task.title.length > 35 ? task.title.substring(0, 35) + "…" : task.title}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {assignee ? <div style={{ display: "flex", alignItems: "center", gap: 2 }}><div style={{ width: 13, height: 13, borderRadius: "50%", background: assignee.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 5, fontWeight: 700, color: "white" }}>{av(assignee.name)}</div><span style={{ fontSize: 8, color: T.textSecondary }}>{assignee.name}</span></div> : <span />}
              {task.dueDate && <span style={{ fontSize: 8, color: overdue ? "#F87171" : T.textMuted, fontWeight: overdue ? 600 : 400, fontFamily: M }}>{task.dueDate}{overdue ? " ⚠" : ""}</span>}
            </div>
          </div>
          {isShowDetail && <div style={{ width: DETAIL_W, background: T.bg, border: `1px solid ${isLocked ? T.text+"44" : T.borderSubtle}`, borderRadius: 6, padding: "6px 8px", boxSizing: "border-box", fontSize: 9, color: T.textSecondary, lineHeight: 1.6, overflow: "hidden", opacity: isRes ? 0.45 : 1 }}>
            <div style={{ fontSize: 8, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", fontFamily: M, marginBottom: 3, letterSpacing: ".05em" }}>Details</div>
            {task.title.length > 35 && <div style={{ color: T.text, marginBottom: 4 }}>{task.title}</div>}
            {task.notes && <div style={{ marginBottom: 4 }}><span style={{ color: T.textMuted, fontFamily: M, fontSize: 8 }}>Notes: </span>{task.notes.length > 100 ? task.notes.substring(0, 100) + "…" : task.notes}</div>}
            {task.category && <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>{task.category.split(",").filter(Boolean).map((c) => <span key={c} style={{ fontSize: 8, padding: "1px 3px", borderRadius: 2, background: T.borderSubtle, color: T.textSecondary }}>{c}</span>)}</div>}
            {assignee && <div><span style={{ color: T.textMuted, fontFamily: M, fontSize: 8 }}>Assigned: </span>{assignee.name}</div>}
            {task.dueDate && <div><span style={{ color: T.textMuted, fontFamily: M, fontSize: 8 }}>Due: </span><span style={{ color: overdue ? "#F87171" : T.text }}>{task.dueDate}</span></div>}
          </div>}
        </div></foreignObject>);
    }
    return null;
  };

  return (
    <div style={{ position: "relative", height: "calc(100vh - 280px)", minHeight: 500 }}>
      {/* Toolbar */}
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, display: "flex", gap: 6, background: `${T?.bgCard||"#0F0F16"}ee`, border: `1px solid ${T?.border||"#252535"}`, borderRadius: 8, padding: "6px 10px", backdropFilter: "blur(8px)" }}>
        <button onClick={() => { const rect = canvasRef.current.getBoundingClientRect(); const cx = rect.width / 2; const cy = rect.height / 2; const f = 1.2; setZoom((z) => { const nz = Math.min(2, z * f); setPan((p) => ({ x: cx - f * (cx - p.x), y: cy - f * (cy - p.y) })); return nz; }); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.textSecondary, fontSize: 16, padding: "2px 6px" }}>+</button>
        <span style={{ fontSize: 11, color: T.textMuted, fontFamily: M, display: "flex", alignItems: "center", minWidth: 40, justifyContent: "center" }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => { const rect = canvasRef.current.getBoundingClientRect(); const cx = rect.width / 2; const cy = rect.height / 2; const f = 0.8; setZoom((z) => { const nz = Math.max(0.2, z * f); setPan((p) => ({ x: cx - f * (cx - p.x), y: cy - f * (cy - p.y) })); return nz; }); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.textSecondary, fontSize: 16, padding: "2px 6px" }}>−</button>
        <div style={{ width: 1, background: T.border, margin: "0 4px" }} />
        <button onClick={() => { setPan({ x: 40, y: 40 }); setZoom(0.85); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 11, padding: "2px 6px" }}>Reset</button>
        <div style={{ width: 1, background: T.border, margin: "0 4px" }} />
        <button onClick={() => setCollapsed({})} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 11, padding: "2px 6px" }}>Expand</button>
        <button onClick={() => { const c = {}; p.locs.forEach((l) => { c[`loc-${l.id}`] = true; }); setCollapsed(c); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 11, padding: "2px 6px" }}>Collapse</button>
        <div style={{ width: 1, background: T.border, margin: "0 4px" }} />
        <button onClick={() => setSortBy(sortBy === "priority" ? "deadline" : "priority")} style={{ background: "none", border: "none", cursor: "pointer", color: sortBy === "priority" ? "#E03E3E" : T.text, fontSize: 11, padding: "2px 6px", fontFamily: M }}>{sortBy === "priority" ? "↕ PRI" : "↕ DATE"}</button>
        <div style={{ width: 1, background: T.border, margin: "0 4px" }} />
        {Object.keys(lockedNodes).length > 0
          ? <button onClick={() => setLockedNodes({})} style={{ background: "none", border: "none", cursor: "pointer", color: T.text, fontSize: 11, padding: "2px 6px" }}>Unlock All</button>
          : <button onClick={() => { const all = {}; p.tasks.forEach((t) => { all[t.id] = true; }); setLockedNodes(all); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 11, padding: "2px 6px" }}>Expand All Details</button>
        }
      </div>
      {/* Filter indicator */}
      {hasActiveFilter && <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10, background: T.text+"18", border: `1px solid ${T.text}33`, borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, backdropFilter: "blur(8px)" }}>
        <span style={{ fontSize: 10, color: "#93C5FD", fontWeight: 600 }}>● FILTERED</span>
        <span style={{ fontSize: 10, color: T.textMuted }}>Non-matching items dimmed</span>
      </div>}
      {/* Legend */}
      <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 10, display: "flex", gap: 12, background: `${T?.bgCard||"#0F0F16"}88`, border: `1px solid ${T?.border||"#252535"}`, borderRadius: 8, padding: "8px 14px", backdropFilter: "blur(4px)" }}>
        <span style={{ fontSize: 10, color: T.textMuted }}>Scroll to zoom at cursor · Drag to pan · Click {p.locLabel.toLowerCase()}s to collapse</span>
      </div>
      {/* Canvas */}
      <div ref={canvasRef} data-bg="true" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 10, border: `1px solid ${T?.border||"#252535"}`, background: T.bg, cursor: isPanning ? "grabbing" : "grab",
          backgroundImage: "radial-gradient(circle, #1A1A2833 1px, transparent 1px)", backgroundSize: `${20 * zoom}px ${20 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px`,
          position: "relative" }}>
        <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, overflow: "hidden" }}>
          <defs><clipPath id="canvas-clip"><rect x="0" y="0" width="100%" height="100%" /></clipPath></defs>
          <g clipPath="url(#canvas-clip)">
            {/* Pan/zoom background - clickable for pan */}
            <rect x="-99999" y="-99999" width="999999" height="999999" fill="transparent" data-bg="true" />
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {renderWires()}
              {Object.keys(positions).filter((id) => id !== hoveredNode).map((id) => renderNode(id))}
              {hoveredNode && positions[hoveredNode] && renderNode(hoveredNode)}
            </g>
          </g>
        </svg>
      </div>
      {/* Tag picker menu */}
      {tagMenu && <div onClick={() => setTagMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 1050 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", left: tagMenu.x, top: tagMenu.y, background: T.bgCard, border: `1px solid ${T?.border||"#252535"}`, borderRadius: 8, padding: "4px", boxShadow: "0 8px 24px rgba(0,0,0,.5)", zIndex: 1051, minWidth: 160 }}>
          {tagMenu.type === "status" && (() => {
            const task = p.tasks.find((t) => t.id === tagMenu.taskId);
            const children = tree.childTasks[tagMenu.taskId] || [];
            const hasUnresolvedChildren = children.length > 0 && children.some((c) => c.status !== "resolved");
            const isUnderReview = task?.status === "internal_review" || task?.status === "external_review";
            return Object.entries(STA).map(([key, cfg]) => {
              let blocked = false, reason = "";
              if (key === "resolved" && hasUnresolvedChildren) { blocked = true; reason = "sub-tasks open"; }
              else if (key === "resolved" && !isPM) { blocked = true; reason = "PM only"; }
              if (!isPM && key === "resolved") { blocked = true; reason = "PM only"; }
              return (
                <button key={key} onClick={() => {
                  if (blocked) return;
                  if (key === "open" && isUnderReview && isPM) {
                    onUpdateTask(tagMenu.taskId, { status: "open", _rejected: true });
                  } else {
                    onUpdateTask(tagMenu.taskId, { status: key });
                  }
                  setTagMenu(null);
                }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px", border: "none", borderRadius: 4, cursor: blocked ? "not-allowed" : "pointer", background: "transparent", color: blocked ? T.textDim : T.text, fontFamily: F, fontSize: 12, textAlign: "left", opacity: blocked ? 0.4 : 1 }}
                  onMouseEnter={(e) => { if (!blocked) e.currentTarget.style.background = T.bgElevated; }} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
                  <span>{key === "open" && isUnderReview && isPM ? "Reject → Open" : cfg.label}</span>
                  {blocked && <span style={{ fontSize: 9, color: T.textMuted, marginLeft: "auto" }}>{reason}</span>}
                </button>
              );
            });
          })()}
          {tagMenu.type === "priority" && Object.entries(PRI).map(([key, cfg]) => (
            <button key={key} onClick={() => { onUpdateTask(tagMenu.taskId, { priority: key }); setTagMenu(null); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px", border: "none", borderRadius: 4, cursor: "pointer", background: "transparent", color: T.text, fontFamily: F, fontSize: 12, textAlign: "left" }}
              onMouseEnter={(e) => e.currentTarget.style.background = T.bgElevated} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
              <span>{cfg.label}</span>
            </button>
          ))}
        </div>
      </div>}
      {addSubFor && <SubTaskModal onClose={() => setAddSubFor(null)} onSubmit={(sub) => handleAddSubTask(addSubFor, sub)} team={tm} cats={p.cats} parentTitle={p.tasks.find((t) => t.id === addSubFor)?.title || ""} T={T} />}
      {addSubLocFor && <AddSubLocModal locCode={addSubLocFor} locLabel={p.locLabel} subLabel={p.subLabel} onClose={() => setAddSubLocFor(null)} onSubmit={(data) => handleAddSubLoc(addSubLocFor, data)} T={T} />}
      {addTaskFor && <AddTaskModal loc={addTaskFor.loc} sub={addTaskFor.sub} team={tm} cats={p.cats} onClose={() => setAddTaskFor(null)} onSubmit={handleAddTask} T={T} />}
    </div>
  );
}
