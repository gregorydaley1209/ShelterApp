"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

type InventoryRow = {
  item_id: string;
  name: string;
  category: string;
  unit: string;
  low_stock_threshold: number;
  current_qty: number;
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

function reasonForRow(r: InventoryRow) {
  if (r.current_qty === 0) return "Out of stock";
  if (r.current_qty <= r.low_stock_threshold) return "Low stock";
  return "—";
}

function severityForRow(r: InventoryRow) {
  if (r.current_qty === 0) return "danger";
  if (r.current_qty <= r.low_stock_threshold) return "warn";
  return "neutral";
}

function TonePill({
  tone,
  children,
}: {
  tone: "danger" | "warn" | "neutral";
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  const toneCls =
    tone === "danger"
      ? "bg-red-50 text-red-700 ring-red-200"
      : tone === "warn"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : "bg-slate-50 text-slate-700 ring-slate-200";

  return <span className={clsx(base, toneCls)}>{children}</span>;
}

export default function WishlistPage() {
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [shelterName, setShelterName] = useState<string>("Shelter");
  const [copyMsg, setCopyMsg] = useState("");

  useEffect(() => {
    const n = localStorage.getItem("selected_org_name");
    if (n) setShelterName(n);

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("inventory_view")
        .select("*")
        .eq("active", true);

      setInventory((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const low = useMemo(() => {
    return inventory
      .filter(
        (r) => r.current_qty === 0 || r.current_qty <= r.low_stock_threshold
      )
      .sort((a, b) => a.current_qty - b.current_qty)
      .slice(0, 15);
  }, [inventory]);

  const fbPostText = useMemo(() => {
    if (low.length === 0) {
      return `🏠 ${shelterName}

Good news! We are currently stocked on our essential items.
Thank you to everyone who continues to support us 💙`;
    }

    const items = low.map(
      (r) => `• ${r.name}${r.unit ? ` (${r.unit})` : ""} — ${reasonForRow(r)}`
    );

    return `🏠 ${shelterName}

📣 We are currently in need of the following items:

${items.join("\n")}

If you’re able to donate any of these, please comment or message us.
Sharing this post helps a lot — thank you for supporting our community 💙`;
  }, [low, shelterName]);

  async function copyToClipboard() {
    setCopyMsg("");
    try {
      await navigator.clipboard.writeText(fbPostText);
      setCopyMsg("Copied to clipboard");
      window.setTimeout(() => setCopyMsg(""), 2000);
    } catch {
      setCopyMsg("Copy failed — select text and copy manually");
    }
  }

  function goBack() {
    window.location.href = "/admin";
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-50">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={goBack}
              className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 grid place-items-center"
              aria-label="Back"
              type="button"
            >
              <span className="text-lg">←</span>
            </button>

            <div>
              <div className="text-sm text-slate-500">{shelterName}</div>
              <div className="text-base font-semibold text-slate-900">
                Wishlist
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-slate-500">
                  Donor wishlist generator
                </div>
                <div className="mt-1 text-xl font-bold text-slate-900">
                  Wishlist
                </div>
              </div>
              <Badge>Auto</Badge>
            </div>

            {loading ? (
              <div className="mt-6 text-sm text-slate-600">Loading…</div>
            ) : (
              <>
                {/* Facebook Post Box */}
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="text-sm text-slate-500">Facebook post</div>
                      <div className="text-lg font-bold text-slate-900">
                        Copy & paste
                      </div>
                    </div>

                    <button
                      onClick={copyToClipboard}
                      className="h-10 px-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
                      type="button"
                    >
                      Copy
                    </button>
                  </div>

                  <textarea
                    readOnly
                    value={fbPostText}
                    rows={Math.min(14, Math.max(8, low.length + 6))}
                    className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                  />

                  {copyMsg && (
                    <div className="mt-2 text-xs font-semibold text-slate-700">
                      {copyMsg}
                    </div>
                  )}
                </div>

                {/* Table */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-slate-600">
                          <th className="px-4 py-3 font-semibold">Item</th>
                          <th className="px-4 py-3 font-semibold">Category</th>
                          <th className="px-4 py-3 font-semibold">Unit</th>
                          <th className="px-4 py-3 font-semibold">Qty</th>
                          <th className="px-4 py-3 font-semibold">
                            Threshold
                          </th>
                          <th className="px-4 py-3 font-semibold">Why</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {low.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-4 text-slate-600"
                            >
                              No low or out-of-stock items right now.
                            </td>
                          </tr>
                        ) : (
                          low.map((r) => (
                            <tr key={r.item_id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {r.name}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {r.category}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {r.unit}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {r.current_qty}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {r.low_stock_threshold}
                              </td>
                              <td className="px-4 py-3">
                                <TonePill tone={severityForRow(r)}>
                                  {reasonForRow(r)}
                                </TonePill>
                              </td>
                            </tr>
                          ))
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
