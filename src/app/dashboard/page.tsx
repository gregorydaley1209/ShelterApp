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

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "out" | "low">("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_view")
      .select("*")
      .eq("active", true);

    if (!error && data) setRows(data as any);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = rows;

    if (filter === "out") list = list.filter((r) => r.current_qty === 0);
    if (filter === "low")
      list = list.filter((r) => r.current_qty <= r.low_stock_threshold);

    if (s) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.category.toLowerCase().includes(s)
      );
    }

    // Sort: out -> low -> ok, then qty asc
    return [...list].sort((a, b) => {
      const aRank =
        a.current_qty === 0 ? 0 : a.current_qty <= a.low_stock_threshold ? 1 : 2;
      const bRank =
        b.current_qty === 0 ? 0 : b.current_qty <= b.low_stock_threshold ? 1 : 2;
      if (aRank !== bRank) return aRank - bRank;
      return a.current_qty - b.current_qty;
    });
  }, [rows, q, filter]);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white grid place-items-center font-bold">
              S
            </div>
            <div>
              <div className="text-sm text-slate-500">Shelter Inventory</div>
              <div className="text-base font-semibold text-slate-900">
                Dashboard
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/log"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Log IN/OUT
            </a>
            <a
              href="/items"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Manage Items
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Total items</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">
              {stats.total}
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Out of stock</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">
              {stats.out}
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Low stock</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">
              {stats.low}
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <div className="text-sm text-slate-500">OK</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">
              {stats.ok}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Priority */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">
                Priority alerts
              </div>
              <Pill tone="neutral">Keep short</Pill>
            </div>

            <div className="mt-3 space-y-4">
              {priority.out.length === 0 && priority.low.length === 0 ? (
                <div className="text-sm text-slate-600">
                  Nothing urgent right now 🎉
                </div>
              ) : (
                <>
                  {priority.out.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500">
                        OUT OF STOCK
                      </div>
                      <div className="mt-2 space-y-2">
                        {priority.out.map((r) => (
                          <div
                            key={r.item_id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-900">
                                {r.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {r.category}
                              </div>
                            </div>
                            <Pill tone="danger">0</Pill>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {priority.low.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500">
                        LOW STOCK
                      </div>
                      <div className="mt-2 space-y-2">
                        {priority.low.map((r) => (
                          <div
                            key={r.item_id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-900">
                                {r.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {r.category}
                              </div>
                            </div>
                            <Pill tone="warn">
                              {r.current_qty}/{r.low_stock_threshold}
                            </Pill>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-4 text-xs text-slate-500">
              What needs attention today. Not a data dump.
            </div>
          </div>

          {/* Inventory */}
          <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">
                Current inventory
              </div>
              <div className="flex gap-2">
                {(["all", "out", "low"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={clsx(
                      "rounded-full px-3 py-1 text-sm font-semibold border",
                      filter === k
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {k === "all" ? "All" : k === "out" ? "Out" : "Low"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Search item or category…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              {loading ? (
                <div className="p-4 text-sm text-slate-600">Loading…</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Item</th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Category
                      </th>
                      <th className="text-right px-4 py-3 font-semibold">
                        Stock
                      </th>
                      <th className="text-right px-4 py-3 font-semibold">Min</th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filtered.map((r) => {
                      const st = statusOf(r);
                      return (
                        <tr key={r.item_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">
                              {r.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              Unit: {r.unit}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {r.category}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {r.current_qty}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {r.low_stock_threshold}
                          </td>
                          <td className="px-4 py-3">
                            <Pill
                              tone={
                                st.tone === "danger"
                                  ? "danger"
                                  : st.tone === "warn"
                                  ? "warn"
                                  : "ok"
                              }
                            >
                              {st.label}
                            </Pill>
                          </td>
                        </tr>
                      );
                    })}

                    {filtered.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-sm text-slate-600"
                        >
                          No items match your search/filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Tip: “Log IN/OUT” should be the main action. Everything else is
              secondary.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
