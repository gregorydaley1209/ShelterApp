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

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_view")
      .select("*")
      .eq("active", true)
      .order("current_qty", { ascending: true });

    if (!error && data) setRows(data as any);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(s) || r.category.toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-4">
          <a className="underline" href="/log">Log Transaction</a>
          <a className="underline" href="/items">Manage Items</a>
          <a className="underline" href="/">Home</a>
        </div>
      </div>

      <input
        className="w-full border rounded p-2"
        placeholder="Search items or categories…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left p-2">Item</th>
                <th className="text-left p-2">Category</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-left p-2">Unit</th>
                <th className="text-right p-2">Low-stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const low = r.current_qty <= r.low_stock_threshold;
                return (
                  <tr key={r.item_id} className="border-b">
                    <td className="p-2 font-medium">
                      {r.name} {low ? <span className="text-red-600">(LOW)</span> : null}
                    </td>
                    <td className="p-2">{r.category}</td>
                    <td className="p-2 text-right">{r.current_qty}</td>
                    <td className="p-2">{r.unit}</td>
                    <td className="p-2 text-right">{r.low_stock_threshold}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td className="p-3" colSpan={5}>No items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
