"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

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
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset";

  const toneCls =
    tone === "danger"
      ? "bg-red-500/10 text-red-700 ring-red-200"
      : tone === "warn"
      ? "bg-amber-500/10 text-amber-800 ring-amber-200"
      : tone === "ok"
      ? "bg-emerald-500/10 text-emerald-800 ring-emerald-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

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

    const orgId = localStorage.getItem("selected_org_id");
    if (!orgId) {
      window.location.href = "/select-shelter";
      return;
    }
    setSelectedOrgId(String(orgId));

    const dismissed = loadDismissed(String(orgId));
    setDismissedLotIds(dismissed);

    const selectedOrgName = localStorage.getItem("selected_org_name");
    if (selectedOrgName) setShelterName(selectedOrgName);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authErr || !user) {
      window.location.href = "/";
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile?.organization_id) {
      window.location.href = "/select-shelter";
      return;
    }

    if (String(profile.organization_id) !== String(orgId)) {
      localStorage.removeItem("selected_org_id");
      localStorage.removeItem("selected_org_name");
      window.location.href = "/select-shelter";
      return;
    }

    const r = (profile.role || "volunteer") as any;
    setRole(r === "admin" ? "admin" : "volunteer");

    const { data: inv, error: invErr } = await supabase
      .from("inventory_view")
      .select("*")
      .eq("active", true)
      .eq("organization_id", orgId);

    if (!invErr && inv) setRows(inv as Row[]);

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
      location_name: x.locations?.name ? String(x.locations.name) : null,
    });

    const { data: expiredData } = await supabase
      .from("lots")
      .select("id, item_id, qty_remaining, expiration_date, items(name, category), locations(name)")
      .eq("organization_id", orgId)
      .gt("qty_remaining", 0)
      .not("expiration_date", "is", null)
      .lt("expiration_date", todayYMD)
      .order("expiration_date", { ascending: true })
      .limit(500);

    const { data: expSoonData } = await supabase
      .from("lots")
      .select("id, item_id, qty_remaining, expiration_date, items(name, category), locations(name)")
      .eq("organization_id", orgId)
      .gt("qty_remaining", 0)
      .not("expiration_date", "is", null)
      .gte("expiration_date", todayYMD)
      .lte("expiration_date", endYMD)
      .order("expiration_date", { ascending: true })
      .limit(500);

    setAllExpiredLots(((expiredData as any[]) ?? []).map(mapLot).filter((x) => x.id));
    setAllExpiringSoonLots(((expSoonData as any[]) ?? []).map(mapLot).filter((x) => x.id));

    setExpLoading(false);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kept for identical logic; not used on this page (sign out lives on main admin dashboard)
  async function signOut() {
    await supabase.auth.signOut();
    localStorage.removeItem("selected_org_id");
    localStorage.removeItem("selected_org_name");
    window.location.href = "/";
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
      {/* Soft wash like homepage */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-slate-50 via-transparent to-transparent" />
      </div>

      {/* ===== Header (homepage style) ===== */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded">
              <Image
                src="/shelterstock-logo.png"
                alt="ShelterStock"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
              />
            </span>

            <span className="min-w-0">
              <span className="block truncate text-xs text-slate-500">
                {shelterName} • {roleLabel}
              </span>
              <span className="block truncate text-lg font-semibold text-slate-900">
                Inventory
              </span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <SubNavLink href="/admin/inventory/wishlists" label="Wishlist" />
            <SubNavLink href="/admin/inventory/items" label="Items" />
            <SubNavLink href="/admin/inventory/locations" label="Locations" />
            <SubNavLink href="/admin/inventory/reports" label="Reports" />

            <div className="hidden md:block h-6 w-px bg-slate-200 mx-1" />

            <Link
              href="/log-item"
              className="inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
            >
              Log item
            </Link>

            <Link
              href="/admin/dashboard"
              className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              Admin
            </Link>

            {/* No sign out here */}
          </div>
        </div>
      </header>

      {/* ===== Content ===== */}
      <div className="relative mx-auto max-w-7xl px-6 py-10 space-y-8">
        {/* Title */}
        <div className="flex flex-col gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
            <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
            Live inventory • expiration monitoring
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Inventory dashboard
            <span className="block mt-2 text-slate-600 text-base font-medium">
              
            </span>
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total items" value={stats.total} />
          <StatCard label="Out of stock" value={stats.out} />
          <StatCard label="Low stock" value={stats.low} />
          <StatCard label="OK" value={stats.ok} />
          <StatCard
            label="Expired lots"
            value={expLoading ? "—" : expiredCount}
            sub="Past expiration with remaining qty."
          />
          <StatCard
            label="Expiring soon"
            value={expLoading ? "—" : expiringSoonCount}
            sub="Within next 14 days."
          />
        </div>

        {/* Main layout */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT: Alerts */}
          <section className="lg:col-span-5 xl:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-900">Priority alerts</div>

              <div className="flex items-center gap-3">
                <Pill tone="neutral">Short list</Pill>
                <button
                  type="button"
                  onClick={resetDismissed}
                  className="text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                  title="Bring back alerts that were marked handled"
                >
                  Reset cleared
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {priority.out.length === 0 &&
              priority.low.length === 0 &&
              expiredLots.length === 0 &&
              expiringSoonLots.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Nothing urgent right now 🎉
                </div>
              ) : (
                <>
                  {priority.out.length > 0 && (
                    <AlertGroup title="Out of stock">
                      {priority.out.map((r) => (
                        <AlertRow
                          key={r.item_id}
                          title={r.name}
                          subtitle={`Category: ${r.category}`}
                          right={<Pill tone="danger">Stock: 0</Pill>}
                        />
                      ))}
                    </AlertGroup>
                  )}

                  {priority.low.length > 0 && (
                    <AlertGroup title="Low stock">
                      {priority.low.map((r) => (
                        <AlertRow
                          key={r.item_id}
                          title={r.name}
                          subtitle={`Category: ${r.category}`}
                          right={
                            <Pill tone="warn">
                              {r.current_qty} / Min {r.low_stock_threshold}
                            </Pill>
                          }
                        />
                      ))}
                    </AlertGroup>
                  )}

                  <AlertGroup title="Expired (remove / discard)">
                    {expLoading ? (
                      <div className="text-sm text-slate-600">Loading…</div>
                    ) : expiredLots.length === 0 ? (
                      <div className="text-sm text-slate-600">No expired lots.</div>
                    ) : (
                      <div className="space-y-2">
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
                              className="rounded-xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-slate-900">
                                    {e.name}
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    Category: {e.category}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    Qty:{" "}
                                    <span className="font-semibold text-slate-900">
                                      {e.qty_remaining}
                                    </span>{" "}
                                    • Location:{" "}
                                    <span className="font-semibold text-slate-900">
                                      {e.location_name ?? "—"}
                                    </span>{" "}
                                    • Exp:{" "}
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
                                    className="text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                                  >
                                    Mark handled
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </AlertGroup>

                  <AlertGroup title="Expiring soon (next 14 days)">
                    {expLoading ? (
                      <div className="text-sm text-slate-600">Loading…</div>
                    ) : expiringSoonLots.length === 0 ? (
                      <div className="text-sm text-slate-600">No expiring soon lots.</div>
                    ) : (
                      <div className="space-y-2">
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
                              className="rounded-xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-slate-900">
                                    {e.name}
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    Category: {e.category}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    Qty:{" "}
                                    <span className="font-semibold text-slate-900">
                                      {e.qty_remaining}
                                    </span>{" "}
                                    • Location:{" "}
                                    <span className="font-semibold text-slate-900">
                                      {e.location_name ?? "—"}
                                    </span>{" "}
                                    • Exp:{" "}
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
                                    className="text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                                  >
                                    Mark handled
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </AlertGroup>
                </>
              )}
            </div>
          </section>

          {/* RIGHT: Inventory main */}
          <section className="lg:col-span-7 xl:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm font-bold text-slate-900">Current inventory</div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end md:w-auto">
                <input
                  className="h-10 w-full sm:w-80 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/20"
                  placeholder="Search items…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />

                <select
                  className="h-10 w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/20"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                >
                  <option value="all">All</option>
                  <option value="out">Out</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
              {loading ? (
                <div className="p-4 text-sm text-slate-700">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-sm text-slate-700">No items.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                      <th className="px-4 py-3 text-right">Min</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filtered.map((r) => {
                      const st = statusOf(r);
                      return (
                        <tr key={r.item_id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-semibold text-slate-900">{r.name}</td>
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

            {/* Mobile cards */}
            <div className="mt-6 space-y-3 md:hidden">
              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  No items.
                </div>
              ) : (
                filtered.slice(0, 8).map((r) => {
                  const st = statusOf(r);
                  return (
                    <div key={r.item_id} className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">{r.name}</div>
                          <div className="mt-1 text-xs text-slate-600">Category: {r.category}</div>
                        </div>
                        <Pill tone={st.tone}>{st.label}</Pill>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="text-xs text-slate-600">Stock</div>
                          <div className="font-semibold text-slate-900">{r.current_qty}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="text-xs text-slate-600">Min</div>
                          <div className="font-semibold text-slate-900">{r.low_stock_threshold}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 text-xs text-slate-600">
              Showing <span className="font-semibold text-slate-900">{filtered.length}</span> items.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/* =========================
   UI components only
========================= */

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-2 text-3xl font-bold text-[color:var(--brand)] leading-none">
        {value}
      </div>
      {sub ? <div className="mt-2 text-xs text-slate-600">{sub}</div> : null}
    </div>
  );
}

function SubNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/20"
    >
      {label}
    </Link>
  );
}

function AlertGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</div>
      {children}
    </div>
  );
}

function AlertRow({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-600">{subtitle}</div>
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}
