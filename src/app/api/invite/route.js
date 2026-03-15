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

    // Get all tasks to delete sub-tasks first
    const { data: tasks } = await admin.from("tasks").select("id, parent_task_id").eq("project_id", projectId);
    if (tasks && tasks.length > 0) {
      const subTasks = tasks.filter((t) => t.parent_task_id);
      const parentTasks = tasks.filter((t) => !t.parent_task_id);
      if (subTasks.length > 0) {
        await admin.from("tasks").delete().in("id", subTasks.map((t) => t.id));
      }
      if (parentTasks.length > 0) {
        await admin.from("tasks").delete().in("id", parentTasks.map((t) => t.id));
      }
    }

    // Delete related data in correct order
    await admin.from("sub_locations").delete().eq("project_id", projectId);
    await admin.from("locations").delete().eq("project_id", projectId);
    await admin.from("categories").delete().eq("project_id", projectId);
    await admin.from("project_members").delete().eq("project_id", projectId);

    // Finally delete the project
    const { error } = await admin.from("projects").delete().eq("id", projectId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
