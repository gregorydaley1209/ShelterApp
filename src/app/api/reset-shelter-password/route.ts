import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function simplePassword() {
  const a = ["mango","tiger","rocket","river","coffee","hazel","ocean","maple","ember","cactus"];
  const b = ["lantern","meadow","garden","forest","harbor","valley","cloud","anchor","island","field"];
  const w1 = a[Math.floor(Math.random() * a.length)];
  const w2 = b[Math.floor(Math.random() * b.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${w1}-${w2}-${num}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const accessToken = String(body?.accessToken || "").trim();
    const targetRole = String(body?.targetRole || "").trim(); // "admin" | "volunteer"

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }
    if (targetRole !== "admin" && targetRole !== "volunteer") {
      return NextResponse.json({ error: "targetRole must be admin or volunteer" }, { status: 400 });
    }

    // 1) identify caller
    const { data: callerAuth, error: callerAuthErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (callerAuthErr || !callerAuth?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const callerId = callerAuth.user.id;

    // 2) confirm caller is an admin + get org_id
    const { data: callerProfile, error: callerProfErr } = await supabaseAdmin
      .from("profiles")
      .select("id, organization_id, role")
      .eq("id", callerId)
      .single();

    if (callerProfErr || !callerProfile) {
      return NextResponse.json({ error: "Caller profile missing" }, { status: 403 });
    }
    if (callerProfile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    const orgId = callerProfile.organization_id;

    // 3) find the target user in same org by role
    const { data: targetProfile, error: targetErr } = await supabaseAdmin
      .from("profiles")
      .select("id, login_username, role")
      .eq("organization_id", orgId)
      .eq("role", targetRole)
      .single();

    if (targetErr || !targetProfile) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // 4) set new password
    const newPassword = simplePassword();
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(targetProfile.id, {
      password: newPassword,
    });

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    // return password ONCE
    return NextResponse.json({
      role: targetProfile.role,
      username: targetProfile.login_username || null,
      password: newPassword,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
