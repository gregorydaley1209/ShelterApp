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
  additional_details: string | null;
  archived_at: string | null;
  created_at?: string;
};

type Draft = {
  full_name: string;
  preferred_name: string;
  dob: string; // "" allowed
  age: number | "";
  contact: string;
  status: "active" | "inactive";
  good_standing: boolean;
  date_in: string; // "" allowed
  date_out: string; // "" allowed
  notes: string;
  additional_details: string;
  archived: boolean;
};

function safeTrim(v: string) {
  return (v ?? "").trim();
}

function isISODateOrEmpty(v: string) {
  if (!v) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function emptyDraft(): Draft {
  return {
    full_name: "",
    preferred_name: "",
    dob: "",
    age: "",
    contact: "",
    status: "active",
    good_standing: true,
    date_in: "",
    date_out: "",
    notes: "",
    additional_details: "",
    archived: false,
  };
}

export default function EditClientsPage() {
  const router = useRouter();

  const [signingOut, setSigningOut] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [orgId, setOrgId] = useState<string>("");

  // controls
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "recent" | "date_in">("name");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [includeArchived, setIncludeArchived] = useState(false);

  // editing state
  const [editingId, setEditingId] = useState<string>("");
  const [draft, setDraft] = useState<Draft | null>(null);

  // add client modal
  const [showAdd, setShowAdd] = useState(false);
  const [addDraft, setAddDraft] = useState<Draft>(emptyDraft());
  const [adding, setAdding] = useState(false);

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

    setOrgId(p.organization_id);

    const { data, error: qErr } = await supabase
      .from("clients")
      .select(
        "id,full_name,preferred_name,dob,age,contact,notes,status,good_standing,date_in,date_out,additional_details,archived_at,created_at"
      )
      .eq("organization_id", p.organization_id)
      .order("full_name", { ascending: true });

    if (qErr) {
      setError(qErr.message || "Failed to load clients.");
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(((data as any) ?? []) as ClientRow[]);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    let list = rows.slice();

    if (!includeArchived) {
      list = list.filter((r) => !r.archived_at);
    }

    if (statusFilter !== "all") {
      list = list.filter((r) => (r.status || "").toLowerCase() === statusFilter);
    }

    if (s) {
      list = list.filter((r) => {
        return (
          (r.full_name || "").toLowerCase().includes(s) ||
          (r.preferred_name || "").toLowerCase().includes(s) ||
          (r.contact || "").toLowerCase().includes(s) ||
          (r.notes || "").toLowerCase().includes(s) ||
          (r.additional_details || "").toLowerCase().includes(s) ||
          (r.dob || "").includes(s) ||
          (r.date_in || "").includes(s) ||
          (r.date_out || "").includes(s)
        );
      });
    }

    list.sort((a, b) => {
      if (sortBy === "recent") return (b.created_at || "").localeCompare(a.created_at || "");
      if (sortBy === "date_in") return (b.date_in || "").localeCompare(a.date_in || "");
      // name (default)
      return (a.full_name || "").localeCompare(b.full_name || "");
    });

    return list;
  }, [rows, search, sortBy, statusFilter, includeArchived]);

  function startEdit(r: ClientRow) {
    setEditingId(r.id);
    setDraft({
      full_name: safeTrim(r.full_name || ""),
      preferred_name: safeTrim(r.preferred_name || ""),
      dob: r.dob || "",
      age: typeof r.age === "number" ? r.age : "",
      contact: safeTrim(r.contact || ""),
      status: ((r.status || "active").toLowerCase() as any) === "inactive" ? "inactive" : "active",
      good_standing: Boolean(r.good_standing),
      date_in: r.date_in || "",
      date_out: r.date_out || "",
      notes: r.notes || "",
      additional_details: r.additional_details || "",
      archived: Boolean(r.archived_at),
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId("");
    setDraft(null);
    setError("");
  }

  function validateDraft(d: Draft) {
    if (safeTrim(d.full_name).length < 2) return "Full name is required (at least 2 characters).";
    if (!isISODateOrEmpty(d.dob)) return "DOB must be a valid date.";
    if (!isISODateOrEmpty(d.date_in)) return "Date in must be a valid date.";
    if (!isISODateOrEmpty(d.date_out)) return "Date out must be a valid date.";
    if (d.age !== "" && (Number(d.age) < 0 || Number(d.age) > 125)) return "Age must be 0–125.";
    if (d.date_in && d.date_out && d.date_out < d.date_in)
      return "Date out cannot be before date in.";
    return "";
  }

  function canSave() {
    if (!draft) return false;
    return !validateDraft(draft);
  }

  function canAdd() {
    return !validateDraft(addDraft);
  }

  function toPayload(d: Draft) {
    return {
      full_name: safeTrim(d.full_name),
      preferred_name: safeTrim(d.preferred_name) ? safeTrim(d.preferred_name) : null,
      dob: d.dob ? d.dob : null,
      age: d.age === "" ? null : Number(d.age),
      contact: safeTrim(d.contact) ? safeTrim(d.contact) : null,
      status: d.status,
      good_standing: Boolean(d.good_standing),
      date_in: d.date_in ? d.date_in : null,
      date_out: d.date_out ? d.date_out : null,
      notes: safeTrim(d.notes) ? d.notes : null,
      additional_details: safeTrim(d.additional_details) ? d.additional_details : null,
      archived_at: d.archived ? new Date().toISOString() : null,
    };
  }

  async function saveEdit() {
    if (!draft || !editingId) return;

    const msg = validateDraft(draft);
    if (msg) {
      setError(msg);
      return;
    }

    setSavingId(editingId);
    setError("");

    const payload: any = toPayload(draft);

    const { error: upErr } = await supabase.from("clients").update(payload).eq("id", editingId);

    if (upErr) {
      setError(upErr.message || "Failed to save changes.");
      setSavingId("");
      return;
    }

    setRows((prev) => prev.map((r) => (r.id === editingId ? ({ ...r, ...payload } as any) : r)));

    setSavingId("");
    cancelEdit();
  }

  async function addClient() {
    const msg = validateDraft(addDraft);
    if (msg) {
      setError(msg);
      return;
    }
    if (!orgId) {
      setError("Missing organization. Please refresh and try again.");
      return;
    }

    setAdding(true);
    setError("");

    const payload: any = {
      organization_id: orgId,
      ...toPayload(addDraft),
    };

    const { data, error: insErr } = await supabase
      .from("clients")
      .insert(payload)
      .select(
        "id,full_name,preferred_name,dob,age,contact,notes,status,good_standing,date_in,date_out,additional_details,archived_at,created_at"
      )
      .single();

    if (insErr) {
      setError(insErr.message || "Failed to add client.");
      setAdding(false);
      return;
    }

    const inserted = (data as any) as ClientRow;
    setRows((prev) => {
      const next = [inserted, ...prev];
      next.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
      return next;
    });

    setAdding(false);
    setShowAdd(false);
    setAddDraft(emptyDraft());
  }

  async function deleteClient(r: ClientRow) {
    const ok = window.confirm(
      `Delete client "${r.full_name}"?\n\nThis is permanent. If you only want to hide them, use Archive instead.`
    );
    if (!ok) return;

    setDeletingId(r.id);
    setError("");

    const { error: delErr } = await supabase.from("clients").delete().eq("id", r.id);

    if (delErr) {
      setError(delErr.message || "Failed to delete client.");
      setDeletingId("");
      return;
    }

    setRows((prev) => prev.filter((x) => x.id !== r.id));
    if (editingId === r.id) cancelEdit();
    setDeletingId("");
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
              <div className="mx-auto max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
                  <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
                  Clients • Edit
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
                      Edit clients
                    </h1>
                    <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-600">
                      Add new clients and update existing client details, status, and archive state.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setError("");
                        setAddDraft(emptyDraft());
                        setShowAdd(true);
                      }}
                      className="inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                    >
                      + Add client
                    </button>

                    <button
                      onClick={load}
                      className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Search</label>
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                        placeholder="Name, contact, notes, date…"
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
                        <option value="name">Name</option>
                        <option value="date_in">Date in</option>
                        <option value="recent">Created</option>
                      </select>
                    </div>

                    <div className="space-y-2">
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

                    <div className="flex items-end">
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
                      <div className="text-sm text-slate-600">No clients found.</div>
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
                                    Client
                                  </div>

                                  {!isEditing ? (
                                    <h2 className="mt-1 text-lg font-bold text-slate-900 truncate">
                                      {r.full_name}
                                    </h2>
                                  ) : (
                                    <input
                                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                      value={draft?.full_name ?? ""}
                                      onChange={(e) =>
                                        setDraft((d) => (d ? { ...d, full_name: e.target.value } : d))
                                      }
                                      placeholder="Full name"
                                    />
                                  )}

                                  {!isEditing ? (
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                                      {r.preferred_name ? (
                                        <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                                          Preferred: {r.preferred_name}
                                        </span>
                                      ) : null}

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
                                        Good standing: {r.good_standing ? "Yes" : "No"}
                                      </span>

                                      {r.archived_at ? (
                                        <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                                          Archived
                                        </span>
                                      ) : null}

                                      {r.date_in ? (
                                        <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                                          Date in: {r.date_in}
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <div className="grid w-full gap-3 sm:grid-cols-2 mt-4">
                                      <div className="space-y-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                          Preferred name (optional)
                                        </div>
                                        <input
                                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                          value={draft?.preferred_name ?? ""}
                                          onChange={(e) =>
                                            setDraft((d) =>
                                              d ? { ...d, preferred_name: e.target.value } : d
                                            )
                                          }
                                          placeholder="Preferred name"
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                          Contact (optional)
                                        </div>
                                        <input
                                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                          value={draft?.contact ?? ""}
                                          onChange={(e) =>
                                            setDraft((d) => (d ? { ...d, contact: e.target.value } : d))
                                          }
                                          placeholder="Phone, email, etc."
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                          DOB (optional)
                                        </div>
                                        <input
                                          type="date"
                                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                          value={draft?.dob ?? ""}
                                          onChange={(e) =>
                                            setDraft((d) => (d ? { ...d, dob: e.target.value } : d))
                                          }
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                          Age (optional)
                                        </div>
                                        <input
                                          type="number"
                                          min={0}
                                          max={125}
                                          step={1}
                                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                          value={draft?.age ?? ""}
                                          onChange={(e) =>
                                            setDraft((d) =>
                                              d
                                                ? {
                                                    ...d,
                                                    age:
                                                      e.target.value === ""
                                                        ? ""
                                                        : Number(e.target.value),
                                                  }
                                                : d
                                            )
                                          }
                                          placeholder="Age"
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                          Status
                                        </div>
                                        <select
                                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                          value={draft?.status ?? "active"}
                                          onChange={(e) =>
                                            setDraft((d) =>
                                              d ? { ...d, status: e.target.value as any } : d
                                            )
                                          }
                                        >
                                          <option value="active">Active</option>
                                          <option value="inactive">Inactive</option>
                                        </select>
                                      </div>

                                      <div className="space-y-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                          Good standing
                                        </div>
                                        <label className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
                                          <span>{draft?.good_standing ? "Yes" : "No"}</span>
                                          <input
                                            type="checkbox"
                                            checked={Boolean(draft?.good_standing)}
                                            onChange={(e) =>
                                              setDraft((d) =>
                                                d ? { ...d, good_standing: e.target.checked } : d
                                              )
                                            }
                                            className="h-4 w-4 rounded border-slate-300 text-[color:var(--brand)] focus:ring-[color:var(--brandRing)]"
                                          />
                                        </label>
                                      </div>

                                      <div className="space-y-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                          Date in (optional)
                                        </div>
                                        <input
                                          type="date"
                                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                          value={draft?.date_in ?? ""}
                                          onChange={(e) =>
                                            setDraft((d) =>
                                              d ? { ...d, date_in: e.target.value } : d
                                            )
                                          }
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                          Date out (optional)
                                        </div>
                                        <input
                                          type="date"
                                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                          value={draft?.date_out ?? ""}
                                          onChange={(e) =>
                                            setDraft((d) =>
                                              d ? { ...d, date_out: e.target.value } : d
                                            )
                                          }
                                        />
                                      </div>

                                      <div className="space-y-2 sm:col-span-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                          Notes (optional)
                                        </div>
                                        <textarea
                                          rows={3}
                                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                          value={draft?.notes ?? ""}
                                          onChange={(e) =>
                                            setDraft((d) => (d ? { ...d, notes: e.target.value } : d))
                                          }
                                          placeholder="Short notes…"
                                        />
                                      </div>

                                      <div className="space-y-2 sm:col-span-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                          Additional details (optional)
                                        </div>
                                        <textarea
                                          rows={4}
                                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                                          value={draft?.additional_details ?? ""}
                                          onChange={(e) =>
                                            setDraft((d) =>
                                              d ? { ...d, additional_details: e.target.value } : d
                                            )
                                          }
                                          placeholder="More details…"
                                        />
                                      </div>

                                      <div className="space-y-2 sm:col-span-2">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                          Archive
                                        </div>
                                        <label className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
                                          <span>{draft?.archived ? "Archived" : "Not archived"}</span>
                                          <input
                                            type="checkbox"
                                            checked={Boolean(draft?.archived)}
                                            onChange={(e) =>
                                              setDraft((d) =>
                                                d ? { ...d, archived: e.target.checked } : d
                                              )
                                            }
                                            className="h-4 w-4 rounded border-slate-300 text-[color:var(--brand)] focus:ring-[color:var(--brandRing)]"
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="shrink-0 sm:text-right">
                                  <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
                                    Actions
                                  </div>

                                  <div className="mt-3 flex flex-col gap-2 sm:items-end">
                                    {!isEditing ? (
                                      <>
                                        <button
                                          onClick={() => startEdit(r)}
                                          className="inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                                        >
                                          Edit
                                        </button>

                                        <button
                                          onClick={() => deleteClient(r)}
                                          disabled={deletingId === r.id}
                                          className={clsx(
                                            "inline-flex items-center justify-center rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2",
                                            deletingId === r.id
                                              ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                              : "border-red-200 bg-white text-red-700 hover:bg-red-50 focus:ring-red-500"
                                          )}
                                        >
                                          {deletingId === r.id ? "Deleting…" : "Delete"}
                                        </button>
                                      </>
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

                                  {isEditing && draft ? (
                                    <div className="mt-3 text-xs text-slate-500 sm:max-w-xs">
                                      {validateDraft(draft) ? validateDraft(draft) : "Looks good."}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Client Modal (scrollable) */}
                {showAdd ? (
                  <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                  >
                    <div
                      className="absolute inset-0 bg-black/30"
                      onClick={() => (!adding ? setShowAdd(false) : null)}
                    />

                    <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {/* Header (sticky) */}
                      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
                            Add client
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            Enter the new client’s details. You can edit more later.
                          </div>
                        </div>

                        <button
                          onClick={() => setShowAdd(false)}
                          disabled={adding}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:opacity-60"
                        >
                          Close
                        </button>
                      </div>

                      {/* Body (scrolls) */}
                      <div className="max-h-[calc(85vh-140px)] overflow-y-auto p-5">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <label className="text-sm font-semibold text-slate-900">
                              Full name *
                            </label>
                            <input
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                              value={addDraft.full_name}
                              onChange={(e) =>
                                setAddDraft((d) => ({ ...d, full_name: e.target.value }))
                              }
                              placeholder="Full legal name"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">
                              Preferred name
                            </label>
                            <input
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                              value={addDraft.preferred_name}
                              onChange={(e) =>
                                setAddDraft((d) => ({ ...d, preferred_name: e.target.value }))
                              }
                              placeholder="Optional"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">Contact</label>
                            <input
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                              value={addDraft.contact}
                              onChange={(e) =>
                                setAddDraft((d) => ({ ...d, contact: e.target.value }))
                              }
                              placeholder="Phone or email"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">DOB</label>
                            <input
                              type="date"
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                              value={addDraft.dob}
                              onChange={(e) =>
                                setAddDraft((d) => ({ ...d, dob: e.target.value }))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">Age</label>
                            <input
                              type="number"
                              min={0}
                              max={125}
                              step={1}
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                              value={addDraft.age}
                              onChange={(e) =>
                                setAddDraft((d) => ({
                                  ...d,
                                  age: e.target.value === "" ? "" : Number(e.target.value),
                                }))
                              }
                              placeholder="Optional"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">Status</label>
                            <select
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                              value={addDraft.status}
                              onChange={(e) =>
                                setAddDraft((d) => ({ ...d, status: e.target.value as any }))
                              }
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">
                              Good standing
                            </label>
                            <label className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
                              <span>{addDraft.good_standing ? "Yes" : "No"}</span>
                              <input
                                type="checkbox"
                                checked={addDraft.good_standing}
                                onChange={(e) =>
                                  setAddDraft((d) => ({
                                    ...d,
                                    good_standing: e.target.checked,
                                  }))
                                }
                                className="h-4 w-4 rounded border-slate-300 text-[color:var(--brand)] focus:ring-[color:var(--brandRing)]"
                              />
                            </label>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">Date in</label>
                            <input
                              type="date"
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                              value={addDraft.date_in}
                              onChange={(e) =>
                                setAddDraft((d) => ({ ...d, date_in: e.target.value }))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900">Date out</label>
                            <input
                              type="date"
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                              value={addDraft.date_out}
                              onChange={(e) =>
                                setAddDraft((d) => ({ ...d, date_out: e.target.value }))
                              }
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <label className="text-sm font-semibold text-slate-900">Notes</label>
                            <textarea
                              rows={3}
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                              value={addDraft.notes}
                              onChange={(e) =>
                                setAddDraft((d) => ({ ...d, notes: e.target.value }))
                              }
                              placeholder="Optional notes…"
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <label className="text-sm font-semibold text-slate-900">
                              Additional details
                            </label>
                            <textarea
                              rows={4}
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                              value={addDraft.additional_details}
                              onChange={(e) =>
                                setAddDraft((d) => ({ ...d, additional_details: e.target.value }))
                              }
                              placeholder="Optional details…"
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <label className="text-sm font-semibold text-slate-900">Archive</label>
                            <label className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
                              <span>{addDraft.archived ? "Archived" : "Not archived"}</span>
                              <input
                                type="checkbox"
                                checked={addDraft.archived}
                                onChange={(e) =>
                                  setAddDraft((d) => ({ ...d, archived: e.target.checked }))
                                }
                                className="h-4 w-4 rounded border-slate-300 text-[color:var(--brand)] focus:ring-[color:var(--brandRing)]"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                          {validateDraft(addDraft) ? validateDraft(addDraft) : "Ready to add."}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-5">
                        <button
                          onClick={() => setShowAdd(false)}
                          disabled={adding}
                          className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-60"
                        >
                          Cancel
                        </button>

                        <button
                          onClick={addClient}
                          disabled={!canAdd() || adding}
                          className={clsx(
                            "inline-flex items-center justify-center rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2",
                            !canAdd() || adding
                              ? "bg-slate-300 cursor-not-allowed"
                              : "bg-[color:var(--brand)] hover:bg-[color:var(--brandDark)]"
                          )}
                        >
                          {adding ? "Adding…" : "Add client"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}
