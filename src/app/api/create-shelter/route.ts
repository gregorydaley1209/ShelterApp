import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function makeEmailSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function normalizeUsername(u: string) {
  return u.trim().toLowerCase();
}

function isValidUsername(u: string) {
  // 3-24 chars, letters/numbers/._-
  return /^[a-z0-9._-]{3,24}$/.test(u);
}

function isValidPassword(p: string) {
  // keep it simple but not terrible
  return p.trim().length >= 8;
}

const MASTER_SETUP_CODE = process.env.MASTER_SETUP_CODE || "";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const shelterName = String(body?.name || "").trim();
    const setupCode = String(body?.setupCode || "").trim();

    const adminUsername = normalizeUsername(String(body?.adminUsername || ""));
    const adminPassword = String(body?.adminPassword || "");

    const volUsername = normalizeUsername(String(body?.volUsername || ""));
    const volPassword = String(body?.volPassword || "");

    if (!shelterName) {
      return NextResponse.json({ error: "Missing shelter name" }, { status: 400 });
    }

    // protect shelter creation
    if (MASTER_SETUP_CODE && setupCode !== MASTER_SETUP_CODE) {
      return NextResponse.json({ error: "Invalid setup code" }, { status: 403 });
    }

    // validate usernames/passwords
    if (!isValidUsername(adminUsername)) {
      return NextResponse.json(
        { error: "Admin username must be 3-24 chars and only letters, numbers, . _ -" },
        { status: 400 }
      );
    }
    if (!isValidUsername(volUsername)) {
      return NextResponse.json(
        { error: "Volunteer username must be 3-24 chars and only letters, numbers, . _ -" },
        { status: 400 }
      );
    }
    if (adminUsername === volUsername) {
      return NextResponse.json(
        { error: "Admin username and Volunteer username must be different." },
        { status: 400 }
      );
    }
    if (!isValidPassword(adminPassword)) {
      return NextResponse.json({ error: "Admin password must be at least 8 characters." }, { status: 400 });
    }
    if (!isValidPassword(volPassword)) {
      return NextResponse.json({ error: "Volunteer password must be at least 8 characters." }, { status: 400 });
    }

    // 1) Create org
    const { data: org, error: orgErr } = await supabaseAdmin
      .from("organizations")
      .insert({ name: shelterName, is_listed: true })
      .select("id,name")
      .single();

    if (orgErr || !org) {
      return NextResponse.json({ error: orgErr?.message || "Failed to create org" }, { status: 400 });
    }

    const slug = makeEmailSlug(shelterName);

    // Create "fake emails" from usernames so Supabase Auth works
    const adminEmail = `${adminUsername}@${slug}.local.shelter`;
    const volunteerEmail = `${volUsername}@${slug}.local.shelter`;

    // 2) Create auth users
    const { data: adminUser, error: adminUserErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

    if (adminUserErr || !adminUser?.user) {
      return NextResponse.json({ error: adminUserErr?.message || "Failed to create admin user" }, { status: 400 });
    }

    const { data: volUser, error: volUserErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: volunteerEmail,
        password: volPassword,
        email_confirm: true,
      });

    if (volUserErr || !volUser?.user) {
      return NextResponse.json({ error: volUserErr?.message || "Failed to create volunteer user" }, { status: 400 });
    }

    // 3) Create profiles for both (store usernames!)
    const { error: profErr } = await supabaseAdmin.from("profiles").upsert([
      { id: adminUser.user.id, organization_id: org.id, role: "admin", login_username: adminUsername },
      { id: volUser.user.id, organization_id: org.id, role: "volunteer", login_username: volUsername },
    ]);

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 400 });
    }

    // Return credentials ONCE (passwords only shown here)
    return NextResponse.json({
      organization: org,
      credentials: {
        admin: { username: adminUsername, email: adminEmail, password: adminPassword },
        volunteer: { username: volUsername, email: volunteerEmail, password: volPassword },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
