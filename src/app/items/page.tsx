"use client";

import { useEffect, useState } from "react";
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

function BackArrow({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
      aria-label="Back"
    >
      <span aria-hidden className="text-base leading-none">
        ←
      </span>
      Back
    </a>
  );
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
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="text-base font-semibold text-slate-900">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label="Close"
              title="Close"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function Items() {
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
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : msgTone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
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

    // HARD DELETE: this may fail if referenced by lots/transactions/etc.
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

  return (
    <AuthGuard>
      <AdminGuard>
        <main className="min-h-screen bg-slate-50">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-slate-900 text-white grid place-items-center font-bold shrink-0">
                  I
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-slate-500 truncate">
                    {shelterName}
                  </div>
                  <div className="text-base font-semibold text-slate-900">
                    Items
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <BackArrow href="/admin" />
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
            {/* Add Item */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500">Manage items</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    Add item
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Create items once. Volunteers log stock against these.
                  </div>
                </div>

                <div className="hidden sm:block text-xs font-semibold text-slate-600 rounded-full px-2.5 py-1 bg-slate-50 border border-slate-200">
                  Admin only
                </div>
              </div>

              <form className="mt-5 space-y-4" onSubmit={addItem}>
                <div>
                  <div className="text-xs font-semibold text-slate-600">
                    Item name
                  </div>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Example: Toothpaste"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-600">
                      Category
                    </div>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Example: Hygiene"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-600">
                      Unit
                    </div>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Example: each / box / lbs"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <div className="text-xs font-semibold text-slate-600">
                      Low stock threshold
                    </div>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
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
                        "w-full sm:w-auto inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold",
                        saving
                          ? "bg-slate-200 text-slate-600 cursor-not-allowed"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      )}
                    >
                      {saving ? "Adding…" : "Add item"}
                    </button>
                  </div>
                </div>

                {msg && (
                  <div
                    className={clsx(
                      "rounded-xl border px-4 py-3 text-sm",
                      msgBoxCls
                    )}
                  >
                    {msg}
                  </div>
                )}
              </form>
            </div>

            {/* Items table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-500">Current items</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    Item list
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Edit names, units, and thresholds. You can also disable an
                    item without deleting it.
                  </div>
                </div>
                <div className="text-sm text-slate-500 whitespace-nowrap">
                  {loading ? "Loading…" : `${items.length} item(s)`}
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                {loading ? (
                  <div className="p-4 text-sm text-slate-600">Loading…</div>
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
                        {items.map((i) => (
                          <tr key={i.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {i.name}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {i.category}
                            </td>
                            <td className="px-4 py-3 text-slate-700">{i.unit}</td>
                            <td className="px-4 py-3 text-right text-slate-700">
                              {i.low_stock_threshold}
                            </td>
                            <td className="px-4 py-3">
                              {i.active ? (
                                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEdit(i)}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDelete(i)}
                                  className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
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

              <div className="mt-3 text-xs text-slate-500">
                Tip: If you want to keep history but stop using an item, click{" "}
                <span className="font-semibold text-slate-700">Edit</span> and turn{" "}
                <span className="font-semibold text-slate-700">Active</span> off instead of deleting.
              </div>
            </div>
          </div>

          {/* EDIT MODAL */}
          <Modal open={editOpen} title="Edit item" onClose={closeEdit}>
            <form className="space-y-4" onSubmit={saveEdit}>
              <div>
                <div className="text-xs font-semibold text-slate-600">
                  Item name
                </div>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600">
                    Category
                  </div>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600">Unit</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 items-end">
                <div>
                  <div className="text-xs font-semibold text-slate-600">
                    Low stock threshold
                  </div>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
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
                    className="h-4 w-4"
                  />
                  Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className={clsx(
                    "rounded-xl px-4 py-2 text-sm font-semibold",
                    editSaving
                      ? "bg-slate-200 text-slate-600 cursor-not-allowed"
                      : "bg-slate-900 text-white hover:bg-slate-800"
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
                <span className="font-semibold text-slate-900">
                  {deleteItemName}
                </span>
                ?
              </div>

              <div className="text-sm text-slate-600">
                This is a hard delete. If this item is referenced by lots or
                transactions, Supabase may block it.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeDelete}
                  disabled={deleteSaving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteSaving}
                  className={clsx(
                    "rounded-xl px-4 py-2 text-sm font-semibold",
                    deleteSaving
                      ? "bg-red-200 text-red-800 cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-500"
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
