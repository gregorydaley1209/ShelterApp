"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  item_id: string;
  name: string;
  category: string;
  unit: string;
  low_stock_threshold: number;
  current_qty: number;
  active: boolean;
  organization_id?: string;
};

type LotAlertRow = {
  id: string;
  item_id: string;
  name: string;
  category: string;
  qty_remaining: number;
  expiration_date: string; // YYYY-MM-DD (date)
  location_name: string | null;
};

function clsx(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

function Pill({
  tone,
  children,
}: {
  tone: "danger" | "warn" | "ok" | "neutral";
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset";
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

function statusOf(r: Row) {
  if (r.current_qty === 0) return { label: "Out", tone: "danger" as const };
  if (r.current_qty <= r.low_stock_threshold)
    return { label: "Low", tone: "warn" as const };
  return { label: "OK", tone: "ok" as const };
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysUntilYMD(ymd: string) {
  const dt = new Date(ymd);
  if (Number.isNaN(dt.getTime())) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const diff = target - start;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function expTone(daysLeft: number | null) {
  if (daysLeft === null) return "neutral" as const;
  if (daysLeft <= 0) return "danger" as const;
  if (daysLeft <= 3) return "danger" as const;
  if (daysLeft <= 7) return "warn" as const;
  return "neutral" as const;
}

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "out" | "low">("all");
  const [loading, setLoading] = useState(true);

  const [shelterName, setShelterName] = useState<string>("Shelter");
  const [role, setRole] = useState<"admin" | "volunteer" | string>("volunteer");

  // Lots data
  const [allExpiredLots, setAllExpiredLots] = useState<LotAlertRow[]>([]);
  const [allExpiringSoonLots, setAllExpiringSoonLots] = useState<LotAlertRow[]>([]);
  const [expLoading, setExpLoading] = useState<boolean>(true);

  // Dismissed per org (persisted)
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [dismissedLotIds, setDismissedLotIds] = useState<Set<string>>(new Set());

  function dismissedStorageKey(orgId: string) {
    return `dismissed_lot_alerts_${orgId}`;
  }

  function loadDismissed(orgId: string) {
    try {
      const raw = localStorage.getItem(dismissedStorageKey(orgId));
      if (!raw) return new Set<string>();
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return new Set<string>();
      return new Set<string>(arr.filter((x) => typeof x === "string"));
    } catch {
      return new Set<string>();
    }
  }

  function saveDismissed(orgId: string, set: Set<string>) {
    try {
      localStorage.setItem(dismissedStorageKey(orgId), JSON.stringify(Array.from(set)));
    } catch {
      // ignore
    }
  }

  function dismissLot(id: string) {
    if (!id || !selectedOrgId) return;
    setDismissedLotIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(selectedOrgId, next);
      return next;
    });
  }

  function resetDismissed() {
    if (!selectedOrgId) return;
    setDismissedLotIds(new Set());
    try {
      localStorage.removeItem(dismissedStorageKey(selectedOrgId));
    } catch {
      // ignore
    }
  }

  async function load() {
    setLoading(true);
    setExpLoading(true);

    // Selected shelter
    const orgId = localStorage.getItem("selected_org_id");
    if (!orgId) {
      window.location.href = "/select-shelter";
      return;
    }
    setSelectedOrgId(String(orgId));

    // Dismissed for this org
    const dismissed = loadDismissed(String(orgId));
    setDismissedLotIds(dismissed);

    // Show shelter name from localStorage immediately
    const selectedOrgName = localStorage.getItem("selected_org_name");
    if (selectedOrgName) setShelterName(selectedOrgName);

    // Auth user
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authErr || !user) {
      window.location.href = "/";
      return;
    }

    // Profile org + role
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile?.organization_id) {
      window.location.href = "/select-shelter";
      return;
    }

    // WRONG SHELTER PROTECTION
    if (String(profile.organization_id) !== String(orgId)) {
      localStorage.removeItem("selected_org_id");
      localStorage.removeItem("selected_org_name");
      window.location.href = "/select-shelter";
      return;
    }

    const r = (profile.role || "volunteer") as any;
    setRole(r === "admin" ? "admin" : "volunteer");

    // Inventory
    const { data: inv, error: invErr } = await supabase
      .from("inventory_view")
      .select("*")
      .eq("active", true)
      .eq("organization_id", orgId);

    if (!invErr && inv) setRows(inv as Row[]);

    // Lots: expired + expiring soon (next 14 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayYMD = toYMD(today);

    const end = new Date(today);
    end.setDate(end.getDate() + 14);
    const endYMD = toYMD(end);

    const mapLot = (x: any): LotAlertRow => ({
      id: String(x.id ?? ""),
      item_id: String(x.item_id ?? ""),
      name: String(x.items?.name ?? "Unknown"),
      category: String(x.items?.category ?? "Other"),
      qty_remaining: Number(x.qty_remaining ?? 0) || 0,
      expiration_date: String(x.expiration_date ?? ""),
      // lots.location_id -> locations.id (join)
      location_name: x.locations?.name ? String(x.locations.name) : null,
    });

    // IMPORTANT: this join assumes lots.location_id has a FK to locations.id
    // so you can select locations(name)
    const { data: expiredData } = await supabase
      .from("lots")
      .select(
        "id, item_id, qty_remaining, expiration_date, items(name, category), locations(name)"
      )
      .eq("organization_id", orgId)
      .gt("qty_remaining", 0)
      .not("expiration_date", "is", null)
      .lt("expiration_date", todayYMD)
      .order("expiration_date", { ascending: true })
      .limit(500);

    const { data: expSoonData } = await supabase
      .from("lots")
      .select(
        "id, item_id, qty_remaining, expiration_date, items(name, category), locations(name)"
      )
      .eq("organization_id", orgId)
      .gt("qty_remaining", 0)
      .not("expiration_date", "is", null)
      .gte("expiration_date", todayYMD)
      .lte("expiration_date", endYMD)
      .order("expiration_date", { ascending: true })
      .limit(500);

    setAllExpiredLots(((expiredData as any[]) ?? []).map(mapLot).filter((x) => x.id));
    setAllExpiringSoonLots(
      ((expSoonData as any[]) ?? []).map(mapLot).filter((x) => x.id)
    );

    setExpLoading(false);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    localStorage.removeItem("selected_org_id");
    localStorage.removeItem("selected_org_name");
    window.location.href = "/select-shelter";
  }

  const stats = useMemo(() => {
    const out = rows.filter((r) => r.current_qty === 0).length;
    const low = rows.filter(
      (r) => r.current_qty > 0 && r.current_qty <= r.low_stock_threshold
    ).length;
    const ok = rows.filter((r) => r.current_qty > r.low_stock_threshold).length;
    return { out, low, ok, total: rows.length };
  }, [rows]);

  const priority = useMemo(() => {
    const out = rows
      .filter((r) => r.current_qty === 0)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 6);

    const low = rows
      .filter((r) => r.current_qty > 0 && r.current_qty <= r.low_stock_threshold)
      .sort((a, b) => a.current_qty - b.current_qty)
      .slice(0, 6);

    return { out, low };
  }, [rows]);

  const visibleExpiredAll = useMemo(
    () => allExpiredLots.filter((x) => !dismissedLotIds.has(x.id)),
    [allExpiredLots, dismissedLotIds]
  );

  const visibleExpSoonAll = useMemo(
    () => allExpiringSoonLots.filter((x) => !dismissedLotIds.has(x.id)),
    [allExpiringSoonLots, dismissedLotIds]
  );

  const expiredCount = visibleExpiredAll.length;
  const expiringSoonCount = visibleExpSoonAll.length;

  const expiredLots = visibleExpiredAll.slice(0, 6);
  const expiringSoonLots = visibleExpSoonAll.slice(0, 6);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = rows;

    if (filter === "out") list = list.filter((r) => r.current_qty === 0);
    if (filter === "low") list = list.filter((r) => r.current_qty <= r.low_stock_threshold);

    if (s) {
      list = list.filter(
        (r) => r.name.toLowerCase().includes(s) || r.category.toLowerCase().includes(s)
      );
    }

    return [...list].sort((a, b) => {
      const aRank = a.current_qty === 0 ? 0 : a.current_qty <= a.low_stock_threshold ? 1 : 2;
      const bRank = b.current_qty === 0 ? 0 : b.current_qty <= b.low_stock_threshold ? 1 : 2;
      if (aRank !== bRank) return aRank - bRank;
      return a.current_qty - b.current_qty;
    });
  }, [rows, q, filter]);

  const roleLabel = role === "admin" ? "Admin" : "Volunteer";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 font-bold text-white">
                S
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm text-slate-500">
                  {shelterName} • {roleLabel}
                </div>
                <div className="text-base font-semibold text-slate-900">Dashboard</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
              <a
                href="/log"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:w-auto"
              >
                Log item
              </a>

              <a
                href="/admin"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:w-auto"
              >
                Admin
              </a>

              <button
                onClick={signOut}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:w-auto"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Total items</div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">{stats.total}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Out of stock</div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">{stats.out}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Low stock</div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">{stats.low}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">OK</div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">{stats.ok}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Expired lots</div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">
              {expLoading ? "—" : expiredCount}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Lots with remaining quantity that are past expiration.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Expiring soon (14d)</div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">
              {expLoading ? "—" : expiringSoonCount}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Lots expiring within the next 14 days.
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Priority alerts */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">Priority alerts</div>

              <div className="flex items-center gap-2">
                <Pill tone="neutral">Keep short</Pill>
                <button
                  type="button"
                  onClick={resetDismissed}
                  className="text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                  title="Bring back alerts that were marked handled"
                >
                  Reset cleared
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-4">
              {priority.out.length === 0 &&
              priority.low.length === 0 &&
              expiredLots.length === 0 &&
              expiringSoonLots.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Nothing urgent right now 🎉
                </div>
              ) : (
                <>
                  {priority.out.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500">OUT OF STOCK</div>
                      <div className="mt-2 space-y-2">
                        {priority.out.map((r) => (
                          <div
                            key={r.item_id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-900">
                                {r.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                Category: {r.category}
                              </div>
                            </div>
                            <Pill tone="danger">Stock: 0</Pill>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {priority.low.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500">LOW STOCK</div>
                      <div className="mt-2 space-y-2">
                        {priority.low.map((r) => (
                          <div
                            key={r.item_id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-900">
                                {r.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                Category: {r.category}
                              </div>
                            </div>
                            <Pill tone="warn">
                              Stock: {r.current_qty} / Min: {r.low_stock_threshold}
                            </Pill>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      EXPIRED (REMOVE / DISCARD)
                    </div>

                    {expLoading ? (
                      <div className="mt-2 text-sm text-slate-600">Loading…</div>
                    ) : expiredLots.length === 0 ? (
                      <div className="mt-2 text-sm text-slate-600">No expired lots.</div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {expiredLots.map((e) => {
                          const dl = daysUntilYMD(e.expiration_date);
                          const label =
                            dl === null
                              ? "Expired"
                              : dl === 0
                              ? "Expires today"
                              : `${Math.abs(dl)} day(s) overdue`;

                          return (
                            <div
                              key={e.id}
                              className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-slate-900">
                                  {e.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Category: {e.category}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Qty remaining:{" "}
                                  <span className="font-semibold text-slate-900">
                                    {e.qty_remaining}
                                  </span>{" "}
                                  • Location:{" "}
                                  <span className="font-semibold text-slate-900">
                                    {e.location_name ?? "—"}
                                  </span>{" "}
                                  • Expiration date:{" "}
                                  <span className="font-semibold text-slate-900">
                                    {formatDate(e.expiration_date)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <Pill tone="danger">{label}</Pill>
                                <button
                                  type="button"
                                  onClick={() => dismissLot(e.id)}
                                  className="text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                                  title="Hide this alert after it has been handled"
                                >
                                  Mark handled
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      EXPIRING SOON (NEXT 14 DAYS)
                    </div>

                    {expLoading ? (
                      <div className="mt-2 text-sm text-slate-600">Loading…</div>
                    ) : expiringSoonLots.length === 0 ? (
                      <div className="mt-2 text-sm text-slate-600">
                        No expiring soon lots.
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {expiringSoonLots.map((e) => {
                          const dl = daysUntilYMD(e.expiration_date);
                          const tone = expTone(dl);
                          const label =
                            dl === null
                              ? "—"
                              : dl <= 0
                              ? "Expires today"
                              : dl === 1
                              ? "1 day left"
                              : `${dl} days left`;

                          return (
                            <div
                              key={e.id}
                              className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-slate-900">
                                  {e.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Category: {e.category}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Qty remaining:{" "}
                                  <span className="font-semibold text-slate-900">
                                    {e.qty_remaining}
                                  </span>{" "}
                                  • Location:{" "}
                                  <span className="font-semibold text-slate-900">
                                    {e.location_name ?? "—"}
                                  </span>{" "}
                                  • Expiration date:{" "}
                                  <span className="font-semibold text-slate-900">
                                    {formatDate(e.expiration_date)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <Pill tone={tone}>{label}</Pill>
                                <button
                                  type="button"
                                  onClick={() => dismissLot(e.id)}
                                  className="text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                                  title="Hide this alert after it has been handled"
                                >
                                  Mark handled
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Inventory */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">Current inventory</div>

              {/* Search + filter */}
              <div className="flex items-center gap-2">
                <input
                  className="hidden h-10 w-64 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-100 sm:block"
                  placeholder="Search items…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />

                <select
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                >
                  <option value="all">All</option>
                  <option value="out">Out</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Mobile search */}
            <div className="mt-3 sm:hidden">
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                placeholder="Search items…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Mobile list */}
            <div className="mt-4 space-y-2 md:hidden">
              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No items.
                </div>
              ) : (
                filtered.map((r) => {
                  const st = statusOf(r);
                  return (
                    <div
                      key={r.item_id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">
                            {r.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Category: {r.category}
                          </div>
                        </div>
                        <Pill tone={st.tone}>{st.label}</Pill>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                          <div className="text-xs text-slate-500">Stock</div>
                          <div className="font-semibold text-slate-900">
                            {r.current_qty}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                          <div className="text-xs text-slate-500">Min</div>
                          <div className="font-semibold text-slate-900">
                            {r.low_stock_threshold}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop table */}
            <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
              {loading ? (
                <div className="p-4 text-sm text-slate-600">Loading…</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                      <th className="px-4 py-3 text-right">Min</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((r) => {
                      const st = statusOf(r);
                      return (
                        <tr key={r.item_id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {r.name}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{r.category}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                            {r.current_qty}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                            {r.low_stock_threshold}
                          </td>
                          <td className="px-4 py-3">
                            <Pill tone={st.tone}>{st.label}</Pill>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-900">{filtered.length}</span>{" "}
              items.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
