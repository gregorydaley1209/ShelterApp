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
  group_name: string | null;
  checkin_date: string; // YYYY-MM-DD
};

type VolunteerAgg = {
  key: string; // normalized
  displayName: string;
  totalHours: number;
  dates: string[]; // unique
  checkinsCount: number;
  groups: string[]; // unique
};

type GroupAgg = {
  key: string; // normalized
  displayName: string;
  totalHours: number;
  dates: string[]; // unique
  checkinsCount: number;
  volunteers: string[]; // unique (display)
};

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

function iso(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayISO() {
  return iso(new Date());
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "ok";
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset";
  const toneCls =
    tone === "ok"
      ? "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20"
      : "bg-slate-500/10 text-slate-700 ring-slate-600/20";
  return <span className={clsx(base, toneCls)}>{children}</span>;
}

export default function VolunteerReportsPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const [rows, setRows] = useState<CheckinRow[]>([]);

  // Controls
  const [fromDate, setFromDate] = useState(daysAgoISO(30));
  const [toDate, setToDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"volunteers" | "groups">("volunteers");
  const [sortBy, setSortBy] = useState<"hours" | "name" | "recent">("hours");

  // UX: keep track of last run
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);

    try {
      localStorage.removeItem("selected_org_id");
      localStorage.removeItem("selected_org_name");
      localStorage.removeItem("pending_invite_code");
      localStorage.removeItem("pending_invite_email");
      localStorage.removeItem("pending_invite_role");
      localStorage.removeItem("invite_error");
      await supabase.auth.signOut();
    } finally {
      router.push("/select-shelter");
      setSigningOut(false);
    }
  }

  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runReport() {
    setRunning(true);
    setLoading(true);
    setError("");

    const p = await getMyProfile();
    if (!p) {
      window.location.href = "/login";
      return;
    }

    const f = fromDate || daysAgoISO(30);
    const t = toDate || todayISO();
    if (f && t && f > t) {
      setError("Start date must be on or before end date.");
      setLoading(false);
      setRunning(false);
      return;
    }

    const { data, error: qErr } = await supabase
      .from("volunteer_checkins")
      .select("volunteer_name,hours_worked,group_name,checkin_date")
      .eq("organization_id", p.organization_id)
      .gte("checkin_date", f)
      .lte("checkin_date", t)
      .order("checkin_date", { ascending: false });

    if (qErr) {
      setError(qErr.message || "Failed to load report data.");
      setRows([]);
      setLoading(false);
      setRunning(false);
      return;
    }

    setRows(((data as any) ?? []) as CheckinRow[]);
    setLastRunAt(new Date());
    setLoading(false);
    setRunning(false);
  }

  const computed = useMemo(() => {
    const volunteerMap = new Map<string, VolunteerAgg>();
    const groupMap = new Map<string, GroupAgg>();

    for (const r of rows) {
      const vNameRaw = (r.volunteer_name || "").trim();
      const vKey = normalize(vNameRaw);
      const date = r.checkin_date || "";
      const hrs = Number(r.hours_worked || 0);
      const gRaw = (r.group_name || "").trim();
      const gKey = normalize(gRaw);

      if (vKey) {
        const v = volunteerMap.get(vKey);
        if (!v) {
          volunteerMap.set(vKey, {
            key: vKey,
            displayName: vNameRaw || "(Unnamed)",
            totalHours: hrs,
            dates: date ? [date] : [],
            checkinsCount: 1,
            groups: gRaw ? [gRaw] : [],
          });
        } else {
          v.totalHours += hrs;
          v.checkinsCount += 1;
          if (date && !v.dates.includes(date)) v.dates.push(date);
          if (gRaw && !v.groups.some((x) => normalize(x) === gKey)) v.groups.push(gRaw);
        }
      }

      if (gKey) {
        const g = groupMap.get(gKey);
        if (!g) {
          groupMap.set(gKey, {
            key: gKey,
            displayName: gRaw,
            totalHours: hrs,
            dates: date ? [date] : [],
            checkinsCount: 1,
            volunteers: vNameRaw ? [vNameRaw] : [],
          });
        } else {
          g.totalHours += hrs;
          g.checkinsCount += 1;
          if (date && !g.dates.includes(date)) g.dates.push(date);
          if (vNameRaw && !g.volunteers.some((x) => normalize(x) === vKey)) g.volunteers.push(vNameRaw);
        }
      }
    }

    const volunteers = Array.from(volunteerMap.values()).map((v) => ({
      ...v,
      dates: v.dates.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0)),
      groups: v.groups.sort((a, b) => a.localeCompare(b)),
    }));

    const groups = Array.from(groupMap.values()).map((g) => ({
      ...g,
      dates: g.dates.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0)),
      volunteers: g.volunteers.sort((a, b) => a.localeCompare(b)),
    }));

    const s = search.trim().toLowerCase();
    const volunteersFiltered = !s
      ? volunteers
      : volunteers.filter(
          (v) =>
            v.displayName.toLowerCase().includes(s) ||
            v.dates.some((d) => d.includes(s)) ||
            v.groups.some((g) => g.toLowerCase().includes(s))
        );

    const groupsFiltered = !s
      ? groups
      : groups.filter(
          (g) =>
            g.displayName.toLowerCase().includes(s) ||
            g.dates.some((d) => d.includes(s)) ||
            g.volunteers.some((v) => v.toLowerCase().includes(s))
        );

    const sortFn = (a: any, b: any) => {
      if (sortBy === "name") return String(a.displayName).localeCompare(String(b.displayName));
      if (sortBy === "recent") return String(b.dates?.[0] || "").localeCompare(String(a.dates?.[0] || ""));
      return Number(b.totalHours || 0) - Number(a.totalHours || 0);
    };

    volunteersFiltered.sort(sortFn);
    groupsFiltered.sort(sortFn);

    const totalHours = rows.reduce((sum, r) => sum + Number(r.hours_worked || 0), 0);
    const totalCheckins = rows.length;

    return {
      volunteers: volunteersFiltered,
      groups: groupsFiltered,
      totalHours,
      totalCheckins,
    };
  }, [rows, search, sortBy]);

  function downloadCSV(kind: "volunteers" | "groups") {
    const f = fromDate || "";
    const t = toDate || "";
    const header =
      kind === "volunteers"
        ? ["volunteer_name", "total_hours", "checkins_count", "dates", "groups"]
        : ["group_name", "total_hours", "checkins_count", "dates", "volunteers"];

    const lines: string[] = [];
    lines.push(header.join(","));

    if (kind === "volunteers") {
      for (const v of computed.volunteers) {
        lines.push(
          [
            csvEscape(v.displayName),
            csvEscape(v.totalHours.toFixed(2)),
            csvEscape(v.checkinsCount),
            csvEscape(v.dates.join(" | ")),
            csvEscape(v.groups.join(" | ")),
          ].join(",")
        );
      }
    } else {
      for (const g of computed.groups) {
        lines.push(
          [
            csvEscape(g.displayName),
            csvEscape(g.totalHours.toFixed(2)),
            csvEscape(g.checkinsCount),
            csvEscape(g.dates.join(" | ")),
            csvEscape(g.volunteers.join(" | ")),
          ].join(",")
        );
      }
    }

    const meta = [`Report range: ${f} to ${t}`, `Generated: ${new Date().toISOString()}`].join("\n");
    const csv = `${meta}\n\n${lines.join("\n")}`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `volunteer-report-${kind}-${f || "from"}-${t || "to"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function applyPreset(days: number) {
    setFromDate(daysAgoISO(days));
    setToDate(todayISO());
  }

  const statusLine = useMemo(() => {
    const f = fromDate || "";
    const t = toDate || "";
    const range = f && t ? `${f} → ${t}` : "Custom range";
    const last = lastRunAt ? `• Updated ${lastRunAt.toLocaleTimeString()}` : "";
    return `Range: ${range} ${last}`.trim();
  }, [fromDate, toDate, lastRunAt]);

  const msgBox = (tone: "error" | "neutral", text: string) => {
    const cls =
      tone === "error"
        ? "border-red-600/20 bg-red-500/10 text-red-800"
        : "border-slate-200 bg-slate-50 text-slate-700";
    return <div className={clsx("mt-4 rounded-xl border p-4 text-sm", cls)}>{text}</div>;
  };

  const totalCards = (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
          Total hours
        </div>
        <div className="mt-1 text-3xl font-bold text-[color:var(--brand)]">
          {computed.totalHours.toFixed(2)}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
          Total check-ins
        </div>
        <div className="mt-1 text-3xl font-bold text-[color:var(--brand)]">
          {String(computed.totalCheckins)}
        </div>
      </div>
    </div>
  );

  const tabCount = activeTab === "volunteers" ? computed.volunteers.length : computed.groups.length;

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
                  Volunteers • Reports
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
                    Volunteer reports
                  </h1>
                  <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
                    Filter by date range, search, and export totals.
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge>{statusLine}</Badge>
                    <Badge tone="ok">Showing {computed.totalCheckins} check-ins</Badge>
                  </div>
                </div>

                {totalCards}

                {/* Controls */}
                <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  {/* Presets */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">Quick range:</span>
                    <button
                      onClick={() => applyPreset(7)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                    >
                      Last 7 days
                    </button>
                    <button
                      onClick={() => applyPreset(30)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                    >
                      Last 30 days
                    </button>
                    <button
                      onClick={() => applyPreset(90)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                    >
                      Last 90 days
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">From</label>
                      <input
                        type="date"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">To</label>
                      <input
                        type="date"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Search</label>
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                        placeholder="Name, group, date…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Sort by</label>
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

                  {/* Actions */}
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={runReport}
                        disabled={running}
                        className="inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2 disabled:opacity-60"
                      >
                        {running ? "Running…" : "Run report"}
                        <svg
                          className="ml-2 h-4 w-4"
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
                      </button>

                      <button
                        onClick={() => {
                          setFromDate(daysAgoISO(30));
                          setToDate(todayISO());
                          setSearch("");
                          setSortBy("hours");
                          setActiveTab("volunteers");
                        }}
                        className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                      >
                        Reset
                      </button>
                    </div>

                    {/* Export dropdown (less clutter) */}
                    <div className="flex items-center justify-end">
                      <details className="relative">
                        <summary className="list-none cursor-pointer inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
                          Export…
                          <svg
                            className="ml-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>

                        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 z-20">
                          <button
                            onClick={() => downloadCSV("volunteers")}
                            className="w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                          >
                            Export volunteers CSV
                          </button>
                          <button
                            onClick={() => downloadCSV("groups")}
                            className="w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                          >
                            Export groups CSV
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>

                  {error && msgBox("error", error)}
                </div>

                {/* Tabs */}
                <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("volunteers")}
                      className={clsx(
                        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2",
                        activeTab === "volunteers"
                          ? "bg-[color:var(--brand)] text-white"
                          : "border-2 border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                      )}
                    >
                      By volunteer
                    </button>

                    <button
                      onClick={() => setActiveTab("groups")}
                      className={clsx(
                        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2",
                        activeTab === "groups"
                          ? "bg-[color:var(--brand)] text-white"
                          : "border-2 border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                      )}
                    >
                      By group
                    </button>
                  </div>

                  <div className="text-sm text-slate-600">
                    Showing <span className="font-semibold text-slate-900">{tabCount}</span>{" "}
                    {activeTab === "volunteers" ? "volunteer" : "group"}
                    {tabCount === 1 ? "" : "s"}
                  </div>
                </div>

                {/* Results */}
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  {loading ? (
                    <div className="text-sm text-slate-600">Loading…</div>
                  ) : rows.length === 0 ? (
                    <div className="text-sm text-slate-600">
                      No check-ins found for this range.
                    </div>
                  ) : activeTab === "volunteers" ? (
                    <div className="space-y-5">
                      {computed.volunteers.map((v) => {
                        const lastDate = v.dates?.[0] || "";
                        return (
                          <div
                            key={v.key}
                            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[color:var(--brandBorder)]"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <h2 className="text-lg font-bold text-slate-900 truncate">
                                  {v.displayName}
                                </h2>

                                {/* Meta row */}
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                                  <Badge>{v.checkinsCount} check-in{v.checkinsCount === 1 ? "" : "s"}</Badge>
                                  {lastDate ? <Badge>Last: {lastDate}</Badge> : null}
                                </div>
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
                                    {d}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {v.groups.length > 0 && (
                              <div className="mt-4">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Groups
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {v.groups.map((g) => (
                                    <span
                                      key={g}
                                      className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
                                      title={g}
                                    >
                                      {g}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {computed.groups.length === 0 ? (
                        <div className="text-sm text-slate-600">
                          No group check-ins found for this range.
                        </div>
                      ) : (
                        computed.groups.map((g) => {
                          const lastDate = g.dates?.[0] || "";
                          return (
                            <div
                              key={g.key}
                              className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[color:var(--brandBorder)]"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <h2 className="text-lg font-bold text-slate-900 truncate">
                                    {g.displayName}
                                  </h2>

                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                                    <Badge>{g.checkinsCount} check-in{g.checkinsCount === 1 ? "" : "s"}</Badge>
                                    {lastDate ? <Badge>Last: {lastDate}</Badge> : null}
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
                                    Total hours
                                  </div>
                                  <div className="mt-1 text-2xl font-bold text-[color:var(--brand)]">
                                    {Number(g.totalHours).toFixed(2)}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Dates checked in
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {g.dates.map((d) => (
                                    <span
                                      key={d}
                                      className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
                                      title={d}
                                    >
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {g.volunteers.length > 0 && (
                                <div className="mt-4">
                                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Volunteers
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {g.volunteers.map((v) => (
                                      <span
                                        key={v}
                                        className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
                                        title={v}
                                      >
                                        {v}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}
