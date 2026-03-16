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
    const body = await req.json();
    const action = body.action || "invite";
    const admin = getAdmin();

    if (action === "invite") {
      const { email, name, company, orgId, projectId, role, isExternal } = body;
      if (!email || !name) return NextResponse.json({ error: "Name and email required" }, { status: 400 });

      const isExt = isExternal || !email.toLowerCase().endsWith("@texarchworks.com");

      // Fast lookup — check profiles table instead of listing all auth users
      const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email.toLowerCase()).maybeSingle();

      if (existingProfile) {
        await admin.from("profiles").update({ company: company || "", is_external: isExt }).eq("id", existingProfile.id);
        if (orgId && !isExt) {
          await admin.from("org_members").upsert(
            { org_id: orgId, user_id: existingProfile.id, org_role: "member", joined_at: new Date().toISOString() },
            { onConflict: "org_id,user_id" }
          );
        }
        if (projectId) {
          await admin.from("project_members").upsert(
            { project_id: projectId, user_id: existingProfile.id, role: role || (isExt ? "viewer" : "member") },
            { onConflict: "project_id,user_id" }
          );
        }
        return NextResponse.json({ success: true, message: `${name} already registered — added`, existing: true });
      }

      const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { name, company: company || "", is_external: isExt },
        redirectTo: process.env.NEXT_PUBLIC_APP_URL || "https://jackalope-henna.vercel.app",
      });
      if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });

      if (inviteData?.user?.id) {
        await admin.from("profiles").upsert(
          { id: inviteData.user.id, name, email: email.toLowerCase(), role: "", color: isExt ? "#6B7280" : "#2563EB", company: company || "", is_external: isExt },
          { onConflict: "id" }
        );
        if (orgId && !isExt) {
          await admin.from("org_members").upsert(
            { org_id: orgId, user_id: inviteData.user.id, org_role: "member", invited_at: new Date().toISOString() },
            { onConflict: "org_id,user_id" }
          );
        }
        if (projectId) {
          await admin.from("project_members").upsert(
            { project_id: projectId, user_id: inviteData.user.id, role: role || (isExt ? "viewer" : "member") },
            { onConflict: "project_id,user_id" }
          );
        }
      }
      return NextResponse.json({ success: true, message: `Invitation sent to ${name} (${email})` });
    }

    if (action === "resend") {
      const { userId } = body;
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const { data: { user } } = await admin.auth.admin.getUserById(userId);
      if (!user?.email) return NextResponse.json({ error: "User not found" }, { status: 404 });
      await admin.auth.admin.deleteUser(userId);
      const { data: inviteData, error } = await admin.auth.admin.inviteUserByEmail(user.email, {
        data: { name: user.user_metadata?.name || "" },
        redirectTo: process.env.NEXT_PUBLIC_APP_URL || "https://jackalope-henna.vercel.app",
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (inviteData?.user?.id) {
        const { data: oldProfile } = await admin.from("profiles").select("*").eq("id", userId).single();
        await admin.from("profiles").upsert(
          { id: inviteData.user.id, name: oldProfile?.name || user.user_metadata?.name || "", email: user.email.toLowerCase(), role: oldProfile?.role || "", color: oldProfile?.color || "#2563EB", company: oldProfile?.company || "", is_external: oldProfile?.is_external || false },
          { onConflict: "id" }
        );
        await admin.from("org_members").update({ user_id: inviteData.user.id }).eq("user_id", userId);
        await admin.from("project_members").update({ user_id: inviteData.user.id }).eq("user_id", userId);
      }
      return NextResponse.json({ success: true, message: `Invite resent to ${user.email}` });
    }

    if (action === "delete") {
      const { userId } = body;
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      await admin.from("org_members").delete().eq("user_id", userId);
      await admin.from("project_members").delete().eq("user_id", userId);
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ success: true, message: "User removed" });
    }

    if (action === "deactivate") {
      const { userId, orgId } = body;
      await admin.from("org_members").update({ is_active: false }).eq("user_id", userId).eq("org_id", orgId);
      return NextResponse.json({ success: true, message: "User deactivated" });
    }

    if (action === "reactivate") {
      const { userId, orgId } = body;
      await admin.from("org_members").update({ is_active: true }).eq("user_id", userId).eq("org_id", orgId);
      return NextResponse.json({ success: true, message: "User reactivated" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
