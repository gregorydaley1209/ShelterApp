import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const accessToken = String(body?.accessToken || "").trim();
    const targetRole = String(body?.targetRole || "").trim(); // "admin" | "volunteer"
    const newPassword = String(body?.password || "");

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 401 }
      );
    }

    if (targetRole !== "admin" && targetRole !== "volunteer") {
      return NextResponse.json(
        { error: "Invalid target role" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // 1) Identify caller from access token
    const { data: callerAuth, error: callerAuthErr } =
      await supabaseAdmin.auth.getUser(accessToken);

    if (callerAuthErr || !callerAuth?.user) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const callerId = callerAuth.user.id;

    // 2) Load caller profile (must be admin)
    const { data: callerProfile, error: callerProfErr } =
      await supabaseAdmin
        .from("profiles")
        .select("organization_id, role")
        .eq("id", callerId)
        .single();

    if (callerProfErr || !callerProfile) {
      return NextResponse.json(
        { error: "Caller profile not found" },
        { status: 403 }
      );
    }

    if (callerProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    const orgId = callerProfile.organization_id;

    // 3) Find target user in same org by role
    const { data: targetProfile, error: targetProfErr } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("organization_id", orgId)
        .eq("role", targetRole)
        .single();

    if (targetProfErr || !targetProfile) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // 4) Set the new password
    const { error: updateErr } =
      await supabaseAdmin.auth.admin.updateUserById(
        targetProfile.id,
        { password: newPassword }
      );

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message },
        { status: 400 }
      );
    }

    // IMPORTANT: we do NOT return the password from the API
    // The UI already has it (the admin typed it)
    return NextResponse.json({ ok: true });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
