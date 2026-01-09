"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabaseClient";

type OrgRow = {
  id: string;
  name: string;
  created_at: string;
};

type ProfileRow = {
  role: "admin" | "volunteer";
  login_username: string | null;
};

function clsx(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function HubCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc?: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-bold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{desc ?? "Open"}</div>
        </div>
        <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition group-hover:bg-slate-50">
          →
        </div>
      </div>
    </a>
  );
}

export default function AdminPage() {
  const [org, setOrg] = useState<OrgRow | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // password modal state
  const [targetRole, setTargetRole] = useState<"admin" | "volunteer" | null>(
    null
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resultPassword, setResultPassword] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      setErr("Not logged in.");
      setLoading(false);
      return;
    }

    const { data: me } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", session.user.id)
      .single();

    if (!me || me.role !== "admin") {
      setErr("Admins only.");
      setLoading(false);
      return;
    }

    const { data: orgRow } = await supabase
      .from("organizations")
      .select("id, name, created_at")
      .eq("id", me.organization_id)
      .single();

    setOrg(orgRow ?? null);

    const { data: profs } = await supabase
      .from("profiles")
      .select("role, login_username")
      .eq("organization_id", me.organization_id)
      .in("role", ["admin", "volunteer"]);

    setProfiles(profs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const adminUsername = useMemo(() => {
    const a = profiles.find((p) => p.role === "admin");
    return a?.login_username || "—";
  }, [profiles]);

  const volunteerUsername = useMemo(() => {
    const v = profiles.find((p) => p.role === "volunteer");
    return v?.login_username || "—";
  }, [profiles]);

  async function submitPasswordChange() {
    if (newPassword.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }

    setErr(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) return;

    const res = await fetch("/api/set-custom-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: session.access_token,
        targetRole,
        password: newPassword,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setErr(data?.error || "Failed to set password.");
      return;
    }

    setResultPassword(newPassword);
    setNewPassword("");
    setConfirmPassword("");
  }

  function closeModal() {
    setTargetRole(null);
    setResultPassword(null);
    setNewPassword("");
    setConfirmPassword("");
    setErr(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const modalTitle = targetRole === "admin" ? "Admin" : "Volunteer";

  return (
    <AuthGuard>
      <AdminGuard>
        <main className="min-h-screen bg-slate-50">
          {/* Top bar */}
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-slate-900 text-white grid place-items-center font-bold shrink-0">
                  S
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 truncate">
                    {org?.name ?? "—"} • Admin
                  </div>
                  <div className="text-base font-semibold text-slate-900">
                    Admin panel
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/dashboard"
                  className="hidden sm:inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Dashboard
                </a>
                <a
                  href="/log"
                  className="hidden sm:inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Log item
                </a>
                <button
                  onClick={signOut}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
            {err && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {err}
              </div>
            )}

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                Loading…
              </div>
            ) : (
              <>
                {/* Shelter + credentials */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Shelter
                      </div>
                      <div className="mt-1 text-2xl font-bold text-slate-900 truncate">
                        {org?.name ?? "—"}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        Created {formatDate(org?.created_at)}
                      </div>
                    </div>

                    {/* Mobile actions */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                      <a
                        href="/dashboard"
                        className="sm:hidden inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      >
                        Dashboard
                      </a>
                      <a
                        href="/log"
                        className="sm:hidden inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Log item
                      </a>
                    </div>
                  </div>

                  <div className="mt-5 grid lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Admin login
                          </div>
                          <div className="mt-2 text-sm text-slate-600">
                            Username
                          </div>
                          <div className="font-semibold text-slate-900 break-all">
                            {adminUsername}
                          </div>
                        </div>
                        <button
                          onClick={() => setTargetRole("admin")}
                          className="shrink-0 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Set password
                        </button>
                      </div>

                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        If you change the password, tell staff immediately.
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Volunteer login
                          </div>
                          <div className="mt-2 text-sm text-slate-600">
                            Username
                          </div>
                          <div className="font-semibold text-slate-900 break-all">
                            {volunteerUsername}
                          </div>
                        </div>
                        <button
                          onClick={() => setTargetRole("volunteer")}
                          className="shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                        >
                          Set password
                        </button>
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                        Volunteers usually use phones for logging.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hub */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Quick actions
                      </div>
                      <div className="text-sm text-slate-600">
                        Jump to a tool.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <HubCard
                      href="/dashboard"
                      title="Dashboard"
                      desc="Inventory + alerts"
                    />
                    <HubCard
                      href="/wishlist"
                      title="Wishlist"
                      desc="Needs + requests"
                    />
                    <HubCard
                      href="/items"
                      title="Items"
                      desc="Create / edit items"
                    />
                    <HubCard
                      href="/reports"
                      title="Reports"
                      desc="Export + summaries"
                    />
                    <HubCard
                      href="/locations"
                      title="Locations"
                      desc="Storage areas"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Password Modal */}
          {targetRole && (
            <div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4"
              role="dialog"
              aria-modal="true"
            >
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl relative overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Update password
                      </div>
                      <div className="mt-1 text-lg font-bold text-slate-900">
                        {modalTitle} password
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        Minimum 8 characters.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={closeModal}
                      aria-label="Close"
                      title="Close"
                      className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 grid place-items-center"
                    >
                      <span className="text-lg leading-none">×</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {resultPassword ? (
                    <>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="text-sm font-semibold text-amber-900">
                          Save this now.
                        </div>
                        <div className="mt-2 text-xs text-amber-900">
                          You will not see it again after closing.
                        </div>

                        <div className="mt-3 rounded-xl border border-amber-200 bg-white p-3">
                          <div className="text-xs text-slate-500">
                            New password
                          </div>
                          <div className="mt-1 font-mono text-sm text-slate-900 break-all">
                            {resultPassword}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={closeModal}
                        className="w-full rounded-xl bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800"
                      >
                        Close
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">
                          New password
                        </label>
                        <input
                          type="password"
                          placeholder="Enter new password"
                          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">
                          Confirm password
                        </label>
                        <input
                          type="password"
                          placeholder="Re-enter password"
                          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>

                      <button
                        onClick={submitPasswordChange}
                        className="w-full rounded-xl bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800"
                      >
                        Save password
                      </button>

                      <button
                        type="button"
                        onClick={closeModal}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}
