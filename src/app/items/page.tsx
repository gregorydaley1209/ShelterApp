"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import Navbar from "@/components/Navbar";


type Item = {
  id: string;
  name: string;
  category: string;
  unit: string;
  low_stock_threshold: number;
  active: boolean;
};

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [unit, setUnit] = useState("each");
  const [threshold, setThreshold] = useState(0);
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await supabase.from("items").select("*").order("name");
    setItems((data as any) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return setMsg("Not signed in.");

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) return setMsg("Missing profile.");
    if (profile.role !== "admin") return setMsg("Admins only.");

    const { error } = await supabase.from("items").insert({
      organization_id: profile.organization_id,
      name,
      category,
      unit,
      low_stock_threshold: threshold,
    });

    if (error) return setMsg(error.message);

    setName("");
    setCategory("Other");
    setUnit("each");
    setThreshold(0);
    setMsg("Item added.");
    load();
  }

return (
  <AuthGuard>
    <Navbar />
    <AdminGuard>
      <main className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Manage Items</h1>
          <a className="underline" href="/dashboard">Back</a>
        </div>

        <form className="border rounded p-4 space-y-3" onSubmit={addItem}>
          <h2 className="font-semibold">Add Item</h2>

          <input
            className="w-full border rounded p-2"
            placeholder="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="flex gap-2">
            <input
              className="w-full border rounded p-2"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <input
              className="w-full border rounded p-2"
              placeholder="Unit (each/box/lbs)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>

          <input
            className="w-full border rounded p-2"
            type="number"
            placeholder="Low-stock threshold"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value || "0", 10))}
          />

          <button className="border rounded px-3 py-2">Add</button>
          {msg && <p className="text-sm">{msg}</p>}
        </form>

        <div className="border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Unit</th>
                <th className="text-right p-2">Threshold</th>
                <th className="text-left p-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b">
                  <td className="p-2">{i.name}</td>
                  <td className="p-2">{i.category}</td>
                  <td className="p-2">{i.unit}</td>
                  <td className="p-2 text-right">{i.low_stock_threshold}</td>
                  <td className="p-2">{i.active ? "Yes" : "No"}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-3" colSpan={5}>
                    No items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </AdminGuard>
  </AuthGuard>
);


}
