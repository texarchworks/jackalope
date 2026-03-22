import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req) {
  try {
    const { projectId } = await req.json();
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const admin = getAdmin();
    const errors = [];

    // 1. Delete sub-tasks (tasks with parent_task_id set)
    const { data: tasks } = await admin.from("tasks").select("id, parent_task_id").eq("project_id", projectId);
    if (tasks && tasks.length > 0) {
      const subTaskIds = tasks.filter((t) => t.parent_task_id).map((t) => t.id);
      const parentTaskIds = tasks.filter((t) => !t.parent_task_id).map((t) => t.id);
      if (subTaskIds.length > 0) {
        const { error } = await admin.from("tasks").delete().in("id", subTaskIds);
        if (error) errors.push("sub_tasks: " + error.message);
      }
      if (parentTaskIds.length > 0) {
        const { error } = await admin.from("tasks").delete().in("id", parentTaskIds);
        if (error) errors.push("tasks: " + error.message);
      }
    }

    // 2. Get zones to find buildings by zone_id
    const { data: zones } = await admin.from("zones").select("id").eq("project_id", projectId);
    if (zones && zones.length > 0) {
      const zoneIds = zones.map((l) => l.id);
      const { error: bldgErr } = await admin.from("buildings").delete().in("zone_id", zoneIds);
      if (bldgErr) errors.push("buildings: " + bldgErr.message);
    }

    // 3. Delete zones
    const { error: zoneErr } = await admin.from("zones").delete().eq("project_id", projectId);
    if (zoneErr) errors.push("zones: " + zoneErr.message);

    // 4. Delete categories
    const { error: catErr } = await admin.from("categories").delete().eq("project_id", projectId);
    if (catErr) errors.push("categories: " + catErr.message);

    // 5. Delete project_members
    const { error: memErr } = await admin.from("project_members").delete().eq("project_id", projectId);
    if (memErr) errors.push("members: " + memErr.message);

    // 6. Delete the project
    const { error: projErr } = await admin.from("projects").delete().eq("id", projectId);
    if (projErr) errors.push("project: " + projErr.message);

    if (errors.length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
