"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

export default function AdminClientDashboard() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);

    try {
      localStorage.removeItem("selected_org_id");
      localStorage.removeItem("selected_org_name");
      localStorage.removeItem("pending_invite_code");
      localStorage.removeItem("invite_error");

      await supabase.auth.signOut();
    } finally {
      router.push("/select-shelter");
      setSigningOut(false);
    }
  }

  return (
    <AuthGuard>
      <AdminGuard>
        <main
          className="min-h-screen bg-white"
          style={
            {
              ["--brand" as any]: "#5883A8",
              ["--brandDark" as any]: "#40556A",
              ["--brandSoft" as any]: "#EAF2F8",
              ["--brandBorder" as any]: "#B7C9D7",
              ["--brandRing" as any]: "#5883A8",
            } as React.CSSProperties
          }
        >
          {/* Header */}
          <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2 rounded"
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
                <span className="text-lg font-semibold text-slate-900">
                  ShelterStock
                </span>
              </Link>

              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-sm font-medium text-slate-600">
                  Client Dashboard
                </span>

                <button
                  onClick={() => router.push("/admin/dashboard")}
                  className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                >
                  Back
                </button>

                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-60"
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          </header>

          {/* Content */}
          <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />

            <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
              <div className="mx-auto max-w-3xl text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
                  <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
                  Client management
                </div>

                <h1 className="mt-6 text-4xl font-bold text-slate-900 sm:text-5xl">
                  Client dashboard
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                  View client check-ins, totals, and reports.
                </p>
              </div>

              {/* 3 cards */}
              <div className="mt-12 grid gap-8 md:grid-cols-2">
                <ActionCard
                  title="View clients"
                  desc="See client names and total hours logged."
                  cta="Open view page"
                  onClick={() => router.push("/admin/client/view")}
                  icon={<ClientListIcon />}
                />

                <ActionCard
                  title="Edit clients"
                  desc="Correct or manage client naming for consistent reporting."
                  cta="Open edit page"
                  onClick={() => router.push("/admin/client/edit")}
                  icon={<EditIcon />}
                />

                <ActionCard
                  title="Client reports"
                  desc="View totals by client and group across your selected range."
                  cta="Open reports"
                  onClick={() => router.push("/admin/client/reports")}
                  icon={<ReportIcon />}
                />
              </div>
            </div>
          </section>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}

/* =========================
   Card
========================= */

function ActionCard({
  title,
  desc,
  cta,
  icon,
  onClick,
}: {
  title: string;
  desc: string;
  cta: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-8 transition-all hover:border-[color:var(--brandBorder)] hover:shadow-lg focus:outline-none"
    >
      <div className="flex items-start gap-4">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--brandSoft)] text-[color:var(--brand)] ring-1 ring-[color:var(--brandBorder)] transition-colors group-hover:bg-[color:var(--brand)] group-hover:text-white">
          {icon}
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>

          <div className="mt-6 inline-flex items-center text-sm font-semibold text-[color:var(--brand)]">
            {cta}
            <svg
              className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Icons
========================= */

function ClientListIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7a4 4 0 118 0 4 4 0 01-8 0zM6 21a6 6 0 0112 0M4 11h2m12 0h2M4 15h2m12 0h2"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5h2M12 3v2m-7 14l4-1 10-10a2 2 0 10-3-3L6 15l-1 4z"
      />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17v-6m4 6V7m4 10v-4M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}
