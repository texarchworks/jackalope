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

    // 2. Get locations to find sub_locations by location_id
    const { data: locations } = await admin.from("locations").select("id").eq("project_id", projectId);
    if (locations && locations.length > 0) {
      const locIds = locations.map((l) => l.id);
      // Try deleting sub_locations by location_id
      const { error: subLocErr1 } = await admin.from("sub_locations").delete().in("location_id", locIds);
      if (subLocErr1) errors.push("sub_locations(by loc): " + subLocErr1.message);
    }
    // Also try by project_id in case that column exists
    const { error: subLocErr2 } = await admin.from("sub_locations").delete().eq("project_id", projectId);
    if (subLocErr2 && !subLocErr2.message.includes("column")) errors.push("sub_locations(by proj): " + subLocErr2.message);

    // 3. Delete locations
    const { error: locErr } = await admin.from("locations").delete().eq("project_id", projectId);
    if (locErr) errors.push("locations: " + locErr.message);

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
