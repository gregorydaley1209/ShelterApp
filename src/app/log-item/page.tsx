"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { getMyProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

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
      ? "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20"
      : tone === "error"
      ? "bg-red-500/10 text-red-700 ring-red-600/20"
      : "bg-slate-500/10 text-slate-700 ring-slate-600/20";
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
      if (!p) window.location.href = "/login";

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
        (i) => i.name.toLowerCase().includes(s) || i.category.toLowerCase().includes(s)
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
      ? "border-emerald-600/20 bg-emerald-500/10 text-emerald-800"
      : msgTone === "error"
      ? "border-red-600/20 bg-red-500/10 text-red-800"
      : "border-slate-300 bg-slate-50 text-slate-700";

  // avoid showing empty dropdown if there are 0 items
  const showItemPicker =
    !selectedItem && (items.length > 0 || itemSearch.trim().length > 0);

  const subtitle =
    type === "IN"
      ? "Record a donation or incoming stock."
      : type === "OUT"
      ? "Record a distribution or usage."
      : "Record an adjustment after a recount.";

  return (
    <AuthGuard>
      <main
        className="min-h-screen bg-white"
        style={
          {
            ["--brand" as any]: "#5883A8",
            ["--brandDark" as any]: "#40556A",
            ["--brandSoft" as any]: "#EAF2F8",
            ["--brandBorder" as any]: "#B7C9D7",
            ["--brandRing" as any]: "#5883A8",
          } as React.CSSProperties
        }
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[color:var(--brand)] focus:text-white focus:px-4 focus:py-2 focus:rounded focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]"
        >
          Skip to content
        </a>

        {/* Header (matches PublicDashboardPage vibe) */}
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2 rounded"
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
              <span className="text-lg font-semibold text-slate-900">ShelterStock</span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                Back
              </Link>
            </div>
          </div>
        </header>

        {/* Hero-like top section */}
        <section
          id="main-content"
          className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />

          <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
                <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
                Inventory • Logging
              </div>

              <h1 className="mt-6 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
                Log an item
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                {subtitle} Keep entries consistent so your team can move fast.
              </p>

              {/* Main card */}
              <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <form className="space-y-5" onSubmit={submit}>
                  {/* Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Type</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
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
                      <label className="text-sm font-semibold text-slate-900">Item</label>
                      {selectedItem && (
                        <button
                          type="button"
                          onClick={clearItem}
                          className="text-xs font-semibold underline text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
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
                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        {filteredItems.length === 0 ? (
                          <div className="p-4 text-sm text-slate-600">No matches.</div>
                        ) : (
                          <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                            {filteredItems.map((i) => (
                              <li key={i.id}>
                                <button
                                  type="button"
                                  onClick={() => chooseItem(i)}
                                  className="w-full text-left px-4 py-3 transition hover:bg-slate-50"
                                >
                                  <div className="text-sm font-semibold text-slate-900">
                                    {i.name}
                                  </div>
                                  <div className="text-xs text-slate-600">
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
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-sm font-semibold text-slate-900">
                          {selectedItem.name}
                        </div>
                        <Pill tone="ok">Selected</Pill>
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">
                      Location <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
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

                  {/* Expiration */}
                  {type === "IN" && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">
                        Expiration date{" "}
                        <span className="font-normal text-slate-500">(optional)</span>
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Quantity</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                      placeholder="Enter quantity…"
                      value={qty}
                      onChange={(e) =>
                        setQty(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">
                      Reason <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g., pantry restock"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">
                      Notes <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <textarea
                      rows={4}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anything your team should know…"
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="group w-full inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                  >
                    Submit
                    <svg
                      className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>

                  {msg && (
                    <div className={clsx("rounded-xl border p-4 text-sm", msgBoxCls)}>
                      {msg}
                    </div>
                  )}
                </form>
              </div>

              {/* Tip card */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
                  Tip
                </p>
                <p className="mt-2 leading-relaxed">
                  Start with a clear item + quantity. Location and notes are optional, but helpful
                  for audits.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}
