// FILE: src/app/admin/inventory/reports/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabaseClient";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

type InventoryOption = {
  item_id: string;
  name: string;
  category: string;
  current_qty: number;
  active?: boolean;
  organization_id?: string;
};

type SummaryRow = {
  category: string;
  item: string;
  total_in: number;
  total_out: number;
};

type TrendAgg = {
  day: string; // YYYY-MM-DD
  total_in: number;
  total_out: number;
  net: number; // in - out
};

function clsx(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold text-slate-700 rounded-full px-2.5 py-1 bg-slate-50 border border-slate-200">
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

function toDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDayKeys(days: number) {
  // Includes today; returns oldest -> newest
  const keys: string[] = [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const cur = new Date(start);
  while (cur <= end) {
    keys.push(toDayKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

function dayKeyToSinceISO(dayKey: string) {
  // local midnight for that date -> ISO
  const [y, m, d] = dayKey.split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  return dt.toISOString();
}

function prettyRangeLabel(r: "day" | "week" | "month" | "year") {
  return r === "day" ? "Day" : r === "week" ? "Week" : r === "month" ? "Month" : "Year";
}

export default function ReportsPage() {
  const year = new Date().getFullYear();

  const [range, setRange] = useState<"day" | "week" | "month" | "year">("month");

  // Totals table (IN/OUT) per item
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Item options + current quantities
  const [items, setItems] = useState<InventoryOption[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  // Trend controls
  const [selectedItemId, setSelectedItemId] = useState<string>("all");

  // Trend results
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendMsg, setTrendMsg] = useState("");
  const [trendDaily, setTrendDaily] = useState<TrendAgg[]>([]);

  const [shelterName, setShelterName] = useState("Shelter");
  const [orgId, setOrgId] = useState<string>("");

  useEffect(() => {
    const id = localStorage.getItem("selected_org_id");
    const n = localStorage.getItem("selected_org_name");
    if (!id) {
      window.location.href = "/select-shelter";
      return;
    }
    setOrgId(String(id));
    if (n) setShelterName(n);
  }, []);

  const days = useMemo(() => {
    return range === "day" ? 1 : range === "week" ? 7 : range === "month" ? 30 : 365;
  }, [range]);

  const dayKeys = useMemo(() => buildDayKeys(days), [days]);

  const sinceISO = useMemo(() => {
    // Use the oldest dayKey at local midnight for a clean “range”
    if (!dayKeys.length) return new Date().toISOString();
    return dayKeyToSinceISO(dayKeys[0]);
  }, [dayKeys]);

  useEffect(() => {
    if (!orgId) return;

    // Load inventory_view options once (active items + current_qty)
    (async () => {
      setItemsLoading(true);

      const { data, error } = await supabase
        .from("inventory_view")
        .select("item_id,name,category,current_qty,active,organization_id")
        .eq("active", true)
        .eq("organization_id", orgId);

      if (error) {
        setItems([]);
        setItemsLoading(false);
        return;
      }

      const raw = (data as any[]) ?? [];
      const unique: Record<string, InventoryOption> = {};

      for (const r of raw) {
        const id = String(r.item_id ?? "");
        if (!id) continue;
        unique[id] = {
          item_id: id,
          name: String(r.name ?? "Unknown"),
          category: String(r.category ?? "Other"),
          current_qty: Number(r.current_qty ?? 0) || 0,
          active: Boolean(r.active),
          organization_id: String(r.organization_id ?? ""),
        };
      }

      const list = Object.values(unique).sort((a, b) => {
        const c = a.category.localeCompare(b.category);
        if (c !== 0) return c;
        return a.name.localeCompare(b.name);
      });

      setItems(list);
      setItemsLoading(false);
    })();
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, range, sinceISO]);

  useEffect(() => {
    if (!orgId) return;
    loadTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, range, selectedItemId, itemsLoading, sinceISO]);

  async function loadSummary() {
    setMsg("");
    setLoading(true);

    const { data, error } = await supabase
      .from("transactions")
      .select("type, quantity, item_id, items(name, category), organization_id, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", sinceISO);

    if (error) {
      setMsg(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const txns = (data as any[]) ?? [];

    const map: Record<string, SummaryRow> = {};
    let grandIn = 0;
    let grandOut = 0;

    for (const t of txns) {
      const itemName = t.items?.name ?? "Unknown";
      const category = t.items?.category ?? "Other";
      const key = `${category}||${itemName}`;
      const qty = Number(t.quantity ?? 0) || 0;

      if (!map[key]) {
        map[key] = { category, item: itemName, total_in: 0, total_out: 0 };
      }

      // Treat ADJUST as IN (because your UI says “Recount + Add stock”)
      if (t.type === "IN" || t.type === "ADJUST") {
        map[key].total_in += qty;
        grandIn += qty;
      }
      if (t.type === "OUT") {
        map[key].total_out += qty;
        grandOut += qty;
      }
    }

    const result = Object.values(map).sort((a, b) => {
      const c = a.category.localeCompare(b.category);
      if (c !== 0) return c;
      return a.item.localeCompare(b.item);
    });

    result.push({
      category: "—",
      item: "Total",
      total_in: grandIn,
      total_out: grandOut,
    });

    setRows(result);
    setLoading(false);
  }

  function getCurrentQtyForSelection() {
    if (selectedItemId === "all") {
      return items.reduce((sum, it) => sum + (Number(it.current_qty) || 0), 0);
    }
    const found = items.find((i) => i.item_id === selectedItemId);
    return Number(found?.current_qty ?? 0) || 0;
  }

  async function loadTrends() {
    if (itemsLoading) return;

    setTrendMsg("");
    setTrendLoading(true);

    let q = supabase
      .from("transactions")
      .select("type, quantity, created_at, item_id, organization_id")
      .eq("organization_id", orgId)
      .gte("created_at", sinceISO);

    if (selectedItemId !== "all") q = q.eq("item_id", selectedItemId);

    const { data, error } = await q;

    if (error) {
      setTrendMsg(error.message);
      setTrendDaily([]);
      setTrendLoading(false);
      return;
    }

    const txns = (data as any[]) ?? [];

    // bucket per day
    const byDay: Record<string, { in: number; out: number }> = {};
    for (const k of dayKeys) byDay[k] = { in: 0, out: 0 };

    for (const t of txns) {
      const dt = new Date(t.created_at);
      if (Number.isNaN(dt.getTime())) continue;
      const k = toDayKey(dt);
      if (!byDay[k]) continue;

      const qty = Number(t.quantity ?? 0) || 0;
      if (t.type === "IN" || t.type === "ADJUST") byDay[k].in += qty;
      if (t.type === "OUT") byDay[k].out += qty;
    }

    const daily: TrendAgg[] = dayKeys.map((k) => {
      const v = byDay[k] || { in: 0, out: 0 };
      return {
        day: k,
        total_in: v.in,
        total_out: v.out,
        net: v.in - v.out,
      };
    });

    setTrendDaily(daily);
    setTrendLoading(false);
  }

  // ✅ One-click "Save as PDF" (opens print dialog; user selects "Save as PDF")
  function saveAsPDF() {
    window.print();
  }

  const selectedLabel = useMemo(() => {
    if (selectedItemId === "all") return "All items";
    const found = items.find((i) => i.item_id === selectedItemId);
    if (!found) return "Selected item";
    return `${found.name} (${found.category})`;
  }, [selectedItemId, items]);

  // Chart data (reconstructed on-hand)
  const chartData = useMemo(() => {
    const currentQty = getCurrentQtyForSelection();
    if (!trendDaily.length) return [];

    const n = trendDaily.length;
    const onHand: number[] = new Array(n).fill(0);

    // today on-hand = currentQty
    onHand[n - 1] = currentQty;

    // walk backwards
    for (let i = n - 2; i >= 0; i--) {
      onHand[i] = onHand[i + 1] - (Number(trendDaily[i + 1]?.net) || 0);
    }

    return trendDaily.map((d, idx) => ({
      day: d.day,
      on_hand: onHand[idx],
      net_change: d.net,
      in: d.total_in,
      out: d.total_out,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendDaily, selectedItemId, items]);

  const trendSummary = useMemo(() => {
    const currentQty = getCurrentQtyForSelection();
    const totalIn = trendDaily.reduce((s, d) => s + (Number(d.total_in) || 0), 0);
    const totalOut = trendDaily.reduce((s, d) => s + (Number(d.total_out) || 0), 0);
    const net = totalIn - totalOut;
    return { currentQty, totalIn, totalOut, net };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendDaily, selectedItemId, items]);

  const totalRow = rows.length ? rows[rows.length - 1] : null;

  return (
    <AuthGuard>
      <AdminGuard>
        <main
          id="top"
          className="min-h-screen bg-white"
          style={
            {
              // Brand system (same basis as Wishlist/Items/Locations)
              ["--brand" as any]: "#5883A8",
              ["--brandDark" as any]: "#40556A",
              ["--brandSoft" as any]: "#EAF2F8",
              ["--brandBorder" as any]: "#B7C9D7",
              ["--brandRing" as any]: "#5883A8",
            } as React.CSSProperties
          }
        >
          {/* Print styles for cleaner PDF */}
          <style jsx global>{`
            @media print {
              .print-hide {
                display: none !important;
              }
              .print-avoid-break {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              body {
                background: white !important;
              }
              svg,
              canvas {
                max-width: 100% !important;
              }
            }
          `}</style>

          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[color:var(--brand)] focus:text-white focus:px-4 focus:py-2 focus:rounded focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]"
          >
            Skip to content
          </a>

          {/* Background wash */}
          <div className="pointer-events-none fixed inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-slate-50 via-transparent to-transparent" />
          </div>

          {/* ===== HEADER (Wishlist-basis) ===== */}
          <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm print-hide">
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
                      Reports
                    </span>
                  </span>
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveAsPDF}
                  className="hidden sm:inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                  title="Opens print dialog — choose Save as PDF"
                >
                  Save as PDF
                </button>

                <span className="hidden md:inline text-sm font-semibold text-slate-600">
                  Range
                </span>
                <select
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                  value={range}
                  onChange={(e) => setRange(e.target.value as any)}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>

                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                >
                  Admin
                </Link>
              </div>
            </div>
          </header>

          {/* ===== HERO STRIP (Wishlist-basis) ===== */}
          <section
            id="main-content"
            className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white"
          >
            <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-16">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
                <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
                Inventory • Reports
              </div>

              <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Inventory reports
              </h1>

              <p className="mt-3 max-w-2xl text-lg text-slate-600 leading-relaxed">
                Track IN/OUT activity and visualize on-hand trends over time. Use{" "}
                <span className="font-semibold text-slate-900">Save as PDF</span> for quick exports.
              </p>

              {/* Main card container */}
              <div className="mt-10 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="p-6 sm:p-8 space-y-10">
                  {/* Quick stats */}
                  <div className="print-avoid-break">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-slate-600">At a glance</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">Quick stats</div>
                      </div>
                      <Badge>{prettyRangeLabel(range)}</Badge>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-4">
                      <StatCard label="Range" value={prettyRangeLabel(range)} />
                      <StatCard
                        label="Total IN"
                        value={totalRow?.item === "Total" ? totalRow.total_in : "—"}
                        sub="Includes ADJUST"
                      />
                      <StatCard
                        label="Total OUT"
                        value={totalRow?.item === "Total" ? totalRow.total_out : "—"}
                      />
                      <StatCard
                        label="Net"
                        value={
                          totalRow?.item === "Total"
                            ? totalRow.total_in - totalRow.total_out
                            : "—"
                        }
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-200" />

                  {/* Totals by item */}
                  <div className="print-avoid-break">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-slate-600">Inventory activity summary</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">Totals by item</div>
                        <div className="mt-1 text-sm text-slate-600">
                          Totals are based on logged transactions in this range.
                        </div>
                      </div>
                      <Badge>{range}</Badge>
                    </div>

                    {msg && (
                      <div className="mt-4 rounded-xl border border-red-600/20 bg-red-500/10 px-4 py-3 text-sm text-red-800">
                        {msg}
                      </div>
                    )}

                    {loading ? (
                      <div className="mt-6 text-sm text-slate-600">Loading…</div>
                    ) : (
                      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr className="text-left text-slate-600">
                                <th className="px-4 py-3 font-semibold">Category</th>
                                <th className="px-4 py-3 font-semibold">Item</th>
                                <th className="px-4 py-3 font-semibold text-right">Total IN</th>
                                <th className="px-4 py-3 font-semibold text-right">Total OUT</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {rows.map((r, i) => (
                                <tr
                                  key={`${r.category}-${r.item}-${i}`}
                                  className={
                                    r.item === "Total"
                                      ? "bg-slate-50 font-semibold"
                                      : "hover:bg-slate-50"
                                  }
                                >
                                  <td className="px-4 py-3 text-slate-700">{r.category}</td>
                                  <td className="px-4 py-3 text-slate-900">{r.item}</td>
                                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                                    {r.total_in}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                                    {r.total_out}
                                  </td>
                                </tr>
                              ))}
                              {!rows.length && (
                                <tr>
                                  <td colSpan={4} className="px-4 py-4 text-slate-600">
                                    No data.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200" />

                  {/* Quantity trends */}
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-slate-600">Easy trend view</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">Quantity trends</div>
                        <div className="mt-1 text-sm text-slate-600">
                          Pick an item to see reconstructed on-hand quantity over time.
                        </div>
                      </div>
                      <Badge>{range}</Badge>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 print-hide">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-700">Item</div>
                        <select
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[color:var(--brandBorder)] focus:ring-4 focus:ring-[color:var(--brand)]/10"
                          value={selectedItemId}
                          onChange={(e) => setSelectedItemId(e.target.value)}
                          disabled={itemsLoading}
                        >
                          <option value="all">All items (combined)</option>
                          {items.map((it) => (
                            <option key={it.item_id} value={it.item_id}>
                              {it.category} — {it.name}
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-slate-500">
                          Showing:{" "}
                          <span className="font-semibold text-slate-900">{selectedLabel}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-700">How it works</div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                          Uses selected range&apos;s{" "}
                          <span className="font-semibold">current on-hand</span> from inventory +
                          transaction history to reconstruct previous days.
                          <div className="mt-1 text-xs text-slate-500">ADJUST counts as IN.</div>
                        </div>
                      </div>
                    </div>

                    {trendMsg && (
                      <div className="mt-4 rounded-xl border border-red-600/20 bg-red-500/10 px-4 py-3 text-sm text-red-800">
                        {trendMsg}
                      </div>
                    )}

                    {trendLoading ? (
                      <div className="mt-6 text-sm text-slate-600">Loading…</div>
                    ) : (
                      <>
                        <div className="mt-6 grid gap-3 sm:grid-cols-4 print-avoid-break">
                          <StatCard
                            label="Current on-hand"
                            value={trendSummary.currentQty}
                          />
                          <StatCard
                            label="Net change (range)"
                            value={trendSummary.net}
                          />
                          <StatCard
                            label="Total added (IN)"
                            value={trendSummary.totalIn}
                          />
                          <StatCard
                            label="Total used (OUT)"
                            value={trendSummary.totalOut}
                          />
                        </div>

                        <div className="mt-8 grid gap-6 lg:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 p-5 print-avoid-break">
                            <div className="text-sm font-semibold text-slate-900">
                              On-hand quantity over time
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              This line shows how much you likely had each day.
                            </div>

                            <div className="mt-4 h-72 w-full">
                              {chartData.length ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                      type="monotone"
                                      dataKey="on_hand"
                                      name="On-hand"
                                      strokeWidth={2}
                                      dot={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="h-full grid place-items-center text-sm text-slate-600">
                                  No trend data to graph.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 p-5 print-avoid-break">
                            <div className="text-sm font-semibold text-slate-900">
                              Daily change (IN − OUT)
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Positive bars = restock days. Negative bars = usage days.
                            </div>

                            <div className="mt-4 h-72 w-full">
                              {chartData.length ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="net_change" name="Daily Change" />
                                  </BarChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="h-full grid place-items-center text-sm text-slate-600">
                                  No trend data to graph.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 print-avoid-break">
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-slate-50">
                                <tr className="text-left text-slate-600">
                                  <th className="px-4 py-3 font-semibold">Day</th>
                                  <th className="px-4 py-3 font-semibold text-right">On-hand</th>
                                  <th className="px-4 py-3 font-semibold text-right">Daily change</th>
                                  <th className="px-4 py-3 font-semibold text-right">IN</th>
                                  <th className="px-4 py-3 font-semibold text-right">OUT</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {chartData.map((r, i) => (
                                  <tr key={`${r.day}-${i}`} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-slate-700">{r.day}</td>
                                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                                      {r.on_hand}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                                      {r.net_change}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                                      {r.in}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                                      {r.out}
                                    </td>
                                  </tr>
                                ))}
                                {!chartData.length && (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-4 text-slate-600">
                                      No data.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-6 text-sm text-slate-500">
                Note: Reports reflect logged transactions. If something looks off, check recent
                activity or run a recount on the affected item.
              </p>
            </div>
          </section>

          {/* ===== FOOTER (Wishlist-basis) ===== */}
          <footer className="border-t border-slate-200 bg-white print-hide">
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
                <p className="text-sm text-slate-500">Clarity for daily operations</p>
              </div>
            </div>
          </footer>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}
