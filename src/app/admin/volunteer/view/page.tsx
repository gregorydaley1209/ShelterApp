"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import { getMyProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

function clsx(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

type CheckinRow = {
  volunteer_name: string;
  hours_worked: number;
  checkin_date: string; // YYYY-MM-DD
};

type VolunteerAgg = {
  key: string; // normalized key
  displayName: string; // first-seen name version
  totalHours: number;
  dates: string[]; // unique YYYY-MM-DD, newest first
  checkinsCount: number;
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function formatISODate(d: string) {
  return d;
}

export default function ViewVolunteersPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CheckinRow[]>([]);
  const [error, setError] = useState<string>("");

  // UI controls
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"hours" | "name" | "recent">("hours");

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

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      const p = await getMyProfile();
      if (!p) {
        window.location.href = "/login";
        return;
      }

      const { data, error: qErr } = await supabase
        .from("volunteer_checkins")
        .select("volunteer_name,hours_worked,checkin_date")
        .eq("organization_id", p.organization_id)
        .order("checkin_date", { ascending: false });

      if (qErr) {
        setError(qErr.message || "Failed to load volunteer check-ins.");
        setRows([]);
        setLoading(false);
        return;
      }

      setRows(((data as any) ?? []) as CheckinRow[]);
      setLoading(false);
    })();
  }, []);

  const volunteers: VolunteerAgg[] = useMemo(() => {
    // Case-insensitive grouping: Alex == aLex
    const map = new Map<string, VolunteerAgg>();

    for (const r of rows) {
      const key = normalizeName(r.volunteer_name || "");
      if (!key) continue;

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          displayName: r.volunteer_name.trim(), // first-seen casing becomes display
          totalHours: Number(r.hours_worked || 0),
          dates: r.checkin_date ? [r.checkin_date] : [],
          checkinsCount: 1,
        });
      } else {
        existing.totalHours += Number(r.hours_worked || 0);
        existing.checkinsCount += 1;
        if (r.checkin_date && !existing.dates.includes(r.checkin_date)) {
          existing.dates.push(r.checkin_date);
        }
      }
    }

    // Ensure dates newest first
    const arr = Array.from(map.values()).map((v) => ({
      ...v,
      dates: v.dates.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0)),
    }));

    // Search filter
    const s = search.trim().toLowerCase();
    const filtered = !s
      ? arr
      : arr.filter(
          (v) =>
            v.displayName.toLowerCase().includes(s) ||
            v.key.includes(s) ||
            v.dates.some((d) => d.includes(s))
        );

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "name") return a.displayName.localeCompare(b.displayName);
      if (sortBy === "recent") {
        const ad = a.dates[0] || "";
        const bd = b.dates[0] || "";
        return bd.localeCompare(ad);
      }
      return (b.totalHours || 0) - (a.totalHours || 0);
    });

    return filtered;
  }, [rows, search, sortBy]);

  const totalHoursAll = useMemo(() => {
    return volunteers.reduce((sum, v) => sum + (v.totalHours || 0), 0);
  }, [volunteers]);

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
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[color:var(--brand)] focus:text-white focus:px-4 focus:py-2 focus:rounded focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]"
          >
            Skip to content
          </a>

          {/* Header */}
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

              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-sm font-medium text-slate-600">
                  Volunteer Dashboard
                </span>

                <button
                  onClick={() => router.push("/admin/volunteer/dashboard")}
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
          <section
            id="main-content"
            className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />

            <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
              <div className="mx-auto max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
                  <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
                  Volunteers • Totals
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
                      Volunteers
                    </h1>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
                      Total hours (filtered)
                    </div>
                    <div className="mt-1 text-3xl font-bold text-[color:var(--brand)]">
                      {totalHoursAll.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">
                        Search
                      </label>
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                        placeholder="Name or date (YYYY-MM-DD)…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">
                        Sort by
                      </label>
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                      >
                        <option value="hours">Total hours</option>
                        <option value="recent">Most recent date</option>
                        <option value="name">Name</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Main list */}
                <div className="mt-8">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    {loading ? (
                      <div className="text-sm text-slate-600">Loading…</div>
                    ) : error ? (
                      <div className="rounded-xl border border-red-600/20 bg-red-500/10 p-4 text-sm text-red-800">
                        {error}
                      </div>
                    ) : volunteers.length === 0 ? (
                      <div className="text-sm text-slate-600">
                        No volunteer check-ins found.
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {volunteers.map((v) => (
                          <div
                            key={v.key}
                            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[color:var(--brandBorder)]"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <h2 className="text-lg font-bold text-slate-900 truncate">
                                  {v.displayName}
                                </h2>
                                <p className="mt-1 text-sm text-slate-600">
                                  {v.checkinsCount} check-in{v.checkinsCount === 1 ? "" : "s"}
                                </p>
                              </div>

                              <div className="shrink-0">
                                <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
                                  Total hours
                                </div>
                                <div className="mt-1 text-2xl font-bold text-[color:var(--brand)]">
                                  {Number(v.totalHours).toFixed(2)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Dates checked in
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {v.dates.map((d) => (
                                  <span
                                    key={d}
                                    className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
                                    title={d}
                                  >
                                    {formatISODate(d)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}
