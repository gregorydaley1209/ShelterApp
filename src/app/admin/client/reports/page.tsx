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

type ClientRow = {
  id: string;
  full_name: string;
  preferred_name: string | null;
  dob: string | null; // YYYY-MM-DD
  age: number | null;
  contact: string | null;
  notes: string | null;
  status: "active" | "inactive" | string;
  good_standing: boolean;
  date_in: string | null; // YYYY-MM-DD
  date_out: string | null; // YYYY-MM-DD
  archived_at: string | null;
  created_at?: string;
};

type ClientAgg = {
  key: string;
  displayName: string;
  status: "active" | "inactive";
  goodStanding: boolean;
  dateIn: string;
  dateOut: string;
  archived: boolean;
};

function iso(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// NOTE: user requested “one day forward” so the default range includes “today”
// even when server timestamps are UTC and users are local.
// So: "today" = local today + 1 day for the default filter bounds.
function todayPlusOneISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return iso(d);
}
function daysAgoPlusOneISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n + 1);
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
  tone?: "neutral" | "ok" | "warn";
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset";
  const toneCls =
    tone === "ok"
      ? "bg-emerald-500/10 text-emerald-800 ring-emerald-600/20"
      : tone === "warn"
      ? "bg-amber-500/10 text-amber-900 ring-amber-600/20"
      : "bg-slate-500/10 text-slate-800 ring-slate-600/20";
  return <span className={clsx(base, toneCls)}>{children}</span>;
}

export default function ClientReportsPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const [rows, setRows] = useState<ClientRow[]>([]);

  // Controls (shifted +1 day by request)
  const [fromDate, setFromDate] = useState(daysAgoPlusOneISO(30));
  const [toDate, setToDate] = useState(todayPlusOneISO());
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const [activeTab, setActiveTab] = useState<"clients" | "status">("clients");
  const [sortBy, setSortBy] = useState<"name" | "recent" | "date_in">("name");

  // Keep track of last run for internal logic only (we won't show the pill)
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

    const f = fromDate || daysAgoPlusOneISO(30);
    const t = toDate || todayPlusOneISO();
    if (f && t && f > t) {
      setError("Start date must be on or before end date.");
      setLoading(false);
      setRunning(false);
      return;
    }

    const { data, error: qErr } = await supabase
      .from("clients")
      .select(
        "id,full_name,preferred_name,dob,age,contact,notes,status,good_standing,date_in,date_out,archived_at,created_at"
      )
      .eq("organization_id", p.organization_id)
      .gte("created_at", `${f}T00:00:00.000Z`)
      .lte("created_at", `${t}T23:59:59.999Z`)
      .order("created_at", { ascending: false });

    if (qErr) {
      setError(qErr.message || "Failed to load report data.");
      setRows([]);
      setLoading(false);
      setRunning(false);
      return;
    }

    setRows(((data as any) ?? []) as ClientRow[]);
    setLastRunAt(new Date());
    setLoading(false);
    setRunning(false);
  }

  const computed = useMemo(() => {
    const s = search.trim().toLowerCase();

    let list = rows.slice();
    if (!includeArchived) list = list.filter((r) => !r.archived_at);

    if (s) {
      list = list.filter((r) => {
        return (
          (r.full_name || "").toLowerCase().includes(s) ||
          (r.preferred_name || "").toLowerCase().includes(s) ||
          (r.contact || "").toLowerCase().includes(s) ||
          (r.notes || "").toLowerCase().includes(s) ||
          (r.date_in || "").includes(s) ||
          (r.date_out || "").includes(s) ||
          (r.dob || "").includes(s) ||
          String(r.age ?? "").includes(s)
        );
      });
    }

    const clients: ClientAgg[] = list.map((r) => {
      const st =
        (r.status || "active").toLowerCase() === "inactive" ? "inactive" : "active";
      return {
        key: r.id,
        displayName: r.preferred_name?.trim()
          ? `${r.full_name} (${r.preferred_name.trim()})`
          : r.full_name,
        status: st,
        goodStanding: Boolean(r.good_standing),
        dateIn: r.date_in || "",
        dateOut: r.date_out || "",
        archived: Boolean(r.archived_at),
      };
    });

    clients.sort((a, b) => {
      if (sortBy === "recent") {
        const ar = rows.find((x) => x.id === a.key)?.created_at || "";
        const br = rows.find((x) => x.id === b.key)?.created_at || "";
        return br.localeCompare(ar);
      }
      if (sortBy === "date_in")
        return String(b.dateIn || "").localeCompare(String(a.dateIn || ""));
      return String(a.displayName).localeCompare(String(b.displayName));
    });

    const totalClients = clients.length;
    const activeCount = clients.filter((c) => c.status === "active").length;
    const inactiveCount = totalClients - activeCount;

    const goodStandingCount = clients.filter((c) => c.goodStanding).length;
    const goodStandingPct = totalClients > 0 ? (goodStandingCount / totalClients) * 100 : 0;

    const archivedCount = clients.filter((c) => c.archived).length;

    const statusRows = [
      { label: "Active", count: activeCount, pct: totalClients ? (activeCount / totalClients) * 100 : 0 },
      { label: "Inactive", count: inactiveCount, pct: totalClients ? (inactiveCount / totalClients) * 100 : 0 },
      { label: "Good standing (Yes)", count: goodStandingCount, pct: totalClients ? (goodStandingCount / totalClients) * 100 : 0 },
      { label: "Good standing (No)", count: totalClients - goodStandingCount, pct: totalClients ? ((totalClients - goodStandingCount) / totalClients) * 100 : 0 },
      { label: "Archived", count: archivedCount, pct: totalClients ? (archivedCount / totalClients) * 100 : 0 },
    ];

    return {
      clients,
      totalClients,
      activeCount,
      inactiveCount,
      goodStandingCount,
      goodStandingPct,
      archivedCount,
      statusRows,
    };
  }, [rows, search, sortBy, includeArchived]);

  // “Really good” CSV: consistent headers, no blank metadata lines, includes report context columns,
  // adds helpful columns (created_at + contact + notes) while staying spreadsheet-friendly.
  function downloadCSV(kind: "clients" | "status") {
    const f = fromDate || "";
    const t = toDate || "";
    const generatedAt = new Date().toISOString();

    const lines: string[] = [];

    if (kind === "clients") {
      lines.push(
        [
          "report_from",
          "report_to",
          "generated_at",
          "client_id",
          "client_name",
          "status",
          "good_standing",
          "date_in",
          "date_out",
          "archived",
          "created_at",
          "contact",
          "notes",
        ].join(",")
      );

      for (const c of computed.clients) {
        const r = rows.find((x) => x.id === c.key);
        lines.push(
          [
            csvEscape(f),
            csvEscape(t),
            csvEscape(generatedAt),
            csvEscape(c.key),
            csvEscape(c.displayName),
            csvEscape(c.status),
            csvEscape(c.goodStanding ? "yes" : "no"),
            csvEscape(c.dateIn),
            csvEscape(c.dateOut),
            csvEscape(c.archived ? "yes" : "no"),
            csvEscape(r?.created_at || ""),
            csvEscape(r?.contact || ""),
            csvEscape((r?.notes || "").trim()),
          ].join(",")
        );
      }
    } else {
      lines.push(
        ["report_from", "report_to", "generated_at", "metric", "count", "percent"].join(",")
      );
      for (const r of computed.statusRows) {
        lines.push(
          [
            csvEscape(f),
            csvEscape(t),
            csvEscape(generatedAt),
            csvEscape(r.label),
            csvEscape(r.count),
            csvEscape(r.pct.toFixed(1)),
          ].join(",")
        );
      }
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `client-report-${kind}-${f || "from"}-${t || "to"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function applyPreset(days: number) {
    setFromDate(daysAgoPlusOneISO(days));
    setToDate(todayPlusOneISO());
  }

  const tabCount = activeTab === "clients" ? computed.clients.length : computed.statusRows.length;

  return (
    <AuthGuard>
      <AdminGuard>
        <main
          className="min-h-screen"
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
          <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
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
                  Client Dashboard
                </span>

                <button
                  onClick={() => router.push("/admin/client/dashboard")}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                >
                  Back
                </button>

                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-60"
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          </header>

          {/* Content */}
          <section
            id="main-content"
            className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white"
          >
            <div className="absolute inset-0">
              <div className="absolute -top-24 right-[-6rem] h-72 w-72 rounded-full bg-[color:var(--brandSoft)] blur-2xl opacity-70" />
              <div className="absolute -bottom-24 left-[-6rem] h-72 w-72 rounded-full bg-slate-100 blur-2xl opacity-70" />
            </div>

            <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
              <div className="mx-auto max-w-3xl">
                {/* Title */}
                <div className="flex flex-col gap-2">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-semibold text-slate-900">
                    <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
                    Reports
                  </div>

                  <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                    Client reports
                  </h1>
                  <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
                    Pick a range, search, then export.
                  </p>

                  {/* (Removed the date range line here) */}
                </div>

                {/* Summary */}
                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Clients
                    </div>
                    <div className="mt-1 text-3xl font-bold text-slate-900">
                      {String(computed.totalClients)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Active
                    </div>
                    <div className="mt-1 text-3xl font-bold text-slate-900">
                      {String(computed.activeCount)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Good standing
                    </div>
                    <div className="mt-1 text-3xl font-bold text-slate-900">
                      {computed.goodStandingPct.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4">
                    {/* Top actions row */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">Quick range</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => applyPreset(7)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                          >
                            7d
                          </button>
                          <button
                            onClick={() => applyPreset(30)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                          >
                            30d
                          </button>
                          <button
                            onClick={() => applyPreset(90)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                          >
                            90d
                          </button>
                        </div>
                      </div>

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

                        <details className="relative">
                          <summary className="list-none cursor-pointer inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
                            Export
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
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </summary>

                          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 z-20">
                            <button
                              onClick={() => downloadCSV("clients")}
                              className="w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                            >
                              Clients CSV
                            </button>
                            <button
                              onClick={() => downloadCSV("status")}
                              className="w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                            >
                              Metrics CSV
                            </button>
                          </div>
                        </details>

                        <button
                          onClick={() => {
                            setFromDate(daysAgoPlusOneISO(30));
                            setToDate(todayPlusOneISO());
                            setSearch("");
                            setSortBy("name");
                            setActiveTab("clients");
                            setIncludeArchived(false);
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid gap-3 sm:grid-cols-2">
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
                          placeholder="Name, contact, notes…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">Sort</label>
                        <select
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                        >
                          <option value="name">Name</option>
                          <option value="date_in">Date in</option>
                          <option value="recent">Created</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                          <span>Include archived</span>
                          <input
                            type="checkbox"
                            checked={includeArchived}
                            onChange={(e) => setIncludeArchived(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-[color:var(--brand)] focus:ring-[color:var(--brandRing)]"
                          />
                        </label>
                      </div>
                    </div>

                    {error ? (
                      <div className="rounded-xl border border-red-600/20 bg-red-500/10 p-4 text-sm text-red-800">
                        {error}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Tabs */}
                <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                    <button
                      onClick={() => setActiveTab("clients")}
                      className={clsx(
                        "rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2",
                        activeTab === "clients"
                          ? "bg-[color:var(--brand)] text-white"
                          : "text-slate-800 hover:bg-slate-50"
                      )}
                    >
                      Clients
                      <span
                        className={clsx(
                          "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold",
                          activeTab === "clients"
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {computed.clients.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab("status")}
                      className={clsx(
                        "rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2",
                        activeTab === "status"
                          ? "bg-[color:var(--brand)] text-white"
                          : "text-slate-800 hover:bg-slate-50"
                      )}
                    >
                      Breakdown
                      <span
                        className={clsx(
                          "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold",
                          activeTab === "status"
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {computed.statusRows.length}
                      </span>
                    </button>
                  </div>

                  <div className="text-sm text-slate-600">
                    Showing{" "}
                    <span className="font-semibold text-slate-900">{tabCount}</span>{" "}
                    {activeTab === "clients" ? "client" : "metric"}
                    {tabCount === 1 ? "" : "s"}
                  </div>
                </div>

                {/* Results */}
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  {loading ? (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                      Loading…
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">No results</div>
                      <div className="mt-1 text-slate-600">
                        Try widening the date range or clearing the search.
                      </div>
                    </div>
                  ) : activeTab === "clients" ? (
                    <div className="space-y-4">
                      {computed.clients.map((c) => {
                        const r = rows.find((x) => x.id === c.key);
                        const note = (r?.notes || "").trim();

                        return (
                          <div
                            key={c.key}
                            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[color:var(--brandBorder)]"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <h2 className="text-lg font-bold text-slate-900 truncate">
                                  {c.displayName}
                                </h2>

                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                                  <Badge tone={c.status === "active" ? "ok" : "neutral"}>
                                    {c.status === "active" ? "Active" : "Inactive"}
                                  </Badge>

                                  <Badge tone={c.goodStanding ? "ok" : "neutral"}>
                                    Good standing: {c.goodStanding ? "Yes" : "No"}
                                  </Badge>

                                  {c.archived ? <Badge tone="warn">Archived</Badge> : null}

                                  {c.dateIn ? <Badge>Date in: {c.dateIn}</Badge> : null}
                                  {c.dateOut ? <Badge>Date out: {c.dateOut}</Badge> : null}
                                </div>
                              </div>

                              <div className="shrink-0">
                                <details className="group">
                                  <summary className="list-none cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/25">
                                    Notes
                                    <svg
                                      className="h-4 w-4 transition group-open:rotate-180"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                      />
                                    </svg>
                                  </summary>
                                  <div className="mt-2 max-w-md rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                                    {note ? note : <span className="text-slate-400">—</span>}
                                  </div>
                                </details>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 font-bold text-slate-900">Metric</th>
                            <th className="px-4 py-3 font-bold text-slate-900">Count</th>
                            <th className="px-4 py-3 font-bold text-slate-900">Percent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {computed.statusRows.map((r) => (
                            <tr key={r.label} className="border-t border-slate-200">
                              <td className="px-4 py-3 text-slate-800">{r.label}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {String(r.count)}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className="h-full rounded-full bg-[color:var(--brand)]"
                                      style={{ width: `${Math.min(100, Math.max(0, r.pct))}%` }}
                                    />
                                  </div>
                                  <span className="tabular-nums">{r.pct.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* lastRunAt intentionally not shown (pill removed), but still tracked */}
                <span className="hidden">{String(lastRunAt || "")}</span>
              </div>
            </div>
          </section>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}
