"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";

export default function PostAuthPage() {
  const [msg, setMsg] = useState("Finishing setup…");

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        window.location.href = "/";
        return;
      }

      async function setOrgStorage(orgId: string) {
        const { data: org, error } = await supabase
          .from("organizations")
          .select("id,name")
          .eq("id", orgId)
          .single();

        localStorage.setItem("selected_org_id", orgId);
        localStorage.setItem(
          "selected_org_name",
          !error && org?.name ? org.name : "Your Shelter"
        );
      }

      // ✅ Source of truth: profiles row is keyed by auth uid
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("organization_id, role, login_username")
        .eq("id", user.id)
        .single();

      const dbOrgId = profile?.organization_id
        ? String(profile.organization_id)
        : null;

      const role = profile?.role ? String(profile.role).toLowerCase() : null;

      // Break loops: if we can't read profile/org/role, sign out and go back
      if (!dbOrgId || !role) {
        setMsg("Account not fully set up. Sending you back…");

        localStorage.setItem(
          "auth_error",
          profileErr
            ? `Post-auth failed reading your profile (likely RLS). Error: ${profileErr.message}`
            : "This account is missing organization_id or role."
        );

        await supabase.auth.signOut();
        window.location.href = "/select-shelter";
        return;
      }

      // Enforce selected shelter matches DB shelter
      const selectedOrgId = localStorage.getItem("selected_org_id");
      if (selectedOrgId && selectedOrgId !== dbOrgId) {
        setMsg("Wrong shelter selected. Sending you back…");

        await supabase.auth.signOut();

        localStorage.setItem(
          "auth_error",
          "You selected a different shelter than the account you logged into. Please pick the correct shelter and try again."
        );

        window.location.href = "/select-shelter";
        return;
      }

      // If no shelter selected yet, sync from DB
      if (!selectedOrgId) {
        setMsg("Syncing your shelter…");
        await setOrgStorage(dbOrgId);
      }

      // Clear stale state
      localStorage.removeItem("pending_invite_code");
      localStorage.removeItem("invite_error");

      // ✅ Redirect by role
      if (role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/volunteer/dashboard";
      }
    })();
  }, []);

  return (
    <main
      className="min-h-screen bg-white"
      style={
        {
          // Brand blues sampled from your logo
          ["--brand" as any]: "#5883A8",
          ["--brandDark" as any]: "#40556A",
          ["--brandSoft" as any]: "#EAF2F8",
          ["--brandBorder" as any]: "#B7C9D7",
          ["--brandRing" as any]: "#5883A8",
        } as React.CSSProperties
      }
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[color:var(--brand)] focus:text-white focus:px-4 focus:py-2 focus:rounded focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]"
      >
        Skip to content
      </a>

      {/* Minimal header (keeps brand consistent, no nav needed) */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2 rounded"
          >
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded">
              <Image
                src="/shelterstock-logo.png"
                alt="ShelterStock"
                width={36}
                height={36}
                priority
                className="h-9 w-9 object-contain"
              />
            </span>
            <span className="text-lg font-semibold text-slate-900">ShelterStock</span>
          </Link>

          <div className="text-sm font-medium text-slate-600">Signing you in…</div>
        </div>
      </header>

      {/* Content */}
      <section
        id="main-content"
        className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />

        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl place-items-center px-6 py-14 lg:px-8">
          <div className="w-full max-w-lg">
            {/* Status pill */}
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
              <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)] animate-pulse" />
              Secure setup
            </div>

            {/* Card */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h1 className="text-2xl font-bold text-slate-900">One moment</h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">{msg}</p>
              <p className="mt-2 text-sm text-slate-500">
                Please don’t close this tab.
              </p>

              {/* Loading bar */}
              <div className="mt-6">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-1/2 animate-loading-bar rounded-full bg-[color:var(--brand)]" />
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Verifying your account and syncing your shelter…
                </div>
              </div>
            </div>

            {/* Soft reassurance */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
                Why this takes a second
              </p>
              <p className="mt-2 leading-relaxed">
                We confirm your role, organization, and permissions so you land on the right
                dashboard.
              </p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes loadingBar {
            0% {
              transform: translateX(-60%);
            }
            100% {
              transform: translateX(120%);
            }
          }
          .animate-loading-bar {
            animation: loadingBar 1.25s ease-in-out infinite;
          }
        `}</style>
      </section>
    </main>
  );
}
