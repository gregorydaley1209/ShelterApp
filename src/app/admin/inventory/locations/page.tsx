// FILE: src/app/admin/inventory/locations/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabaseClient";

type Location = { id: string; name: string };

type LocInvItem = {
  item_id: string;
  name: string;
  category: string;
  unit: string;
  low_stock_threshold: number;
  qty: number;
};

type LocationInventory = {
  location_id: string;
  location_name: string;
  items: LocInvItem[];
  totalQty: number;
};

function clsx(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="text-xs font-semibold text-slate-700 rounded-full px-2.5 py-1 bg-slate-50 border border-slate-200">
      {children}
    </span>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "danger" | "warn" | "ok" | "neutral";
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  const toneCls =
    tone === "danger"
      ? "bg-red-50 text-red-700 ring-red-200"
      : tone === "warn"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : tone === "ok"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-slate-50 text-slate-700 ring-slate-200";
  return <span className={clsx(base, toneCls)}>{children}</span>;
}

function statusOfItem(i: LocInvItem) {
  if (i.qty === 0) return { label: "Out", tone: "danger" as const };
  if (i.qty <= i.low_stock_threshold) return { label: "Low", tone: "warn" as const };
  return { label: "OK", tone: "ok" as const };
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="text-base font-semibold text-slate-900">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
              aria-label="Close"
              title="Close"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function LocationsPage() {
  const year = new Date().getFullYear();

  const [shelterName, setShelterName] = useState<string>("Shelter");

  const [name, setName] = useState("");
  const [rows, setRows] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "error" | "neutral">("neutral");

  // Inventory by location
  const [invLoading, setInvLoading] = useState(true);
  const [inv, setInv] = useState<LocationInventory[]>([]);
  const [invQ, setInvQ] = useState("");
  const [invFilter, setInvFilter] = useState<"all" | "out" | "low">("all");
  const [openLocs, setOpenLocs] = useState<Set<string>>(new Set());

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [deleteName, setDeleteName] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);

  const msgBoxCls =
    msgTone === "ok"
      ? "border-emerald-600/20 bg-emerald-500/10 text-emerald-800"
      : msgTone === "error"
      ? "border-red-600/20 bg-red-500/10 text-red-800"
      : "border-slate-200 bg-slate-50 text-slate-700";

  async function requireAdminAndOrg(): Promise<
    | { ok: true; orgId: string }
    | { ok: false; message: string; redirect?: string }
  > {
    const orgId = localStorage.getItem("selected_org_id");
    if (!orgId)
      return {
        ok: false,
        message: "No shelter selected.",
        redirect: "/select-shelter",
      };

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;
    if (authErr || !user) return { ok: false, message: "Not signed in.", redirect: "/" };

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile?.organization_id)
      return {
        ok: false,
        message: "Missing profile.",
        redirect: "/select-shelter",
      };

    if (String(profile.organization_id) !== String(orgId))
      return {
        ok: false,
        message: "Wrong shelter selected.",
        redirect: "/select-shelter",
      };

    if (profile.role !== "admin") return { ok: false, message: "Admins only." };

    return { ok: true, orgId: String(orgId) };
  }

  function toggleOpen(locId: string) {
    setOpenLocs((prev) => {
      const next = new Set(prev);
      if (next.has(locId)) next.delete(locId);
      else next.add(locId);
      return next;
    });
  }

  function openAll() {
    setOpenLocs(new Set(inv.map((x) => x.location_id)));
  }
  function closeAll() {
    setOpenLocs(new Set());
  }

  async function loadLocations(orgId: string) {
    const { data, error } = await supabase
      .from("locations")
      .select("id,name")
      .eq("organization_id", orgId)
      .order("name");

    if (error) throw error;
    return (data as any) as Location[];
  }

  async function loadInventoryByLocation(orgId: string, locs: Location[]) {
    const { data, error } = await supabase
      .from("lots")
      .select(
        "id, location_id, item_id, qty_remaining, items(name, category, unit, low_stock_threshold), locations(name)"
      )
      .eq("organization_id", orgId)
      .gt("qty_remaining", 0)
      .limit(10000);

    if (error) throw error;

    const locNameById = new Map<string, string>();
    for (const l of locs) locNameById.set(l.id, l.name);

    const agg = new Map<string, Map<string, LocInvItem>>();

    for (const raw of (data as any[]) ?? []) {
      const location_id = String(raw.location_id ?? "");
      const item_id = String(raw.item_id ?? "");
      if (!location_id || !item_id) continue;

      const item = raw.items ?? {};
      const qty = Number(raw.qty_remaining ?? 0) || 0;

      const nm = String(item.name ?? "Unknown");
      const cat = String(item.category ?? "Other");
      const un = String(item.unit ?? "");
      const low = Number(item.low_stock_threshold ?? 0) || 0;

      if (!agg.has(location_id)) agg.set(location_id, new Map());
      const byItem = agg.get(location_id)!;

      const prev = byItem.get(item_id);
      if (!prev) {
        byItem.set(item_id, {
          item_id,
          name: nm,
          category: cat,
          unit: un,
          low_stock_threshold: low,
          qty,
        });
      } else {
        prev.qty += qty;
      }

      const joinedLocName = raw.locations?.name ? String(raw.locations.name) : "";
      if (joinedLocName) locNameById.set(location_id, joinedLocName);
    }

    const out: LocationInventory[] = locs
      .map((l) => {
        const itemsMap = agg.get(l.id) ?? new Map<string, LocInvItem>();
        const items = Array.from(itemsMap.values()).sort((a, b) => {
          const aRank = a.qty === 0 ? 0 : a.qty <= a.low_stock_threshold ? 1 : 2;
          const bRank = b.qty === 0 ? 0 : b.qty <= b.low_stock_threshold ? 1 : 2;
          if (aRank !== bRank) return aRank - bRank;
          if (a.qty !== b.qty) return a.qty - b.qty;
          return a.name.localeCompare(b.name);
        });

        const totalQty = items.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);

        return {
          location_id: l.id,
          location_name: locNameById.get(l.id) ?? l.name ?? "Unknown",
          items,
          totalQty,
        };
      })
      .sort((a, b) => a.location_name.localeCompare(b.location_name));

    return out;
  }

  async function load() {
    setLoading(true);
    setInvLoading(true);
    setMsg("");
    setMsgTone("neutral");

    const selectedOrgName = localStorage.getItem("selected_org_name");
    if (selectedOrgName) setShelterName(selectedOrgName);

    const gate = await requireAdminAndOrg();
    if (!gate.ok) {
      if (gate.redirect) window.location.href = gate.redirect;
      else {
        setRows([]);
        setInv([]);
        setMsgTone("error");
        setMsg(gate.message);
        setLoading(false);
        setInvLoading(false);
      }
      return;
    }

    try {
      const locs = await loadLocations(gate.orgId);
      setRows(locs);

      const invData = await loadInventoryByLocation(gate.orgId, locs);
      setInv(invData);

      setOpenLocs((prev) => {
        if (prev.size > 0) return prev;
        const next = new Set<string>();
        if (invData[0]) next.add(invData[0].location_id);
        if (invData[1]) next.add(invData[1].location_id);
        return next;
      });

      setLoading(false);
      setInvLoading(false);
    } catch (e: any) {
      setRows([]);
      setInv([]);
      setMsgTone("error");
      setMsg(e?.message ?? "Failed to load.");
      setLoading(false);
      setInvLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setMsgTone("neutral");
    setSaving(true);

    const gate = await requireAdminAndOrg();
    if (!gate.ok) {
      if (gate.redirect) window.location.href = gate.redirect;
      else {
        setMsgTone("error");
        setMsg(gate.message);
      }
      setSaving(false);
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      setMsgTone("error");
      setMsg("Location name is required.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("locations").insert({
      organization_id: gate.orgId,
      name: trimmed,
    });

    if (error) {
      setMsgTone("error");
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setMsgTone("ok");
    setMsg("Location added.");
    setSaving(false);
    load();
  }

  function openEdit(r: Location) {
    setEditId(r.id);
    setEditName(r.name);
    setEditOpen(true);
  }
  function closeEdit() {
    if (editSaving) return;
    setEditOpen(false);
    setEditId("");
    setEditName("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;

    setEditSaving(true);
    setMsg("");
    setMsgTone("neutral");

    const gate = await requireAdminAndOrg();
    if (!gate.ok) {
      if (gate.redirect) window.location.href = gate.redirect;
      else {
        setMsgTone("error");
        setMsg(gate.message);
      }
      setEditSaving(false);
      return;
    }

    const trimmed = editName.trim();
    if (!trimmed) {
      setMsgTone("error");
      setMsg("Location name is required.");
      setEditSaving(false);
      return;
    }

    const { error } = await supabase
      .from("locations")
      .update({ name: trimmed })
      .eq("id", editId)
      .eq("organization_id", gate.orgId);

    if (error) {
      setMsgTone("error");
      setMsg(error.message);
      setEditSaving(false);
      return;
    }

    setMsgTone("ok");
    setMsg("Location updated.");
    setEditSaving(false);
    closeEdit();
    load();
  }

  function openDelete(r: Location) {
    setDeleteId(r.id);
    setDeleteName(r.name);
    setDeleteOpen(true);
  }
  function closeDelete() {
    if (deleteSaving) return;
    setDeleteOpen(false);
    setDeleteId("");
    setDeleteName("");
  }

  async function confirmDelete() {
    if (!deleteId) return;

    setDeleteSaving(true);
    setMsg("");
    setMsgTone("neutral");

    const gate = await requireAdminAndOrg();
    if (!gate.ok) {
      if (gate.redirect) window.location.href = gate.redirect;
      else {
        setMsgTone("error");
        setMsg(gate.message);
      }
      setDeleteSaving(false);
      return;
    }

    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", deleteId)
      .eq("organization_id", gate.orgId);

    if (error) {
      setMsgTone("error");
      setMsg(error.message);
      setDeleteSaving(false);
      return;
    }

    setMsgTone("ok");
    setMsg(`Deleted "${deleteName}".`);
    setDeleteSaving(false);
    closeDelete();
    load();
  }

  const invFiltered = useMemo(() => {
    const s = invQ.trim().toLowerCase();

    return inv.map((loc) => {
      let items = loc.items;

      if (invFilter === "out") items = items.filter((x) => x.qty === 0);
      if (invFilter === "low") items = items.filter((x) => x.qty <= x.low_stock_threshold);

      if (s) {
        items = items.filter(
          (x) =>
            x.name.toLowerCase().includes(s) ||
            x.category.toLowerCase().includes(s) ||
            (x.unit || "").toLowerCase().includes(s)
        );
      }

      const totalQty = items.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);

      return { ...loc, items, totalQty };
    });
  }, [inv, invQ, invFilter]);

  return (
    <AuthGuard>
      <AdminGuard>
        <main
          id="top"
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

          {/* Background wash (Wishlist basis) */}
          <div className="pointer-events-none fixed inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-slate-50 via-transparent to-transparent" />
          </div>

          {/* ===== HEADER (IDENTICAL to Wishlist header style) ===== */}
          <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  href="/admin/inventory/dashboard"
                  className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 grid place-items-center transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                  aria-label="Back to inventory"
                  title="Back"
                >
                  <span className="text-lg text-slate-700">←</span>
                </Link>

                <Link
                  href="/"
                  className="inline-flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2 rounded min-w-0"
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

                  <span className="min-w-0">
                    <span className="block truncate text-xs text-slate-500">{shelterName}</span>
                    <span className="block truncate text-base font-semibold text-slate-900">
                      Locations
                    </span>
                  </span>
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/admin/inventory/dashboard"
                  className="hidden sm:inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                >
                  Inventory
                </Link>

                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                >
                  Admin
                </Link>
              </div>
            </div>
          </header>

          {/* ===== BODY (Wishlist rhythm: hero strip -> main card with sections) ===== */}
          <section
            id="main-content"
            className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white"
          >
            <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-16">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
                <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
                Inventory • Locations
              </div>

              <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Manage locations
              </h1>

              <p className="mt-3 max-w-2xl text-lg text-slate-600 leading-relaxed">
                Locations help volunteers log items to the right place (pantry, fridge, closet,
                shelf, etc.). See totals per location instantly.
              </p>

              {/* One main card like Wishlist */}
              <div className="mt-10 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="p-6 sm:p-8 space-y-10">
                  {/* Add location */}
                  <div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm text-slate-600">Add location</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">Create a location</div>
                        <div className="mt-1 text-sm text-slate-600">
                          Tip: keep names short + consistent (e.g., “Fridge”, “Freezer”, “Pantry A”).
                        </div>
                      </div>
                      <Badge>Admin only</Badge>
                    </div>

                    <form className="mt-6 space-y-4" onSubmit={add}>
                      <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
                        <div className="sm:col-span-2">
                          <div className="text-xs font-semibold text-slate-700">Location name</div>
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                            placeholder="Example: Pantry Shelf A"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </div>

                        <div className="flex sm:justify-end">
                          <button
                            type="submit"
                            disabled={saving}
                            className={clsx(
                              "group w-full sm:w-auto inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold shadow-lg shadow-[color:var(--brand)]/15 transition-all focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2",
                              saving
                                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                                : "bg-[color:var(--brand)] text-white hover:bg-[color:var(--brandDark)] hover:shadow-xl hover:shadow-[color:var(--brand)]/20"
                            )}
                          >
                            {saving ? "Adding…" : "Add location"}
                            {!saving && (
                              <svg
                                className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {msg && (
                        <div className={clsx("rounded-xl border p-4 text-sm", msgBoxCls)}>
                          {msg}
                        </div>
                      )}
                    </form>
                  </div>

                  <div className="border-t border-slate-200" />

                  {/* Inventory by location */}
                  <div>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-sm text-slate-600">Inventory by location</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">
                          Full inventory per location
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          This sums <span className="font-semibold text-slate-900">quantity remaining</span>{" "}
                          across all lots in each location.
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <input
                          className="h-10 w-full sm:w-64 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                          placeholder="Search inventory…"
                          value={invQ}
                          onChange={(e) => setInvQ(e.target.value)}
                        />

                        <select
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                          value={invFilter}
                          onChange={(e) => setInvFilter(e.target.value as any)}
                        >
                          <option value="all">All</option>
                          <option value="out">Out</option>
                          <option value="low">Low</option>
                        </select>

                        <button
                          type="button"
                          onClick={openAll}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                        >
                          Open all
                        </button>
                        <button
                          type="button"
                          onClick={closeAll}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                        >
                          Close all
                        </button>

                        <button
                          type="button"
                          onClick={load}
                          className="h-10 rounded-xl bg-[color:var(--brand)] px-3 text-sm font-semibold text-white hover:bg-[color:var(--brandDark)] transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      {invLoading ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          Loading inventory…
                        </div>
                      ) : invFiltered.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          No locations found.
                        </div>
                      ) : (
                        invFiltered.map((loc) => {
                          const isOpen = openLocs.has(loc.location_id);
                          const outCount = loc.items.filter((x) => x.qty === 0).length;
                          const lowCount = loc.items.filter(
                            (x) => x.qty > 0 && x.qty <= x.low_stock_threshold
                          ).length;

                          return (
                            <div
                              key={loc.location_id}
                              className="rounded-2xl border border-slate-200 overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() => toggleOpen(loc.location_id)}
                                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition"
                              >
                                <div className="min-w-0 text-left">
                                  <div className="flex items-center gap-2">
                                    <div className="font-semibold text-slate-900 truncate">
                                      {loc.location_name}
                                    </div>
                                    <Badge>{loc.items.length} item(s)</Badge>
                                    {outCount > 0 && <Pill tone="danger">{outCount} out</Pill>}
                                    {lowCount > 0 && <Pill tone="warn">{lowCount} low</Pill>}
                                  </div>
                                  <div className="mt-0.5 text-xs text-slate-500">
                                    Total quantity:{" "}
                                    <span className="font-semibold text-slate-900">
                                      {loc.totalQty}
                                    </span>
                                  </div>
                                </div>

                                <div className="shrink-0 text-slate-600">
                                  <span className="text-sm font-semibold">
                                    {isOpen ? "Hide" : "Show"}
                                  </span>{" "}
                                  <span aria-hidden className="ml-1">
                                    {isOpen ? "▾" : "▸"}
                                  </span>
                                </div>
                              </button>

                              {isOpen && (
                                <div className="bg-white border-t border-slate-200">
                                  {loc.items.length === 0 ? (
                                    <div className="px-4 py-4 text-sm text-slate-600">
                                      No items currently stored in this location.
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-sm">
                                        <thead className="bg-slate-50">
                                          <tr className="text-left text-slate-600">
                                            <th className="px-4 py-3 font-semibold">Item</th>
                                            <th className="px-4 py-3 font-semibold">Category</th>
                                            <th className="px-4 py-3 font-semibold text-right">
                                              Qty
                                            </th>
                                            <th className="px-4 py-3 font-semibold text-right">
                                              Min
                                            </th>
                                            <th className="px-4 py-3 font-semibold">Unit</th>
                                            <th className="px-4 py-3 font-semibold">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white">
                                          {loc.items.map((it) => {
                                            const st = statusOfItem(it);
                                            return (
                                              <tr key={it.item_id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-semibold text-slate-900">
                                                  {it.name}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                  {it.category}
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                                                  {it.qty}
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                                                  {it.low_stock_threshold}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                  {it.unit || "—"}
                                                </td>
                                                <td className="px-4 py-3">
                                                  <Pill tone={st.tone}>{st.label}</Pill>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="mt-4 text-xs text-slate-500">
                      Note: This is location-based inventory (from{" "}
                      <span className="font-semibold text-slate-900">lots.qty_remaining</span>). Your
                      “global” totals use{" "}
                      <span className="font-semibold text-slate-900">inventory_view</span>.
                    </div>
                  </div>

                  <div className="border-t border-slate-200" />

                  {/* Locations list */}
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-slate-600">Current locations</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">Location list</div>
                      </div>
                      <div className="text-sm text-slate-600">
                        {loading ? "Loading…" : `${rows.length} location(s)`}
                      </div>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      {loading ? (
                        <div className="p-4 text-sm text-slate-600">Loading…</div>
                      ) : rows.length === 0 ? (
                        <div className="p-6">
                          <div className="text-sm font-semibold text-slate-900">No locations yet</div>
                          <div className="mt-1 text-sm text-slate-600">
                            Add a few common ones to start:
                          </div>
                          <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-slate-700">
                            <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              Pantry
                            </li>
                            <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              Fridge
                            </li>
                            <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              Freezer
                            </li>
                            <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              Hygiene shelf
                            </li>
                          </ul>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr className="text-left text-slate-600">
                                <th className="px-4 py-3 font-semibold">Location</th>
                                <th className="px-4 py-3 font-semibold text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {rows.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 font-semibold text-slate-900">
                                    {r.name}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="inline-flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openEdit(r)}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openDelete(r)}
                                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <p className="mt-4 text-sm text-slate-500">
                      Tip: If you want multiple shelves, keep the pattern consistent (e.g., “Pantry A”, “Pantry B”).
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-sm text-slate-500">
                Locations stay internal—donors will only see your wishlist, not your storage layout.
              </p>
            </div>
          </section>

          {/* ===== FOOTER (Wishlist-basis: same structure) ===== */}
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
              <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] rounded"
                >
                  <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded">
                    <Image
                      src="/shelterstock-logo.png"
                      alt="ShelterStock"
                      width={40}
                      height={40}
                      className="h-10 w-10 object-contain"
                    />
                  </span>

                  <div>
                    <p className="font-semibold text-slate-900">ShelterStock</p>
                    <p className="text-sm text-slate-500">{year}</p>
                  </div>
                </Link>

                <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                  <Link
                    href="/admin/inventory/dashboard"
                    className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900"
                  >
                    Inventory
                  </Link>
                  <Link
                    href="/admin/dashboard"
                    className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900"
                  >
                    Admin Dashboard
                  </Link>
                  <a
                    href="#top"
                    className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900 inline-flex items-center gap-1 group"
                  >
                    Back to top
                    <svg
                      className="h-4 w-4 transition-transform group-hover:-translate-y-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 10l7-7m0 0l7 7m-7-7v18"
                      />
                    </svg>
                  </a>
                </nav>
              </div>

              <div className="mt-8 border-t border-slate-200 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-sm text-slate-500">
                  Developed in partnership with Denton nonprofits
                </p>
                <p className="text-sm text-slate-500">
                  Keep storage organized, keep counts accurate
                </p>
              </div>
            </div>
          </footer>

          {/* EDIT MODAL */}
          <Modal open={editOpen} title="Edit location" onClose={closeEdit}>
            <form className="space-y-4" onSubmit={saveEdit}>
              <div>
                <div className="text-xs font-semibold text-slate-700">Location name</div>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2",
                    editSaving
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : "bg-[color:var(--brand)] text-white hover:bg-[color:var(--brandDark)]"
                  )}
                >
                  {editSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </Modal>

          {/* DELETE MODAL */}
          <Modal open={deleteOpen} title="Delete location" onClose={closeDelete}>
            <div className="space-y-4">
              <div className="text-sm text-slate-700">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900">{deleteName}</span>?
              </div>
              <div className="text-sm text-slate-600">
                If this location is referenced by any lots/items, Supabase may block the delete. If
                that happens, tell me and I’ll switch this to a safe “deactivate” approach like Items.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeDelete}
                  disabled={deleteSaving}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteSaving}
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2",
                    deleteSaving
                      ? "bg-red-50 text-red-400 border border-red-200 cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-700"
                  )}
                >
                  {deleteSaving ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </Modal>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}
