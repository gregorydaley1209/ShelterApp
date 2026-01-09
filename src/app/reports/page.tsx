"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
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
    <span className="text-xs font-semibold text-slate-600 rounded-full px-2 py-1 bg-slate-50 border border-slate-200">
      {children}
    </span>
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

  function goBack() {
    window.location.href = "/admin";
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
      <main className="min-h-screen bg-slate-50">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={goBack}
                className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 grid place-items-center shrink-0"
                type="button"
                aria-label="Back"
                title="Back"
              >
                <span className="text-lg leading-none">←</span>
              </button>

              <div className="min-w-0">
                <div className="text-sm text-slate-500 truncate">{shelterName}</div>
                <div className="text-base font-semibold text-slate-900">Reports</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm font-semibold text-slate-600">
                Range
              </span>
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold bg-white"
                value={range}
                onChange={(e) => setRange(e.target.value as any)}
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          {/* Quick stats row */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Range</div>
              <div className="mt-1 text-xl font-bold text-slate-900">
                {prettyRangeLabel(range)}
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Total IN</div>
              <div className="mt-1 text-xl font-bold text-slate-900">
                {totalRow?.item === "Total" ? totalRow.total_in : "—"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Includes ADJUST
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Total OUT</div>
              <div className="mt-1 text-xl font-bold text-slate-900">
                {totalRow?.item === "Total" ? totalRow.total_out : "—"}
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Net</div>
              <div className="mt-1 text-xl font-bold text-slate-900">
                {totalRow?.item === "Total"
                  ? totalRow.total_in - totalRow.total_out
                  : "—"}
              </div>
            </div>
          </div>

          {/* Totals by item */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Inventory activity summary</div>
                <div className="mt-1 text-xl font-bold text-slate-900">Totals by Item</div>
                <div className="mt-1 text-sm text-slate-600">
                  Totals are based on logged transactions in this range.
                </div>
              </div>
              <Badge>{range}</Badge>
            </div>

            {msg && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                              ? "bg-slate-100 font-semibold"
                              : "hover:bg-slate-50"
                          }
                        >
                          <td className="px-4 py-3">{r.category}</td>
                          <td className="px-4 py-3">{r.item}</td>
                          <td className="px-4 py-3 text-right">{r.total_in}</td>
                          <td className="px-4 py-3 text-right">{r.total_out}</td>
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

          {/* Quantity trends */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Easy trend view</div>
                <div className="mt-1 text-xl font-bold text-slate-900">Quantity Trends</div>
                <div className="mt-1 text-sm text-slate-600">
                  Pick an item to see reconstructed on-hand quantity over time.
                </div>
              </div>
              <Badge>{range}</Badge>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-600">Item</div>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold bg-white"
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
                <div className="text-sm font-semibold text-slate-600">How it works</div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  Uses selected range's <span className="font-semibold">current on-hand</span> from
                  inventory + the transaction history to reconstruct previous days.
                  <div className="mt-1 text-xs text-slate-500">
                    ADJUST counts as IN.
                  </div>
                </div>
              </div>
            </div>

            {trendMsg && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {trendMsg}
              </div>
            )}

            {trendLoading ? (
              <div className="mt-6 text-sm text-slate-600">Loading…</div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="mt-6 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">Current on-hand</div>
                    <div className="mt-1 text-xl font-bold text-slate-900">
                      {trendSummary.currentQty}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">Net change (range)</div>
                    <div className="mt-1 text-xl font-bold text-slate-900">
                      {trendSummary.net}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">Total added (IN)</div>
                    <div className="mt-1 text-xl font-bold text-slate-900">
                      {trendSummary.totalIn}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">Total used (OUT)</div>
                    <div className="mt-1 text-xl font-bold text-slate-900">
                      {trendSummary.totalOut}
                    </div>
                  </div>
                </div>

                {/* On-hand chart */}
                <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-700 mb-1">
                    On-hand quantity over time
                  </div>
                  <div className="text-xs text-slate-500 mb-3">
                    This line shows how much you likely had each day.
                  </div>

                  <div className="h-72 w-full">
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

                {/* Net change chart */}
                <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-700 mb-1">
                    Daily change (IN − OUT)
                  </div>
                  <div className="text-xs text-slate-500 mb-3">
                    Positive bars = restock days. Negative bars = usage days.
                  </div>

                  <div className="h-72 w-full">
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

                {/* Detail table */}
                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
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
                            <td className="px-4 py-3">{r.day}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                              {r.on_hand}
                            </td>
                            <td className="px-4 py-3 text-right">{r.net_change}</td>
                            <td className="px-4 py-3 text-right">{r.in}</td>
                            <td className="px-4 py-3 text-right">{r.out}</td>
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
      </main>
    </AuthGuard>
  );
}
