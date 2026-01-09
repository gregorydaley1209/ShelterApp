"use client";

import { useEffect, useMemo, useState } from "react";
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
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "info" | "warn";
}) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  const toneCls =
    tone === "info"
      ? "bg-slate-50 text-slate-700 ring-slate-200"
      : tone === "warn"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : "bg-slate-50 text-slate-700 ring-slate-200";
  return <span className={clsx(base, toneCls)}>{children}</span>;
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

function BackArrow({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
      aria-label="Back"
    >
      <span aria-hidden>←</span>
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
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="text-base font-semibold text-slate-900">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 grid place-items-center text-slate-700"
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

export default function LocationsPage() {
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
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : msgTone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
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
    // Pull lots with location + item details; aggregate in JS
    // Assumes: lots.location_id -> locations.id, lots.item_id -> items.id
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

    // location_id -> item_id -> aggregated
    const agg = new Map<string, Map<string, LocInvItem>>();

    for (const raw of (data as any[]) ?? []) {
      const location_id = String(raw.location_id ?? "");
      const item_id = String(raw.item_id ?? "");
      if (!location_id || !item_id) continue;

      const item = raw.items ?? {};
      const qty = Number(raw.qty_remaining ?? 0) || 0;

      const name = String(item.name ?? "Unknown");
      const category = String(item.category ?? "Other");
      const unit = String(item.unit ?? "");
      const low = Number(item.low_stock_threshold ?? 0) || 0;

      if (!agg.has(location_id)) agg.set(location_id, new Map());
      const byItem = agg.get(location_id)!;

      const prev = byItem.get(item_id);
      if (!prev) {
        byItem.set(item_id, {
          item_id,
          name,
          category,
          unit,
          low_stock_threshold: low,
          qty,
        });
      } else {
        prev.qty += qty;
      }

      // keep location name map in sync even if locations table changed
      const joinedLocName = raw.locations?.name ? String(raw.locations.name) : "";
      if (joinedLocName) locNameById.set(location_id, joinedLocName);
    }

    // Build result including empty locations (show “No items”)
    const out: LocationInventory[] = locs
      .map((l) => {
        const itemsMap = agg.get(l.id) ?? new Map<string, LocInvItem>();
        const items = Array.from(itemsMap.values()).sort((a, b) => {
          // rank out/low first, then qty, then name
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

      // Default: open first 2 locations (if any)
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
        <main className="min-h-screen bg-slate-50">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-slate-900 text-white grid place-items-center font-bold shrink-0">
                  L
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-slate-500 truncate">{shelterName}</div>
                  <div className="text-base font-semibold text-slate-900">Locations</div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <Badge tone="info">Admin only</Badge>
                <BackArrow href="/admin" />
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
            {/* Add Location */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500">Manage locations</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">Add location</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Locations help volunteers log items to the right place (pantry, fridge,
                    closet, shelf, etc.).
                  </div>
                </div>
                <Badge tone="info">Used in lots</Badge>
              </div>

              <form className="mt-5 space-y-4" onSubmit={add}>
                <div className="grid gap-4 lg:grid-cols-3 lg:items-end">
                  <div className="lg:col-span-2">
                    <div className="text-xs font-semibold text-slate-600">Location name</div>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Example: Pantry Shelf A"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <div className="mt-1 text-xs text-slate-500">
                      Tip: keep names short + consistent (e.g., “Fridge”, “Freezer”, “Pantry A”, “Closet”).
                    </div>
                  </div>

                  <div className="flex lg:justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className={clsx(
                        "w-full lg:w-auto inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold",
                        saving
                          ? "bg-slate-200 text-slate-600 cursor-not-allowed"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      )}
                    >
                      {saving ? "Adding…" : "Add location"}
                    </button>
                  </div>
                </div>

                {msg && (
                  <div className={clsx("rounded-xl border px-4 py-3 text-sm", msgBoxCls)}>
                    {msg}
                  </div>
                )}
              </form>
            </div>

            {/* Inventory by location */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm text-slate-500">Inventory by location</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    Full inventory per location
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    This sums <span className="font-semibold text-slate-900">quantity remaining</span>{" "}
                    across all lots in each location.
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    className="h-10 w-full sm:w-64 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                    placeholder="Search inventory…"
                    value={invQ}
                    onChange={(e) => setInvQ(e.target.value)}
                  />

                  <select
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
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
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    Open all
                  </button>
                  <button
                    type="button"
                    onClick={closeAll}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    Close all
                  </button>

                  <button
                    type="button"
                    onClick={load}
                    className="h-10 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
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
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-slate-50"
                        >
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-slate-900 truncate">
                                {loc.location_name}
                              </div>
                              <Badge tone="info">{loc.items.length} item(s)</Badge>
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
                            <span className="text-sm font-semibold">{isOpen ? "Hide" : "Show"}</span>{" "}
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
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                      <th className="px-4 py-3 text-left">Item</th>
                                      <th className="px-4 py-3 text-left">Category</th>
                                      <th className="px-4 py-3 text-right">Qty</th>
                                      <th className="px-4 py-3 text-right">Min</th>
                                      <th className="px-4 py-3 text-left">Unit</th>
                                      <th className="px-4 py-3 text-left">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {loc.items.map((it) => {
                                      const st = statusOfItem(it);
                                      return (
                                        <tr key={it.item_id} className="hover:bg-slate-50/60">
                                          <td className="px-4 py-3 font-medium text-slate-900">
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

              <div className="mt-3 text-xs text-slate-500">
                Note: This is location-based inventory (from{" "}
                <span className="font-semibold text-slate-900">lots.qty_remaining</span>). If you
                want a “global” total too, your dashboard already uses{" "}
                <span className="font-semibold text-slate-900">inventory_view</span>.
              </div>
            </div>

            {/* Locations table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-500">Current locations</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">Location list</div>
                </div>
                <div className="text-sm text-slate-500">
                  {loading ? "Loading…" : `${rows.length} location(s)`}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          Location
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(r)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => openDelete(r)}
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
                )}
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Tip: If you want multiple shelves, keep the pattern consistent (e.g., “Pantry A”,
                “Pantry B”, “Pantry C”).
              </div>
            </div>
          </div>

          {/* EDIT MODAL */}
          <Modal open={editOpen} title="Edit location" onClose={closeEdit}>
            <form className="space-y-4" onSubmit={saveEdit}>
              <div>
                <div className="text-xs font-semibold text-slate-600">Location name</div>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
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

          {/* DELETE MODAL */}
          <Modal open={deleteOpen} title="Delete location" onClose={closeDelete}>
            <div className="space-y-4">
              <div className="text-sm text-slate-700">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900">{deleteName}</span>?
              </div>
              <div className="text-sm text-slate-600">
                If this location is referenced by any lots/items, Supabase may block the delete. If
                that happens, tell me and I’ll switch this to a safe “deactivate” delete like Items.
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
