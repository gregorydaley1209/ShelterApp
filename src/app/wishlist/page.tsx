"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

type InventoryRow = {
  item_id: string;
  name: string;
  category: string;
  unit: string;
  low_stock_threshold: number;
  current_qty: number;
};

export default function WishlistPage() {
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [days, setDays] = useState(14);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("inventory_view").select("*").eq("active", true);
      setInventory((data as any) ?? []);
    })();
  }, []);

  const text = useMemo(() => {
    const low = inventory
      .filter((r) => r.current_qty === 0 || r.current_qty <= r.low_stock_threshold)
      .sort((a, b) => a.current_qty - b.current_qty)
      .slice(0, 15);

    const lines = low.map((r) => `${r.name} (${r.unit})`);
    return lines.join("\n");
  }, [inventory]);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setMsg("Copied!");
    setTimeout(() => setMsg(""), 1500);
  }

  return (
    <AuthGuard>
      <Navbar />
      <main className="p-6 max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Donor Wishlist Generator</h1>

        <p className="text-sm opacity-80">
          This is a clean copy/paste list based on low/out-of-stock items.
          (We’ll add “fast-moving” + “expiring” weighting next.)
        </p>

        <div className="border rounded p-4 space-y-3">
          <div className="font-semibold">Wishlist Text</div>
          <textarea className="w-full border rounded p-2 h-64" value={text} readOnly />
          <div className="flex gap-3 items-center">
            <button className="border rounded px-3 py-2" onClick={copy}>Copy</button>
            {msg && <span className="text-sm">{msg}</span>}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
