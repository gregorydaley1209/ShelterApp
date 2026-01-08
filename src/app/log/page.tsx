"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { getMyProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

type Item = { id: string; name: string; category: string; unit: string };
type Location = { id: string; name: string };

export default function LogTxn() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [qty, setQty] = useState<number>(1);
  const [locationId, setLocationId] = useState<string>("");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const p = await getMyProfile();
      if (!p) window.location.href = "/onboarding";

      const itemsRes = await supabase
        .from("items")
        .select("id,name,category,unit")
        .eq("active", true)
        .order("name");

      setItems((itemsRes.data as any) ?? []);
      if (itemsRes.data && itemsRes.data.length) setItemId((itemsRes.data as any)[0].id);

      const locRes = await supabase
        .from("locations")
        .select("id,name")
        .order("name");

      setLocations((locRes.data as any) ?? []);
      if (locRes.data && locRes.data.length) setLocationId((locRes.data as any)[0].id);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const p = await getMyProfile();
    if (!p) return setMsg("Missing profile/org setup.");

    const payload: any = {
      organization_id: p.organization_id,
      item_id: itemId,
      type,
      quantity: qty,
      reason,
      notes,
      created_by: p.id,
      location_id: locationId || null,
      expiration_date: type === "IN" && expirationDate ? expirationDate : null,
    };

    const { error } = await supabase.from("transactions").insert(payload);
    if (error) return setMsg(error.message);

    setReason("");
    setNotes("");
    setQty(1);
    setExpirationDate("");
    setMsg("Logged!");
  }

  return (
    <AuthGuard>
      <Navbar />
      <main className="p-6 max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Log Transaction</h1>

        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="text-sm">Type</label>
            <select className="w-full border rounded p-2" value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="IN">IN (Donation)</option>
              <option value="OUT">OUT (Distribution)</option>
              <option value="ADJUST">ADJUST (Recount + Add stock)</option>
            </select>
          </div>

          <div>
            <label className="text-sm">Item</label>
            <select className="w-full border rounded p-2" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} — {i.category}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm">Location (optional)</label>
            <select className="w-full border rounded p-2" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">No location</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {type === "IN" && (
            <div>
              <label className="text-sm">Expiration date (optional)</label>
              <input className="w-full border rounded p-2" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
              <p className="text-xs opacity-70">If provided, this donation becomes a “lot” and will be used for expiring alerts.</p>
            </div>
          )}

          <div>
            <label className="text-sm">Quantity</label>
            <input className="w-full border rounded p-2" type="number" min={1} value={qty}
              onChange={(e) => setQty(parseInt(e.target.value || "1", 10))} />
          </div>

          <div>
            <label className="text-sm">Reason (optional)</label>
            <input className="w-full border rounded p-2" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div>
            <label className="text-sm">Notes (optional)</label>
            <textarea className="w-full border rounded p-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <button className="w-full border rounded p-2">Submit</button>
          {msg && <p className="text-sm">{msg}</p>}
        </form>
      </main>
    </AuthGuard>
  );
}
