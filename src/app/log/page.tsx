"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Item = { id: string; name: string; category: string; unit: string };

export default function LogTxn() {
  const [items, setItems] = useState<Item[]>([]);
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("items")
        .select("id,name,category,unit")
        .eq("active", true)
        .order("name");
      setItems((data as any) ?? []);
      if (data && data.length) setItemId((data as any)[0].id);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return setMsg("Not signed in.");

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (pErr || !profile) return setMsg("Missing profile/org setup.");

    const { error } = await supabase.from("transactions").insert({
      organization_id: profile.organization_id,
      item_id: itemId,
      type,
      quantity: qty,
      reason,
      notes,
      created_by: user.id,
    });

    if (error) return setMsg(error.message);

    setReason("");
    setNotes("");
    setQty(1);
    setMsg("Logged!");
  }

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Log Transaction</h1>
        <a className="underline" href="/dashboard">Back</a>
      </div>

      <form className="space-y-3" onSubmit={submit}>
        <div>
          <label className="text-sm">Type</label>
          <select
            className="w-full border rounded p-2"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            <option value="IN">IN (Donation)</option>
            <option value="OUT">OUT (Distribution)</option>
            <option value="ADJUST">ADJUST (Recount)</option>
          </select>
        </div>

        <div>
          <label className="text-sm">Item</label>
          <select
            className="w-full border rounded p-2"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} — {i.category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm">Quantity</label>
          <input
            className="w-full border rounded p-2"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value || "1", 10))}
          />
        </div>

        <div>
          <label className="text-sm">Reason (optional)</label>
          <input
            className="w-full border rounded p-2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Notes (optional)</label>
          <textarea
            className="w-full border rounded p-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button className="w-full border rounded p-2">Submit</button>
        {msg && <p className="text-sm">{msg}</p>}
      </form>
    </main>
  );
}
