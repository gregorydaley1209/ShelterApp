// FILE: src/app/admin/inventory/items/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";

type Item = {
  id: string;
  name: string;
  category: string;
  unit: string;
  low_stock_threshold: number;
  active: boolean;
};

function clsx(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

/** Light-theme pill system */
function Pill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "danger" | "neutral";
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset";
  const toneCls =
    tone === "ok"
      ? "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20"
      : tone === "warn"
      ? "bg-amber-500/10 text-amber-800 ring-amber-600/20"
      : tone === "danger"
      ? "bg-red-500/10 text-red-700 ring-red-600/20"
      : "bg-slate-500/10 text-slate-700 ring-slate-600/20";
  return <span className={clsx(base, toneCls)}>{children}</span>;
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

export default function ItemsPage() {
  const year = new Date().getFullYear();

  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [unit, setUnit] = useState("each");
  const [threshold, setThreshold] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "error" | "neutral">("neutral");

  const [shelterName, setShelterName] = useState<string>("Shelter");

  // Category view filter
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("Other");
  const [editUnit, setEditUnit] = useState("each");
  const [editThreshold, setEditThreshold] = useState(0);
  const [editActive, setEditActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string>("");
  const [deleteItemName, setDeleteItemName] = useState<string>("");
  const [deleteSaving, setDeleteSaving] = useState(false);

  const msgBoxCls =
    msgTone === "ok"
      ? "border-emerald-600/20 bg-emerald-500/10 text-emerald-800"
      : msgTone === "error"
      ? "border-red-600/20 bg-red-500/10 text-red-800"
      : "border-slate-200 bg-slate-50 text-slate-700";

  async function requireAdminAndOrg(): Promise<
    | { ok: true; orgId: string; userId: string }
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
    if (authErr || !user)
      return { ok: false, message: "Not signed in.", redirect: "/" };

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

    return { ok: true, orgId: String(orgId), userId: user.id };
  }

  async function load() {
    setLoading(true);
    setMsg("");
    setMsgTone("neutral");

    const selectedOrgId = localStorage.getItem("selected_org_id");
    if (!selectedOrgId) {
      window.location.href = "/select-shelter";
      return;
    }

    const selectedOrgName = localStorage.getItem("selected_org_name");
    if (selectedOrgName) setShelterName(selectedOrgName);

    const gate = await requireAdminAndOrg();
    if (!gate.ok) {
      if (gate.redirect) window.location.href = gate.redirect;
      else {
        setItems([]);
        setMsgTone("error");
        setMsg(gate.message);
        setLoading(false);
      }
      return;
    }

    const { data, error } = await supabase
      .from("items")
      .select("id,name,category,unit,low_stock_threshold,active")
      .eq("organization_id", gate.orgId)
      .order("name");

    if (error) {
      setItems([]);
      setMsgTone("error");
      setMsg(error.message);
      setLoading(false);
      return;
    }

    setItems((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addItem(e: React.FormEvent) {
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

    const { error } = await supabase.from("items").insert({
      organization_id: gate.orgId,
      name: name.trim(),
      category: category.trim() || "Other",
      unit: unit.trim() || "each",
      low_stock_threshold: Number.isFinite(threshold) ? threshold : 0,
      active: true,
    });

    if (error) {
      setMsgTone("error");
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setCategory("Other");
    setUnit("each");
    setThreshold(0);

    setMsgTone("ok");
    setMsg("Item added.");
    setSaving(false);

    load();
  }

  function openEdit(i: Item) {
    setEditItemId(i.id);
    setEditName(i.name);
    setEditCategory(i.category || "Other");
    setEditUnit(i.unit || "each");
    setEditThreshold(Number(i.low_stock_threshold || 0));
    setEditActive(Boolean(i.active));
    setEditOpen(true);
  }

  function closeEdit() {
    if (editSaving) return;
    setEditOpen(false);
    setEditItemId("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItemId) return;

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

    const { error } = await supabase
      .from("items")
      .update({
        name: editName.trim(),
        category: editCategory.trim() || "Other",
        unit: editUnit.trim() || "each",
        low_stock_threshold: Number.isFinite(editThreshold) ? editThreshold : 0,
        active: !!editActive,
      })
      .eq("id", editItemId)
      .eq("organization_id", gate.orgId);

    if (error) {
      setMsgTone("error");
      setMsg(error.message);
      setEditSaving(false);
      return;
    }

    setMsgTone("ok");
    setMsg("Item updated.");
    setEditSaving(false);
    closeEdit();
    load();
  }

  function openDelete(i: Item) {
    setDeleteItemId(i.id);
    setDeleteItemName(i.name);
    setDeleteOpen(true);
  }

  function closeDelete() {
    if (deleteSaving) return;
    setDeleteOpen(false);
    setDeleteItemId("");
    setDeleteItemName("");
  }

  async function confirmDelete() {
    if (!deleteItemId) return;

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
      .from("items")
      .delete()
      .eq("id", deleteItemId)
      .eq("organization_id", gate.orgId);

    if (error) {
      setMsgTone("error");
      setMsg(
        error.message ||
          "Could not delete item. It may be referenced by transactions/lots."
      );
      setDeleteSaving(false);
      return;
    }

    setMsgTone("ok");
    setMsg(`Deleted "${deleteItemName}".`);
    setDeleteSaving(false);
    closeDelete();
    load();
  }

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(items.map((i) => (i.category ? i.category : "Other")))
    ).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const displayItems =
    categoryFilter === "all"
      ? items
      : items.filter(
          (i) => (i.category ? i.category : "Other") === categoryFilter
        );

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

          {/* Background wash (IDENTICAL vibe to Wishlist) */}
          <div className="pointer-events-none fixed inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-slate-50 via-transparent to-transparent" />
          </div>

          {/* ===== HEADER (Wishlist-basis: same structure) ===== */}
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
                    <span className="block truncate text-xs text-slate-500">
                      {shelterName}
                    </span>
                    <span className="block truncate text-base font-semibold text-slate-900">
                      Items
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

          {/* ===== BODY (Wishlist-basis structure: hero strip -> one main card) ===== */}
          <section
            id="main-content"
            className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white"
          >
            <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-16">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
                <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
                Inventory • Items
              </div>

              <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Manage items
              </h1>

              <p className="mt-3 max-w-2xl text-lg text-slate-600 leading-relaxed">
                Add items once, then track quantities everywhere. Edit units and thresholds, or
                disable an item to keep history.
              </p>

              {/* Main card (matches Wishlist: rounded-2xl, border, shadow-sm) */}
              <div className="mt-10 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="p-6 sm:p-8 space-y-10">
                  {/* Add item section */}
                  <div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm text-slate-600">Add item</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">
                          Create a new item
                        </div>
                      </div>
                      <Pill tone="neutral">Admin only</Pill>
                    </div>

                    <form className="mt-6 space-y-4" onSubmit={addItem}>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">
                          Item name
                        </div>
                        <input
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                          placeholder="Example: Toothpaste"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-700">
                            Category
                          </div>
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                            placeholder="Example: Hygiene"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                          />
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-slate-700">
                            Unit
                          </div>
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                            placeholder="Example: each / box / lbs"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 items-end">
                        <div>
                          <div className="text-xs font-semibold text-slate-700">
                            Low stock threshold
                          </div>
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                            type="number"
                            min={0}
                            placeholder="Example: 10"
                            value={threshold}
                            onChange={(e) =>
                              setThreshold(parseInt(e.target.value || "0", 10))
                            }
                          />
                          <div className="mt-1 text-xs text-slate-500">
                            When stock is at or below this number, it shows as “Low”.
                          </div>
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
                            {saving ? "Adding…" : "Add item"}
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

                  {/* Divider */}
                  <div className="border-t border-slate-200" />

                  {/* List section */}
                  <div>
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-sm text-slate-600">Current items</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">
                          Item list
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          Edit names, units, and thresholds. Disable an item to keep history.
                        </div>
                      </div>
                      <div className="text-sm text-slate-600 whitespace-nowrap">
                        {loading ? "Loading…" : `${items.length} item(s)`}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-2">
                      <div className="text-xs font-semibold text-slate-700">
                        Category
                      </div>
                      <select
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                      >
                        <option value="all">All</option>
                        {categoryOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                      {loading ? (
                        <div className="p-4 text-sm text-slate-700">Loading…</div>
                      ) : items.length === 0 ? (
                        <div className="p-6">
                          <div className="text-sm font-semibold text-slate-900">
                            No items yet
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            Add your first item above (example: “Canned soup”, “Toothpaste”).
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr className="text-left text-slate-600">
                                <th className="px-4 py-3 font-semibold">Item name</th>
                                <th className="px-4 py-3 font-semibold">Category</th>
                                <th className="px-4 py-3 font-semibold">Unit</th>
                                <th className="px-4 py-3 font-semibold text-right">
                                  Threshold
                                </th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold text-right">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {displayItems.map((i) => (
                                <tr key={i.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 font-semibold text-slate-900">
                                    {i.name}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">
                                    {i.category}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">
                                    {i.unit}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                                    {i.low_stock_threshold}
                                  </td>
                                  <td className="px-4 py-3">
                                    {i.active ? (
                                      <Pill tone="ok">Active</Pill>
                                    ) : (
                                      <Pill tone="neutral">Inactive</Pill>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="inline-flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openEdit(i)}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openDelete(i)}
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
                      Tip: To keep history but stop using an item, click{" "}
                      <span className="font-semibold text-slate-900">Edit</span> and turn{" "}
                      <span className="font-semibold text-slate-900">Active</span> off instead of deleting.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-sm text-slate-500">
                Keep categories consistent so reports and wishlists stay clean.
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
                  Organize items once, track everything
                </p>
              </div>
            </div>
          </footer>

          {/* EDIT MODAL */}
          <Modal open={editOpen} title="Edit item" onClose={closeEdit}>
            <form className="space-y-4" onSubmit={saveEdit}>
              <div>
                <div className="text-xs font-semibold text-slate-700">Item name</div>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-700">Category</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-700">Unit</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 items-end">
                <div>
                  <div className="text-xs font-semibold text-slate-700">
                    Low stock threshold
                  </div>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                    type="number"
                    min={0}
                    value={editThreshold}
                    onChange={(e) =>
                      setEditThreshold(parseInt(e.target.value || "0", 10))
                    }
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="h-4 w-4 accent-[color:var(--brand)]"
                  />
                  Active
                </label>
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

          {/* DELETE CONFIRM MODAL */}
          <Modal open={deleteOpen} title="Delete item" onClose={closeDelete}>
            <div className="space-y-4">
              <div className="text-sm text-slate-700">
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-slate-900">{deleteItemName}</span>?
              </div>

              <div className="text-sm text-slate-600">
                This is a hard delete. If this item is referenced by lots or transactions,
                Supabase may block it.
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
