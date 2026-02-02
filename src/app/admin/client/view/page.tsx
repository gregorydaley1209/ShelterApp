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
  organization_id: string;
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
  additional_details: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type PossessionRow = {
  id: string;
  client_id: string;
  name: string;
  category: string | null;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return d;
}

function safeText(v?: string | null) {
  const t = (v ?? "").trim();
  return t ? t : "—";
}

function boolLabel(v: boolean) {
  return v ? "Yes" : "No";
}

function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(s: string) {
  const needs = /[",\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needs ? `"${escaped}"` : escaped;
}

export default function ViewClientsPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [error, setError] = useState<string>("");

  // UI controls
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [goodStandingFilter, setGoodStandingFilter] = useState<"all" | "yes" | "no">("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [sortBy, setSortBy] = useState<"name" | "recent" | "date_in">("name");

  // Detail drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedClient = useMemo(
    () => (selectedId ? rows.find((r) => r.id === selectedId) ?? null : null),
    [rows, selectedId]
  );

  const [possLoading, setPossLoading] = useState(false);
  const [possError, setPossError] = useState<string>("");
  const [possessions, setPossessions] = useState<PossessionRow[]>([]);

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

  async function loadClients() {
    setLoading(true);
    setError("");

    const p = await getMyProfile();
    if (!p) {
      window.location.href = "/login";
      return;
    }

    // RLS already enforces admin + org, but we also filter by org for clarity.
    // If you ever make super-admin multi-org, remove this .eq.
    const q = supabase
      .from("clients")
      .select(
        "id,organization_id,full_name,preferred_name,dob,age,contact,notes,status,good_standing,date_in,date_out,additional_details,archived_at,created_at,updated_at"
      )
      .eq("organization_id", p.organization_id)
      .order("full_name", { ascending: true });

    const { data, error: qErr } = await q;

    if (qErr) {
      setError(qErr.message || "Failed to load clients.");
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(((data as any) ?? []) as ClientRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a client is selected, load possessions (read-only here)
  useEffect(() => {
    if (!selectedId) {
      setPossessions([]);
      setPossError("");
      setPossLoading(false);
      return;
    }

    (async () => {
      setPossLoading(true);
      setPossError("");

      const { data, error: qErr } = await supabase
        .from("client_possessions")
        .select("id,client_id,name,category,quantity,notes,created_at,updated_at")
        .eq("client_id", selectedId)
        .order("created_at", { ascending: false });

      if (qErr) {
        setPossError(qErr.message || "Failed to load possessions.");
        setPossessions([]);
        setPossLoading(false);
        return;
      }

      setPossessions(((data as any) ?? []) as PossessionRow[]);
      setPossLoading(false);
    })();
  }, [selectedId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    let arr = rows.slice();

    if (!includeArchived) {
      arr = arr.filter((r) => !r.archived_at);
    }

    if (statusFilter !== "all") {
      arr = arr.filter((r) => (r.status || "").toLowerCase() === statusFilter);
    }

    if (goodStandingFilter !== "all") {
      const want = goodStandingFilter === "yes";
      arr = arr.filter((r) => r.good_standing === want);
    }

    if (s) {
      arr = arr.filter((r) => {
        const a = (r.full_name || "").toLowerCase();
        const b = (r.preferred_name || "").toLowerCase();
        const c = (r.contact || "").toLowerCase();
        const d = (r.notes || "").toLowerCase();
        const e = (r.additional_details || "").toLowerCase();
        return (
          a.includes(s) ||
          b.includes(s) ||
          c.includes(s) ||
          d.includes(s) ||
          e.includes(s) ||
          (r.dob || "").includes(s) ||
          (r.date_in || "").includes(s) ||
          (r.date_out || "").includes(s)
        );
      });
    }

    arr.sort((x, y) => {
      if (sortBy === "recent") return (y.created_at || "").localeCompare(x.created_at || "");
      if (sortBy === "date_in") return (y.date_in || "").localeCompare(x.date_in || "");
      return (x.full_name || "").localeCompare(y.full_name || "");
    });

    return arr;
  }, [rows, includeArchived, statusFilter, goodStandingFilter, search, sortBy]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((r) => (r.status || "").toLowerCase() === "active").length;
    const inactive = filtered.filter((r) => (r.status || "").toLowerCase() === "inactive").length;
    const good = filtered.filter((r) => r.good_standing).length;
    return { total, active, inactive, good };
  }, [filtered]);

  function exportCsv() {
    const cols = [
      "full_name",
      "preferred_name",
      "dob",
      "age",
      "contact",
      "status",
      "good_standing",
      "date_in",
      "date_out",
      "archived",
      "notes",
      "additional_details",
      "created_at",
      "updated_at",
    ];

    const lines: string[] = [];
    lines.push(cols.join(","));

    for (const r of filtered) {
      const row = [
        r.full_name ?? "",
        r.preferred_name ?? "",
        r.dob ?? "",
        r.age?.toString() ?? "",
        r.contact ?? "",
        r.status ?? "",
        r.good_standing ? "true" : "false",
        r.date_in ?? "",
        r.date_out ?? "",
        r.archived_at ? "true" : "false",
        r.notes ?? "",
        r.additional_details ?? "",
        r.created_at ?? "",
        r.updated_at ?? "",
      ].map((v) => csvEscape(v));

      lines.push(row.join(","));
    }

    const filename = `clients_export_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadTextFile(filename, lines.join("\n"));
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
                  Client Dashboard
                </span>

                <button
                  onClick={() => router.push("/admin/client/dashboard")}
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
              <div className="mx-auto max-w-6xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
                  <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
                  Clients • View
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
                      Clients
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                      Search, filter, and click a client to view details and possessions.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                      <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
                        Total (filtered)
                      </div>
                      <div className="mt-1 text-3xl font-bold text-[color:var(--brand)]">
                        {stats.total}
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        Active {stats.active} • Inactive {stats.inactive} • Good standing {stats.good}
                      </div>
                    </div>

                    <button
                      onClick={exportCsv}
                      className="inline-flex items-center justify-center rounded-xl border-2 border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/30"
                      title="Export filtered clients as CSV"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-12">
                    <div className="md:col-span-5 space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Search</label>
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                        placeholder="Name, contact, dates, notes…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Status</label>
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                      >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Good standing</label>
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                        value={goodStandingFilter}
                        onChange={(e) => setGoodStandingFilter(e.target.value as any)}
                      >
                        <option value="all">All</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    <div className="md:col-span-3 space-y-2">
                      <label className="text-sm font-semibold text-slate-900">View</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewMode("table")}
                          className={clsx(
                            "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/25",
                            viewMode === "table"
                              ? "border-[color:var(--brand)] bg-[color:var(--brandSoft)] text-slate-900"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          Table
                        </button>
                        <button
                          onClick={() => setViewMode("cards")}
                          className={clsx(
                            "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/25",
                            viewMode === "cards"
                              ? "border-[color:var(--brand)] bg-[color:var(--brandSoft)] text-slate-900"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          Cards
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-4 space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Sort by</label>
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                      >
                        <option value="name">Name</option>
                        <option value="date_in">Date in (newest)</option>
                        <option value="recent">Created (newest)</option>
                      </select>
                    </div>

                    <div className="md:col-span-4 flex items-end">
                      <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={includeArchived}
                          onChange={(e) => setIncludeArchived(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-[color:var(--brand)] focus:ring-[color:var(--brandRing)]"
                        />
                        Include archived
                      </label>
                    </div>

                    <div className="md:col-span-4 flex items-end justify-end gap-2">
                      <button
                        onClick={() => {
                          setSearch("");
                          setStatusFilter("all");
                          setGoodStandingFilter("all");
                          setIncludeArchived(false);
                          setSortBy("name");
                        }}
                        className="inline-flex items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
                      >
                        Reset
                      </button>

                      <button
                        onClick={loadClients}
                        className="inline-flex items-center justify-center rounded-xl border-2 border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main list + drawer wrapper */}
                <div className="mt-8 grid gap-6 lg:grid-cols-12">
                  {/* List */}
                  <div className="lg:col-span-8">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                      {loading ? (
                        <div className="text-sm text-slate-600">Loading…</div>
                      ) : error ? (
                        <div className="rounded-xl border border-red-600/20 bg-red-500/10 p-4 text-sm text-red-800">
                          {error}
                        </div>
                      ) : filtered.length === 0 ? (
                        <div className="text-sm text-slate-600">No clients found.</div>
                      ) : viewMode === "table" ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-left">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Name
                                </th>
                                <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Status
                                </th>
                                <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Good standing
                                </th>
                                <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Contact
                                </th>
                                <th className="py-3 pr-0 text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Date in
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.map((r) => {
                                const isSelected = r.id === selectedId;
                                return (
                                  <tr
                                    key={r.id}
                                    className={clsx(
                                      "border-b border-slate-100 cursor-pointer transition",
                                      isSelected ? "bg-[color:var(--brandSoft)]/60" : "hover:bg-slate-50"
                                    )}
                                    onClick={() => setSelectedId(r.id)}
                                    title="Click to view details"
                                  >
                                    <td className="py-4 pr-4">
                                      <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-900 truncate">
                                          {r.full_name}
                                        </div>
                                        <div className="mt-0.5 text-xs text-slate-600 truncate">
                                          Preferred: {safeText(r.preferred_name)}
                                          {r.archived_at ? " • Archived" : ""}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-4 pr-4">
                                      <span
                                        className={clsx(
                                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                                          (r.status || "").toLowerCase() === "active"
                                            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                            : "bg-slate-50 text-slate-700 ring-slate-200"
                                        )}
                                      >
                                        {(r.status || "—").toString()}
                                      </span>
                                    </td>
                                    <td className="py-4 pr-4">
                                      <span
                                        className={clsx(
                                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                                          r.good_standing
                                            ? "bg-[color:var(--brandSoft)] text-slate-900 ring-[color:var(--brandBorder)]"
                                            : "bg-amber-50 text-amber-800 ring-amber-200"
                                        )}
                                      >
                                        {boolLabel(r.good_standing)}
                                      </span>
                                    </td>
                                    <td className="py-4 pr-4 text-sm text-slate-700">
                                      {safeText(r.contact)}
                                    </td>
                                    <td className="py-4 pr-0 text-sm text-slate-700">
                                      {fmtDate(r.date_in)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filtered.map((r) => {
                            const isSelected = r.id === selectedId;
                            return (
                              <button
                                key={r.id}
                                onClick={() => setSelectedId(r.id)}
                                className={clsx(
                                  "w-full text-left rounded-xl border p-5 transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/25",
                                  isSelected
                                    ? "border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)]/60"
                                    : "border-slate-200 bg-white hover:border-[color:var(--brandBorder)]"
                                )}
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <div className="text-lg font-bold text-slate-900 truncate">
                                      {r.full_name}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-600">
                                      Preferred: {safeText(r.preferred_name)}
                                      {r.archived_at ? " • Archived" : ""}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <span
                                      className={clsx(
                                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                                        (r.status || "").toLowerCase() === "active"
                                          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                          : "bg-slate-50 text-slate-700 ring-slate-200"
                                      )}
                                    >
                                      {(r.status || "—").toString()}
                                    </span>
                                    <span
                                      className={clsx(
                                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                                        r.good_standing
                                          ? "bg-[color:var(--brandSoft)] text-slate-900 ring-[color:var(--brandBorder)]"
                                          : "bg-amber-50 text-amber-800 ring-amber-200"
                                      )}
                                    >
                                      Good standing: {boolLabel(r.good_standing)}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                      Contact
                                    </span>
                                    <div className="mt-1 font-semibold text-slate-800">
                                      {safeText(r.contact)}
                                    </div>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                      Date in
                                    </span>
                                    <div className="mt-1 font-semibold text-slate-800">
                                      {fmtDate(r.date_in)}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details drawer */}
                  <div className="lg:col-span-4">
                    <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
                            Client details
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            {selectedClient ? "Read-only view" : "Select a client"}
                          </div>
                        </div>

                        {selectedClient ? (
                          <button
                            onClick={() => setSelectedId(null)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>

                      {!selectedClient ? (
                        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                          Click a client from the list to see details and possessions here.
                        </div>
                      ) : (
                        <div className="mt-6 space-y-5">
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="text-lg font-bold text-slate-900">
                              {selectedClient.full_name}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                              Preferred: {safeText(selectedClient.preferred_name)}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <span
                                className={clsx(
                                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                                  (selectedClient.status || "").toLowerCase() === "active"
                                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                    : "bg-slate-50 text-slate-700 ring-slate-200"
                                )}
                              >
                                {(selectedClient.status || "—").toString()}
                              </span>
                              <span
                                className={clsx(
                                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                                  selectedClient.good_standing
                                    ? "bg-[color:var(--brandSoft)] text-slate-900 ring-[color:var(--brandBorder)]"
                                    : "bg-amber-50 text-amber-800 ring-amber-200"
                                )}
                              >
                                Good standing: {boolLabel(selectedClient.good_standing)}
                              </span>
                              {selectedClient.archived_at ? (
                                <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                                  Archived
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="grid gap-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                DOB / Age
                              </div>
                              <div className="mt-1 text-sm font-semibold text-slate-900">
                                {fmtDate(selectedClient.dob)}{" "}
                                <span className="text-slate-600 font-medium">
                                  • {selectedClient.age ?? "—"}
                                </span>
                              </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Contact
                              </div>
                              <div className="mt-1 text-sm font-semibold text-slate-900">
                                {safeText(selectedClient.contact)}
                              </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Date in / Date out
                              </div>
                              <div className="mt-1 text-sm font-semibold text-slate-900">
                                {fmtDate(selectedClient.date_in)}{" "}
                                <span className="text-slate-600 font-medium">→</span>{" "}
                                {fmtDate(selectedClient.date_out)}
                              </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Notes
                              </div>
                              <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                                {safeText(selectedClient.notes)}
                              </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Additional details
                              </div>
                              <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                                {safeText(selectedClient.additional_details)}
                              </div>
                            </div>
                          </div>

                          {/* Possessions */}
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
                                  Possessions
                                </div>
                                <div className="mt-1 text-sm text-slate-600">
                                  Items associated with this client.
                                </div>
                              </div>
                            </div>

                            <div className="mt-4">
                              {possLoading ? (
                                <div className="text-sm text-slate-600">Loading possessions…</div>
                              ) : possError ? (
                                <div className="rounded-xl border border-red-600/20 bg-red-500/10 p-3 text-sm text-red-800">
                                  {possError}
                                </div>
                              ) : possessions.length === 0 ? (
                                <div className="text-sm text-slate-600">No possessions found.</div>
                              ) : (
                                <div className="space-y-2">
                                  {possessions.map((p) => (
                                    <div
                                      key={p.id}
                                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="text-sm font-bold text-slate-900 truncate">
                                            {p.name}
                                          </div>
                                          <div className="mt-0.5 text-xs text-slate-600 truncate">
                                            Category: {safeText(p.category)}
                                          </div>
                                        </div>
                                        <div className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-500">
                                          Qty{" "}
                                          <span className="ml-1 text-sm font-extrabold text-[color:var(--brand)]">
                                            {p.quantity ?? 0}
                                          </span>
                                        </div>
                                      </div>

                                      {p.notes?.trim() ? (
                                        <div className="mt-2 text-xs text-slate-700 whitespace-pre-wrap">
                                          {p.notes}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 text-xs text-slate-500">
                            Created {fmtDate(selectedClient.created_at?.slice(0, 10))} • Updated{" "}
                            {fmtDate(selectedClient.updated_at?.slice(0, 10))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer note */}
                <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-700">
                    Tip: This page is read-only. Use <span className="font-semibold">Edit Clients</span> to
                    update details, archive clients, and manage possessions.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}