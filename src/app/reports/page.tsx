"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

export default function ReportsPage() {
  const [range, setRange] = useState<"day" | "week" | "month" | "year">("month");
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => { load(); }, [range]);

  async function load() {
    setMsg("");
    // simple: pull transactions for the last N days and aggregate client-side
    const days = range === "day" ? 1 : range === "week" ? 7 : range === "month" ? 30 : 365;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from("transactions")
      .select("type, quantity, created_at, items(category)")
      .gte("created_at", since.toISOString());

    if (error) return setMsg(error.message);
    const txns = (data as any) ?? [];

    const byCategory: Record<string, { in: number; out: number }> = {};
    for (const t of txns) {
      const cat = t.items?.category ?? "Other";
      byCategory[cat] ||= { in: 0, out: 0 };
      if (t.type === "IN") byCategory[cat].in += t.quantity;
      if (t.type === "OUT") byCategory[cat].out += t.quantity;
    }

    const result = Object.entries(byCategory)
      .map(([category, v]) => ({ category, total_in: v.in, total_out: v.out }))
      .sort((a, b) => (b.total_out + b.total_in) - (a.total_out + a.total_in));

    setRows(result);
  }

  return (
    <AuthGuard>
      <Navbar />
      <main className="p-6 max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Reports</h1>

        <div className="flex gap-3 items-center">
          <span className="text-sm">Range:</span>
          <select className="border rounded p-2 text-sm" value={range} onChange={(e) => setRange(e.target.value as any)}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>

        {msg && <p className="text-sm text-red-600">{msg}</p>}

        <div className="border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left p-2">Category</th>
                <th className="text-right p-2">Total IN</th>
                <th className="text-right p-2">Total OUT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.category} className="border-b">
                  <td className="p-2">{r.category}</td>
                  <td className="p-2 text-right">{r.total_in}</td>
                  <td className="p-2 text-right">{r.total_out}</td>
                </tr>
              ))}
              {!rows.length && <tr><td className="p-3" colSpan={3}>No data.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </AuthGuard>
  );
}
