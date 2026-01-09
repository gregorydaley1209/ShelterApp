"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { getMyProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

type Item = { id: string; name: string; category: string; unit: string };
type Location = { id: string; name: string };

function clsx(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

function Pill({
  tone,
  children,
}: {
  tone: "ok" | "error" | "neutral";
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset";
  const toneCls =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : tone === "error"
      ? "bg-red-50 text-red-700 ring-red-200"
      : "bg-slate-50 text-slate-700 ring-slate-200";
  return <span className={clsx(base, toneCls)}>{children}</span>;
}

export default function LogTxn() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN");

  // Item tap-to-search
  const [itemSearch, setItemSearch] = useState("");
  const [itemId, setItemId] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Location dropdown
  const [locationId, setLocationId] = useState<string>("");

  const [qty, setQty] = useState<number | "">("");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "error" | "neutral">("neutral");

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

      const locRes = await supabase.from("locations").select("id,name").order("name");

      setLocations((locRes.data as any) ?? []);
    })();
  }, []);

  const filteredItems = useMemo(() => {
    const s = itemSearch.trim().toLowerCase();
    if (!s) return items.slice(0, 12);
    return items
      .filter(
        (i) =>
          i.name.toLowerCase().includes(s) ||
          i.category.toLowerCase().includes(s)
      )
      .slice(0, 20);
  }, [items, itemSearch]);

  function chooseItem(i: Item) {
    setItemId(i.id);
    setSelectedItem(i);
    setItemSearch(i.name);
  }

  function clearItem() {
    setItemId("");
    setSelectedItem(null);
    setItemSearch("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setMsgTone("neutral");

    const p = await getMyProfile();
    if (!p) {
      setMsgTone("error");
      setMsg("Missing profile/org setup.");
      return;
    }

    if (!itemId) {
      setMsgTone("error");
      setMsg("Please pick an item.");
      return;
    }

    if (qty === "" || qty <= 0) {
      setMsgTone("error");
      setMsg("Quantity must be greater than 0.");
      return;
    }

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
    if (error) {
      setMsgTone("error");
      setMsg(error.message);
      return;
    }

    // Success + clear all
    setMsgTone("ok");
    setMsg("✓ Logged!");

    setType("IN");
    clearItem();
    setLocationId("");
    setExpirationDate("");
    setQty("");
    setReason("");
    setNotes("");
  }

  const msgBoxCls =
    msgTone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : msgTone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-slate-200 bg-slate-50 text-slate-700";

  // Mobile: avoid showing an empty dropdown box when there are 0 items in the system.
  const showItemPicker = !selectedItem && (items.length > 0 || itemSearch.trim().length > 0);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-50">
        {/* Compact sticky header (better on phones) */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">Dashboard</div>
              <div className="truncate text-lg font-bold text-slate-900">Log item</div>
            </div>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Back
            </a>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <form className="space-y-4" onSubmit={submit}>
              {/* Type */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Type</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-200"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                >
                  <option value="IN">IN (Donation)</option>
                  <option value="OUT">OUT (Distribution)</option>
                  <option value="ADJUST">ADJUST (Recount + Add stock)</option>
                </select>
              </div>

              {/* Item search */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Item</label>
                  {selectedItem && (
                    <button
                      type="button"
                      onClick={clearItem}
                      className="text-xs font-semibold underline text-slate-700"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-200"
                  placeholder="Search items…"
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    if (selectedItem && e.target.value !== selectedItem.name) {
                      setSelectedItem(null);
                      setItemId("");
                    }
                  }}
                />

                {showItemPicker && !selectedItem && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                      <div className="p-3 text-sm text-slate-600">No matches.</div>
                    ) : (
                      <ul className="divide-y">
                        {filteredItems.map((i) => (
                          <li key={i.id}>
                            <button
                              type="button"
                              onClick={() => chooseItem(i)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50"
                            >
                              <div className="text-sm font-semibold text-slate-900">
                                {i.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {i.category}
                                {i.unit ? ` • Unit: ${i.unit}` : ""}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {selectedItem && (
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-sm font-semibold text-slate-900">
                      {selectedItem.name}
                    </div>
                    <Pill tone="ok">Selected</Pill>
                  </div>
                )}
              </div>

              {/* Location dropdown */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Location{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-200"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                >
                  <option value="">No location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {type === "IN" && (
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">
                    Expiration date{" "}
                    <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-200"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Quantity</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter quantity…"
                  value={qty}
                  onChange={(e) =>
                    setQty(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Reason{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-200"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Notes{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-200"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Submit
              </button>

              {msg && (
                <div className={clsx("rounded-xl border p-3 text-sm", msgBoxCls)}>
                  {msg}
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
