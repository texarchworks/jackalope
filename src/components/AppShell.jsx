"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { PRIORITIES as PRI, STATUSES as STA, TEAM_COLORS, DEFAULT_CATEGORIES, THEMES } from "@/lib/constants";
import { makeAvatar as av, isOverdue } from "@/lib/helpers";
import MyWork from "@/components/MyWork";
import ProjectsHome from "@/components/ProjectsHome";
import ProjectDetail from "@/components/ProjectDetail";
import OrgTeam from "@/components/OrgTeam";
const Logo = ({ size }) => <img src="/jackalope-logo.svg" alt="Jackalope" style={{ height: size, width: "auto", display: "block" }} />;
import usePermissions from "@/hooks/usePermissions";
import { ACTIONS, isAdminOnly } from "@/lib/permissions";

const M = "'IBM Plex Mono', monospace";
const F = "'Inter', -apple-system, sans-serif";
const bs = { padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all .15s", fontFamily: F, letterSpacing: "-0.01em" };

export default function AppShell() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [org, setOrg] = useState(null);
  const [orgMembers, setOrgMembers] = useState([]);
  const { canDo: canDoOrg } = usePermissions({ organizationId: org?.id });
  const [page, setPage] = useState("mywork");
  const [curProjId, setCurProjId] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signupMode, setSignupMode] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupRole, setSignupRole] = useState("");
  const [themeId, setThemeId] = useState(() => { if (typeof window !== "undefined") { return localStorage.getItem("jackalope-theme") || "dark"; } return "dark"; });
  const T = THEMES[themeId] || THEMES.dark;
  const toggleTheme = () => { const next = themeId === "dark" ? "light" : "dark"; setThemeId(next); if (typeof window !== "undefined") localStorage.setItem("jackalope-theme", next); };

  // ── AUTH ──
  useEffect(() => {
    let timeout;
    const init = async () => {
      try {
        // Timeout fallback — show login screen after 3 seconds regardless
        timeout = setTimeout(() => { setLoading(false); }, 3000);
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) { console.error("Session error:", error); setLoading(false); return; }
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        } else {
          setLoading(false);
        }
        clearTimeout(timeout);
      } catch (err) {
        console.error("Auth init error:", err);
        setLoading(false);
      }
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const loadProfile = async (uid) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).single();
      if (error) console.error("Profile load error:", error);
      setProfile(data || { id: uid, name: "User", role: "", color: "#2F80ED" });
    } catch (err) {
      console.error("Profile fetch failed:", err);
      setProfile({ id: uid, name: "User", role: "", color: "#2F80ED" });
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
    if (error) setLoginError(error.message);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail.endsWith("@texarchworks.com")) {
      setLoginError("Only @texarchworks.com email addresses can register.");
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: loginEmail,
      password: loginPass,
      options: { data: { name: signupName, role: signupRole } },
    });
    if (error) { setLoginError(error.message); return; }
    if (data?.user) {
      setUser(data.user);
      // Profile is created by DB trigger, just reload
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
      if (prof) setProfile(prof);
      // Auto-join org for internal users
      const { data: orgRow } = await supabase.from("organizations").select("id").limit(1).single();
      if (orgRow) {
        await supabase.from("org_members").upsert(
          { org_id: orgRow.id, user_id: data.user.id, org_role: "member", joined_at: new Date().toISOString() },
          { onConflict: "org_id,user_id" }
        );
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setProjects([]);
    setPage("mywork");
  };

  // ── DATA LOADING ──
  const loadProjects = useCallback(async () => {
    const { data: projRows } = await supabase.from("projects").select("*").order("created_at");
    if (!projRows) return;

    const fullProjects = await Promise.all(
      projRows.map(async (p) => {
        const [{ data: tasks }, { data: locs }, { data: cats }, { data: members }] = await Promise.all([
          supabase.from("tasks").select("*").eq("project_id", p.id).order("created_at"),
          supabase.from("locations").select("*, sub_locations(*)").eq("project_id", p.id).order("sort_order"),
          supabase.from("categories").select("*").eq("project_id", p.id).order("sort_order"),
          supabase.from("project_members").select("user_id, role, profiles(*)").eq("project_id", p.id),
        ]);

        const subs = {};
        (locs || []).forEach((l) => {
          subs[l.code] = (l.sub_locations || []).map((s) => ({ id: s.code, name: s.name }));
        });

        return {
          ...p,
          locLabel: p.loc_label || "Zone",
          subLabel: p.sub_label || "Building",
          icon: p.icon || p.name.substring(0, 2).toUpperCase(),
          locs: (locs || []).map((l) => ({
            id: l.code, name: l.name, color: l.color || "#2F80ED",
            accent: l.accent || "#5FA8D3", desc: l.description || "",
          })),
          subs,
          cats: (cats || []).map((c) => c.name),
          team: (members || []).map((m) => ({
            id: m.profiles?.id, name: m.profiles?.name, role: m.profiles?.role,
            color: m.profiles?.color || "#2F80ED", memberRole: m.role,
            is_external: m.profiles?.is_external || false, company: m.profiles?.company || "",
          })),
          tasks: (tasks || []).map((t) => ({
            ...t, loc: t.location_code || "", sub: t.sub_location_code || "",
            assignee: t.assignee_id, dueDate: t.due_date || "",
            created: t.created_at?.split("T")[0] || "",
            parent_task_id: t.parent_task_id || null,
            canvas_x: t.canvas_x != null ? t.canvas_x : null,
            canvas_y: t.canvas_y != null ? t.canvas_y : null,
            submitted_for_review_by: t.submitted_for_review_by || null,
            submitted_for_review_at: t.submitted_for_review_at?.split("T")[0] || null,
            resolved_by: t.resolved_by || null,
            resolved_at: t.resolved_at?.split("T")[0] || null,
            rejected_by: t.rejected_by || null,
            rejected_at: t.rejected_at?.split("T")[0] || null,
          })),
        };
      })
    );
    setProjects(fullProjects);

    // Load org data
    const { data: orgRow } = await supabase.from("organizations").select("*").limit(1).single();
    if (orgRow) {
      setOrg(orgRow);
      const { data: members } = await supabase.from("org_members").select("*").eq("org_id", orgRow.id);
      const { data: allProfiles } = await supabase.from("profiles").select("*");
      const profileMap = {};
      (allProfiles || []).forEach((p) => { profileMap[p.id] = p; });
      setOrgMembers((members || []).map((m) => ({ ...m, profile: profileMap[m.user_id] || null })));
    }
  }, []);

  useEffect(() => {
    if (user) loadProjects();
  }, [user, loadProjects]);

  // ── TASK OPERATIONS ──
  const updateTaskInDb = async (taskId, updates) => {
    const dbUpdates = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.assignee !== undefined) dbUpdates.assignee_id = updates.assignee;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate || null;
    if (updates.loc !== undefined) dbUpdates.location_code = updates.loc;
    if (updates.sub !== undefined) dbUpdates.sub_location_code = updates.sub;
    if (updates.canvas_x !== undefined) dbUpdates.canvas_x = updates.canvas_x;
    if (updates.canvas_y !== undefined) dbUpdates.canvas_y = updates.canvas_y;
    if (updates.status === "under_review") {
      dbUpdates.submitted_for_review_by = user.id;
      dbUpdates.submitted_for_review_at = new Date().toISOString();
    }
    if (updates.status === "resolved") {
      dbUpdates.resolved_at = new Date().toISOString();
      dbUpdates.resolved_by = user.id;
    }
    if (updates.status === "open" && updates._rejected) {
      dbUpdates.rejected_by = user.id;
      dbUpdates.rejected_at = new Date().toISOString();
    }
    await supabase.from("tasks").update(dbUpdates).eq("id", taskId);
  };

  // ── ROLE & PERMISSION SYSTEM ──
  const getUserRole = (proj) => {
    const member = proj.team.find((m) => m.id === user?.id);
    return member?.memberRole || "viewer";
  };
  const isUserPM = (proj) => {
    const role = getUserRole(proj);
    if (role === "pm" || role === "admin") return true;
    if (profile?.role && /project.?manager|pm\b|principal|director/i.test(profile.role)) return true;
    return false;
  };
  const isUserAdmin = (proj) => getUserRole(proj) === "admin";
  const isUserViewer = (proj) => getUserRole(proj) === "viewer";

  // Permission checks
  const canCreate = (proj) => { const r = getUserRole(proj); return r === "admin" || r === "pm" || r === "member"; };
  const canEdit = (proj, task) => {
    const r = getUserRole(proj);
    if (r === "admin" || r === "pm") return true;
    if (r === "member") return task?.assignee === user?.id || task?.created_by === user?.id;
    return false;
  };
  const canDelete = (proj) => { const r = getUserRole(proj); return r === "admin"; };
  const canDeleteTask = (proj, task) => {
    const r = getUserRole(proj);
    if (r === "admin") return true;
    if (r === "pm") return true;
    if (r === "member") return task?.created_by === user?.id;
    return false;
  };
  const canManageTeam = (proj) => { const r = getUserRole(proj); return r === "admin" || r === "pm"; };

  const updateTaskLocal = (projId, taskId, updates) => {
    setProjects((ps) => {
      return ps.map((proj) => {
        if (proj.id !== projId) return proj;
        const task = proj.tasks.find((t) => t.id === taskId);
        if (!task) return proj;

        // Viewer cannot edit anything
        if (isUserViewer(proj)) return proj;

        // Members can only edit their own tasks
        const role = getUserRole(proj);
        if (role === "member" && task.assignee !== user?.id && task.created_by !== user?.id) return proj;

        // Status flow enforcement
        if (updates.status === "resolved") {
          // Only PMs can move to Resolved
          if (!isUserPM(proj)) return proj;
          // Block resolving parent if children unresolved
          const children = proj.tasks.filter((t) => t.parent_task_id === taskId);
          if (children.length > 0 && children.some((c) => c.status !== "resolved")) return proj;
        }

        // Non-PMs cannot skip Under Review to get to Resolved
        if (updates.status === "resolved" && task.status !== "under_review" && !isUserPM(proj)) return proj;

        let newTasks = proj.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));

        // Auto-resolve parent when all children are resolved (only if user is PM)
        if (updates.status === "resolved" && task.parent_task_id && isUserPM(proj)) {
          const siblings = newTasks.filter((t) => t.parent_task_id === task.parent_task_id);
          const allResolved = siblings.every((s) => s.status === "resolved");
          if (allResolved) {
            newTasks = newTasks.map((t) => t.id === task.parent_task_id ? { ...t, status: "resolved" } : t);
            updateTaskInDb(task.parent_task_id, { status: "resolved" });
          }
        }

        // Auto-submit-for-review parent when all children are under_review or resolved
        if (updates.status === "under_review" && task.parent_task_id) {
          const siblings = newTasks.filter((t) => t.parent_task_id === task.parent_task_id);
          const allReviewOrDone = siblings.every((s) => s.status === "under_review" || s.status === "resolved");
          if (allReviewOrDone) {
            const parent = newTasks.find((t) => t.id === task.parent_task_id);
            if (parent && parent.status !== "under_review" && parent.status !== "resolved") {
              newTasks = newTasks.map((t) => t.id === task.parent_task_id ? { ...t, status: "under_review" } : t);
              updateTaskInDb(task.parent_task_id, { status: "under_review" });
            }
          }
        }

        return { ...proj, tasks: newTasks };
      });
    });
    // Guard: check before sending to DB
    const proj = projects.find((p) => p.id === projId);
    if (updates.status === "resolved" && proj) {
      if (!isUserPM(proj)) return;
      const children = proj.tasks.filter((t) => t.parent_task_id === taskId);
      if (children.length > 0 && children.some((c) => c.status !== "resolved")) return;
    }
    updateTaskInDb(taskId, updates);
  };

  const createTask = async (projId, task) => {
    const proj = projects.find((p) => p.id === projId);
    if (proj && !canCreate(proj)) { alert("You don't have permission to create tasks on this project."); return; }
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projId,
        title: task.title,
        location_code: task.loc || "",
        sub_location_code: task.sub || "",
        priority: task.priority,
        status: task.status || "open",
        category: task.category || "",
        assignee_id: task.assignee || null,
        due_date: task.dueDate || null,
        notes: task.notes || "",
        source: task.source || "manual",
        parent_task_id: task.parent_task_id || null,
        task_type: task.task_type || "task",
        phase: task.phase || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (data) {
      const newTask = {
        ...data, loc: data.location_code, sub: data.sub_location_code,
        assignee: data.assignee_id, dueDate: data.due_date || "",
        created: data.created_at?.split("T")[0] || "",
        parent_task_id: data.parent_task_id || null,
        canvas_x: data.canvas_x, canvas_y: data.canvas_y,
      };
      setProjects((ps) =>
        ps.map((p) => (p.id === projId ? { ...p, tasks: [...p.tasks, newTask] } : p))
      );
    }
    return { data, error };
  };

  const deleteTask = async (projId, taskId) => {
    const proj = projects.find((p) => p.id === projId);
    const task = proj?.tasks.find((t) => t.id === taskId);
    if (proj && !canDeleteTask(proj, task)) { alert("You don't have permission to delete this task."); return; }
    await supabase.from("tasks").delete().eq("id", taskId);
    setProjects((ps) =>
      ps.map((p) => (p.id === projId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p))
    );
  };

  const createProject = async (proj) => {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: proj.name,
        subtitle: proj.subtitle || "",
        location: proj.location || "",
        icon: proj.icon || proj.name.substring(0, 2).toUpperCase(),
        color: proj.color || "#2F80ED",
        loc_label: proj.locLabel || "Zone",
        sub_label: proj.subLabel || "Building",
        created_by: user.id,
      })
      .select()
      .single();

    if (data) {
      // Add creator as admin
      await supabase.from("project_members").insert({
        project_id: data.id, user_id: user.id, role: "admin",
      });
      // Add default categories
      const catInserts = DEFAULT_CATEGORIES.map((name, i) => ({
        project_id: data.id, name, sort_order: i,
      }));
      await supabase.from("categories").insert(catInserts);
      // Reload
      await loadProjects();
      return data;
    }
    return null;
  };

  const editProject = async (projId, updates) => {
    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.subtitle !== undefined) dbUpdates.subtitle = updates.subtitle;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.locLabel !== undefined) dbUpdates.loc_label = updates.locLabel;
    if (updates.subLabel !== undefined) dbUpdates.sub_label = updates.subLabel;
    await supabase.from("projects").update(dbUpdates).eq("id", projId);
    await loadProjects();
  };

  const deleteProject = async (projId) => {
    try {
      const res = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: projId }),
      });
      const data = await res.json();
      if (!data.success) { console.error("Delete failed:", data.error); return; }
    } catch (err) { console.error("Delete failed:", err); return; }
    setCurProjId(null);
    setPage("projects");
    await loadProjects();
  };

  // ── NAVIGATION ──
  const goProj = (id) => { setCurProjId(id); setPage("project"); };
  const goEditTask = (projId, task) => { setCurProjId(projId); setPage("project"); };
  const curProj = projects.find((p) => p.id === curProjId);

  // ── LOGIN SCREEN ──
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "transparent" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ margin: "0 auto 16px" }}><Logo size={48} /></div>
          <div style={{ color: "#5E5E72", fontSize: 14 }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "transparent" }}>
        <div style={{ width: 520, background: "rgba(15,15,22,.75)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "32px 36px", boxShadow: "0 24px 80px rgba(0,0,0,.5)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 4 }}>
              <Logo size={50} />
              <h1 style={{ margin: 0, fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 72, fontWeight: 400, letterSpacing: "0.01em" }}>Jackalope</h1>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5E5E72" }}>Architectural Project Management</p>
          </div>
          <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #252535" }}>
            {["Sign In", "Register"].map((label, i) => (
              <button key={label} onClick={() => { setSignupMode(i === 1); setLoginError(""); }}
                style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 600, border: "none",
                  borderBottom: (signupMode ? i === 1 : i === 0) ? "2px solid #3B82F6" : "2px solid transparent",
                  cursor: "pointer", background: "transparent",
                  color: (signupMode ? i === 1 : i === 0) ? "#F0F0F5" : "#5E5E72", fontFamily: F }}>
                {label}
              </button>
            ))}
          </div>
          <form onSubmit={signupMode ? handleSignup : handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {signupMode && (
              <>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5E5E72", textTransform: "uppercase", marginBottom: 6, fontFamily: M }}>Full Name</label>
                  <input value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="R. Castillo" required
                    style={{ width: "100%", background: "rgba(20,20,29,.5)", border: "1px solid #252535", borderRadius: 8, padding: "10px 14px", color: "#F0F0F5", fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5E5E72", textTransform: "uppercase", marginBottom: 6, fontFamily: M }}>Role / Title</label>
                  <input value={signupRole} onChange={(e) => setSignupRole(e.target.value)} placeholder="Project Director"
                    style={{ width: "100%", background: "rgba(20,20,29,.5)", border: "1px solid #252535", borderRadius: 8, padding: "10px 14px", color: "#F0F0F5", fontSize: 13, outline: "none" }} />
                </div>
              </>
            )}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5E5E72", textTransform: "uppercase", marginBottom: 6, fontFamily: M }}>Email</label>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@texarchworks.com" required
                style={{ width: "100%", background: "rgba(20,20,29,.5)", border: "1px solid #252535", borderRadius: 8, padding: "10px 14px", color: "#F0F0F5", fontSize: 13, outline: "none" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5E5E72", textTransform: "uppercase", marginBottom: 6, fontFamily: M }}>Password</label>
              <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="••••••••" required minLength={6}
                style={{ width: "100%", background: "rgba(20,20,29,.5)", border: "1px solid #252535", borderRadius: 8, padding: "10px 14px", color: "#F0F0F5", fontSize: 13, outline: "none" }} />
            </div>
            {loginError && <div style={{ background: "#451a1a", border: "1px solid #7f1d1d", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#FCA5A5" }}>{loginError}</div>}
            <button type="submit" style={{ ...bs, background: "#2F80ED", color: "white", width: "100%", padding: "12px", fontSize: 14, fontWeight: 600 }}>
              {signupMode ? "Create Account" : "Sign In"}
            </button>
          </form>
          {signupMode && (
            <p style={{ fontSize: 11, color: "#3A3A48", textAlign: "center", marginTop: 12 }}>
              Only @texarchworks.com emails can register
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── MAIN APPLICATION ──
  // Set CSS custom properties for theme
  if (typeof document !== "undefined") {
    const r = document.documentElement.style;
    r.setProperty("--t-bg", T.bg);
    r.setProperty("--t-card", T.bgCard);
    r.setProperty("--t-elevated", T.bgElevated);
    r.setProperty("--t-input", T.bgInput);
    r.setProperty("--t-hover", T.bgHover);
    r.setProperty("--t-subrow", T.bgSubRow);
    r.setProperty("--t-border", T.border);
    r.setProperty("--t-border-s", T.borderSubtle);
    r.setProperty("--t-text", T.text);
    r.setProperty("--t-text2", T.textSecondary);
    r.setProperty("--t-muted", T.textMuted);
    r.setProperty("--t-dim", T.textDim);
    r.setProperty("--t-sub", T.textSub);
    r.setProperty("--t-accent", T.accent);
    r.setProperty("--t-shadow", T.shadow);
    r.setProperty("--t-modal", T.bgModal);
    r.setProperty("--t-sidebar", T.bgSidebar);
    document.body.style.background = T.bg;
    document.body.style.color = T.text;
  }
  return (
    <div style={{ fontFamily: F, background: T.bg, color: T.text, minHeight: "100vh", display: "flex", position: "relative", overflow: "hidden" }}>
      {/* Animated gradient background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: "120%", height: "120%", top: "-10%", left: "-10%", background: T.gradient, animation: "gradientDrift 20s ease-in-out infinite alternate" }} />
        {T.gradientOrbs.map((orb, i) => <div key={i} style={{ position: "absolute", width: orb.size, height: orb.size, borderRadius: "50%", top: orb.top, left: orb.left, right: orb.right, bottom: orb.bottom, background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`, filter: `blur(${orb.blur}px)`, animation: `bubbleFloat ${25 + i * 5}s ease-in-out infinite ${i % 2 === 0 ? "alternate" : "alternate-reverse"}` }} />)}
      </div>
      {/* SIDEBAR */}
      <aside style={{ width: 240, background: T.bgSidebar, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0, height: "100vh", position: "sticky", top: 0, zIndex: 2 }}>
        <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={22} />
            <div>
              <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 32, fontWeight: 400, letterSpacing: "0.01em" }}>Jackalope</div>
              <div style={{ fontSize: 10, color: "#5E5E72", fontFamily: M }}>TEXARCHWORKS</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {[{ id: "mywork", label: "My Work", icon: "◐" }, { id: "projects", label: "Projects", icon: "▣" }, ...(canDoOrg(ACTIONS.VIEW_ORG_TEAM) ? [{ id: "team", label: "Team", icon: "◉" }] : [])].map((n) => (
            <button key={n.id} onClick={() => { setPage(n.id); setCurProjId(null); }}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: page === n.id ? 600 : 400, background: page === n.id ? T.text : "transparent", color: page === n.id ? T.bg : T.textMuted, marginBottom: 4, textAlign: "left", fontFamily: F }}>
              <span style={{ fontSize: 14 }}>{n.icon}</span>{n.label}
            </button>
          ))}

          <div style={{ fontSize: 10, color: "#3A3A48", textTransform: "uppercase", fontFamily: M, padding: "16px 12px 6px", letterSpacing: ".08em" }}>Projects</div>
          {projects.map((p) => (
            <button key={p.id} onClick={() => goProj(p.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: curProjId === p.id && page === "project" ? 600 : 400, background: curProjId === p.id && page === "project" ? T.text : "transparent", color: curProjId === p.id && page === "project" ? T.bg : T.textMuted, marginBottom: 2, textAlign: "left", fontFamily: F }}>
              <div style={{ width: 22, height: 22, borderRadius: 5, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "white", flexShrink: 0 }}>{p.icon}</div>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#3A3A48", fontFamily: M }}>{p.tasks.filter((t) => t.status !== "resolved").length}</span>
            </button>
          ))}
        </nav>

        {/* User info + logout */}
        <div style={{ padding: "12px 10px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: profile?.color || "#2F80ED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white" }}>{av(profile?.name || "U")}</div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.name || "User"}</div>
              <div style={{ fontSize: 10, color: "#5E5E72" }}>{profile?.role || ""}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <button onClick={toggleTheme} style={{ ...bs, background: T.bgElevated, color: T.textMuted, flex: 1, fontSize: 11 }}>{themeId === "dark" ? "☀ Light" : "🌙 Dark"}</button>
            <button onClick={handleLogout} style={{ ...bs, background: T.bgElevated, color: T.textMuted, flex: 1, fontSize: 11 }}>Sign Out</button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: "24px 28px", overflowY: "auto", maxHeight: "100vh", position: "relative", zIndex: 2 }}>
        {page === "mywork" && profile && (
          <MyWork user={profile} projects={projects} goProj={goProj} goEditTask={goEditTask} onUpdateTask={updateTaskLocal} theme={T} />
        )}
        {page === "projects" && (
          <ProjectsHome projects={projects} goProj={goProj} onNew={createProject} allUsers={projects.flatMap((p) => p.team).filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)} theme={T} />
        )}
        {page === "team" && org && (
          <OrgTeam org={org} orgMembers={orgMembers} projects={projects} userId={user?.id} onReload={loadProjects} theme={T} />
        )}
        {page === "project" && curProj && (
          <>
            <button onClick={() => setPage("projects")} style={{ background: "none", border: "none", cursor: "pointer", color: "#5E5E72", fontSize: 12, marginBottom: 12, fontFamily: F, padding: 0 }}>
              ← Back to Projects
            </button>
            <ProjectDetail
              project={curProj}
              userId={user.id}
              isPM={isUserPM(curProj)}
              permissions={{
                canCreate: canCreate(curProj),
                canDelete: canDelete(curProj),
                canManageTeam: canManageTeam(curProj),
                isViewer: isUserViewer(curProj),
                isAdmin: isUserAdmin(curProj),
                role: getUserRole(curProj),
              }}
              onCreateTask={(task) => createTask(curProj.id, task)}
              onUpdateTask={(taskId, updates) => updateTaskLocal(curProj.id, taskId, updates)}
              onDeleteTask={(taskId) => deleteTask(curProj.id, taskId)}
              onReload={loadProjects}
              onEditProject={(updates) => editProject(curProj.id, updates)}
              onDeleteProject={() => deleteProject(curProj.id)}
              theme={T}
            />
          </>
        )}
        {page === "project" && !curProj && (
          <div style={{ color: "#5E5E72", padding: 40, textAlign: "center" }}>
            Project not found.{" "}
            <button onClick={() => setPage("projects")} style={{ color: "#2F80ED", background: "none", border: "none", cursor: "pointer", fontFamily: F }}>
              View all projects
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
