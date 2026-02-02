"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

export default function AdminDashboardPage() {
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
                Admin Dashboard
              </span>
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
                Administrative access
              </div>

              <h1 className="mt-6 text-4xl font-bold text-slate-900 sm:text-5xl">
                Admin dashboard
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                Choose an area to manage.
              </p>
            </div>

            {/* 2x2 grid */}
            <div className="mt-12 grid gap-8 md:grid-cols-2">
              <ActionCard
                title="Client dashboard"
                desc="Manage client organizations, access, and status."
                cta="Open client dashboard"
                onClick={() => router.push("/admin/client/dashboard")}
                icon={<ClientIcon />}
              />

              <ActionCard
                title="Inventory dashboard"
                desc="View inventory data, activity, and reporting."
                cta="Open inventory dashboard"
                onClick={() => router.push("/admin/inventory/dashboard")}
                icon={<InventoryIcon />}
              />

              <ActionCard
                title="Volunteer dashboard"
                desc="Manage volunteer access, tracking, and activity."
                cta="Open volunteer dashboard"
                onClick={() => router.push("/admin/volunteer/dashboard")}
                icon={<VolunteerIcon />}
              />

              <ActionCard
                title="Have suggestions?"
                desc="Tell us what would make ShelterStock better for your team."
                cta="Contact us"
                onClick={() => router.push("/contact")}
                icon={<ContactIcon />}
              />
            </div>
          </div>
        </section>
      </main>
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
        {/* ICON CONTAINER — FIXED */}
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
   Icons (uniform size)
========================= */

function ClientIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857m.288-1.857a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7v10l8 4" />
    </svg>
  );
}

function VolunteerIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10a4 4 0 118 0v1a4 4 0 11-8 0zm-3 10a6 6 0 0112 0v1H5z" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-6 4h8M5 6a2 2 0 012-2h10a2 2 0 012 2v12l-4-3H7a2 2 0 01-2-2z" />
    </svg>
  );
}
