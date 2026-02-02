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
  id: string;
  volunteer_name: string;
  hours_worked: number;
  group_name: string | null;
  checkin_date: string; // YYYY-MM-DD
  created_at?: string;
};

type Draft = {
  volunteer_name: string;
  hours_worked: number | "";
  group_name: string;
  checkin_date: string;
};

export default function EditVolunteersPage() {
  const router = useRouter();

  const [signingOut, setSigningOut] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [rows, setRows] = useState<CheckinRow[]>([]);

  // controls
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "hours">("date");

  // editing state
  const [editingId, setEditingId] = useState<string>("");
  const [draft, setDraft] = useState<Draft | null>(null);

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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setError("");

    const p = await getMyProfile();
    if (!p) {
      window.location.href = "/login";
      return;
    }

    const { data, error: qErr } = await supabase
      .from("volunteer_checkins")
      .select("id,volunteer_name,hours_worked,group_name,checkin_date,created_at")
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
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    let list = rows.slice();

    if (s) {
      list = list.filter((r) => {
        return (
          (r.volunteer_name || "").toLowerCase().includes(s) ||
          (r.group_name || "").toLowerCase().includes(s) ||
          (r.checkin_date || "").includes(s)
        );
      });
    }

    list.sort((a, b) => {
      if (sortBy === "name") return (a.volunteer_name || "").localeCompare(b.volunteer_name || "");
      if (sortBy === "hours") return Number(b.hours_worked || 0) - Number(a.hours_worked || 0);
      // date (default)
      return (b.checkin_date || "").localeCompare(a.checkin_date || "");
    });

    return list;
  }, [rows, search, sortBy]);

  function startEdit(r: CheckinRow) {
    setEditingId(r.id);
    setDraft({
      volunteer_name: (r.volunteer_name || "").trim(),
      hours_worked: Number(r.hours_worked ?? 0),
      group_name: (r.group_name || "").trim(),
      checkin_date: r.checkin_date || "",
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId("");
    setDraft(null);
    setError("");
  }

  function canSave() {
    if (!draft) return false;
    if (draft.volunteer_name.trim().length < 2) return false;
    if (draft.hours_worked === "" || Number(draft.hours_worked) <= 0) return false;
    if (!draft.checkin_date) return false;
    return true;
  }

  async function saveEdit() {
    if (!draft || !editingId) return;
    if (!canSave()) {
      setError("Please fill all required fields (name, hours, date).");
      return;
    }

    setSavingId(editingId);
    setError("");

    const payload = {
      volunteer_name: draft.volunteer_name.trim(),
      hours_worked: Number(draft.hours_worked),
      group_name: draft.group_name.trim() ? draft.group_name.trim() : null,
      checkin_date: draft.checkin_date,
    };

    const { error: upErr } = await supabase
      .from("volunteer_checkins")
      .update(payload)
      .eq("id", editingId);

    if (upErr) {
      setError(upErr.message || "Failed to save changes.");
      setSavingId("");
      return;
    }

    setRows((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...payload } : r)));

    setSavingId("");
    cancelEdit();
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
                  Volunteers • Edit
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
                      Edit check-ins
                    </h1>
                    <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-600">
                      Update volunteer names, hours, dates, and groups.
                    </p>
                  </div>

                  <button
                    onClick={load}
                    className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                  >
                    Refresh
                  </button>
                </div>

                {/* Controls */}
                <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
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
                        <option value="date">Date</option>
                        <option value="name">Name</option>
                        <option value="hours">Hours</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* List */}
                <div className="mt-8">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    {loading ? (
                      <div className="text-sm text-slate-600">Loading…</div>
                    ) : error ? (
                      <div className="rounded-xl border border-red-600/20 bg-red-500/10 p-4 text-sm text-red-800">
                        {error}
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="text-sm text-slate-600">No check-ins found.</div>
                    ) : (
                      <div className="space-y-5">
                        {filtered.map((r) => {
                          const isEditing = editingId === r.id;

                          return (
                            <div
                              key={r.id}
                              className={clsx(
                                "rounded-xl border bg-white p-5 transition",
                                isEditing
                                  ? "border-[color:var(--brandBorder)] shadow-md"
                                  : "border-slate-200 hover:border-[color:var(--brandBorder)]"
                              )}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Volunteer
                                  </div>

                                  {!isEditing ? (
                                    <h2 className="mt-1 text-lg font-bold text-slate-900 truncate">
                                      {r.volunteer_name}
                                    </h2>
                                  ) : (
                                    <input
                                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                      value={draft?.volunteer_name ?? ""}
                                      onChange={(e) =>
                                        setDraft((d) =>
                                          d ? { ...d, volunteer_name: e.target.value } : d
                                        )
                                      }
                                      placeholder="Volunteer name"
                                    />
                                  )}

                                  {!isEditing ? (
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                                      <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                                        {r.checkin_date}
                                      </span>

                                      {r.group_name ? (
                                        <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                                          Group: {r.group_name}
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <div className="grid w-full gap-3 sm:grid-cols-2 mt-4">
                                      <div className="space-y-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                          Check-in date
                                        </div>
                                        <input
                                          type="date"
                                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                          value={draft?.checkin_date ?? ""}
                                          onChange={(e) =>
                                            setDraft((d) =>
                                              d ? { ...d, checkin_date: e.target.value } : d
                                            )
                                          }
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                          Group (optional)
                                        </div>
                                        <input
                                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                          value={draft?.group_name ?? ""}
                                          onChange={(e) =>
                                            setDraft((d) =>
                                              d ? { ...d, group_name: e.target.value } : d
                                            )
                                          }
                                          placeholder="Group name"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="shrink-0 sm:text-right">
                                  <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
                                    Hours
                                  </div>

                                  {!isEditing ? (
                                    <div className="mt-1 text-2xl font-bold text-[color:var(--brand)]">
                                      {Number(r.hours_worked).toFixed(2)}
                                    </div>
                                  ) : (
                                    <input
                                      type="number"
                                      min={0.25}
                                      step={0.25}
                                      className="mt-2 w-full sm:w-40 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                      value={draft?.hours_worked ?? ""}
                                      onChange={(e) =>
                                        setDraft((d) =>
                                          d
                                            ? {
                                                ...d,
                                                hours_worked:
                                                  e.target.value === ""
                                                    ? ""
                                                    : Number(e.target.value),
                                              }
                                            : d
                                        )
                                      }
                                      placeholder="Hours"
                                    />
                                  )}

                                  <div className="mt-3 flex flex-col gap-2 sm:items-end">
                                    {!isEditing ? (
                                      <button
                                        onClick={() => startEdit(r)}
                                        className="inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                                      >
                                        Edit
                                      </button>
                                    ) : (
                                      <div className="flex w-full sm:w-auto gap-2">
                                        <button
                                          onClick={cancelEdit}
                                          className="inline-flex flex-1 items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                                        >
                                          Cancel
                                        </button>

                                        <button
                                          onClick={saveEdit}
                                          disabled={!canSave() || savingId === r.id}
                                          className={clsx(
                                            "inline-flex flex-1 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2",
                                            !canSave() || savingId === r.id
                                              ? "bg-slate-300 cursor-not-allowed"
                                              : "bg-[color:var(--brand)] hover:bg-[color:var(--brandDark)]"
                                          )}
                                        >
                                          {savingId === r.id ? "Saving…" : "Save"}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
