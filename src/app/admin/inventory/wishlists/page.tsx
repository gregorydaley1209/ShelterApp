"use client";

import React, { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

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
    <span className="text-xs font-semibold text-slate-700 rounded-full px-2.5 py-1 bg-slate-50 border border-slate-200">
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
  const year = new Date().getFullYear();

  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [shelterName, setShelterName] = useState<string>("Shelter");
  const [copyMsg, setCopyMsg] = useState("");

  useEffect(() => {
    const n = localStorage.getItem("selected_org_name");
    if (n) setShelterName(n);

    (async () => {
      setLoading(true);

      // ✅ Filter to the currently selected shelter/org
      const orgId = localStorage.getItem("selected_org_id");

      let query = supabase.from("inventory_view").select("*").eq("active", true);

      if (orgId) {
        query = query.eq("organization_id", orgId);
      }

      const { data } = await query;

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
    window.location.href = "/admin/inventory/dashboard";
  }

  return (
    <AuthGuard>
      <main
        id="top"
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

        {/* Background wash (matches your public homepage hero vibe) */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-slate-50 via-transparent to-transparent" />
        </div>

        {/* Header (homepage style) */}
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={goBack}
                className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 grid place-items-center transition focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                aria-label="Back"
                type="button"
                title="Back"
              >
                <span className="text-lg text-slate-700">←</span>
              </button>

              <Link
                href="/"
                className="inline-flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2 rounded min-w-0"
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

                <span className="min-w-0">
                  <span className="block truncate text-xs text-slate-500">
                    {shelterName}
                  </span>
                  <span className="block truncate text-base font-semibold text-slate-900">
                    Wishlist
                  </span>
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/inventory/dashboard"
                className="hidden sm:inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
              >
                Inventory
              </Link>

              <Link
                href="/admin/dashboard"
                className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
              >
                Admin
              </Link>
            </div>
          </div>
        </header>

        {/* Main */}
        <section
          id="main-content"
          className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white"
        >
          <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-16">
            {/* Top meta */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
                  <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
                  Donor wishlist generator
                </div>

                <h1 className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl">
                  Wishlist
                </h1>
                <p className="mt-3 text-lg text-slate-600">
                  Copy a ready-to-post update for donors and partners—automatically
                  pulled from your low and out-of-stock items.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Badge>Auto</Badge>
              </div>
            </div>

            {/* Card */}
            <div className="mt-10 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="p-6 sm:p-8">
                {loading ? (
                  <div className="text-sm text-slate-600">Loading…</div>
                ) : (
                  <>
                    {/* Facebook Post Box */}
                    <div className="rounded-2xl border border-slate-200 bg-[color:var(--brandSoft)] p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                          <div className="text-sm text-slate-600">Facebook post</div>
                          <div className="mt-1 text-lg font-bold text-slate-900">
                            Copy & paste
                          </div>
                        </div>

                        <button
                          onClick={copyToClipboard}
                          className="group w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[color:var(--brand)]/20 transition-all hover:bg-[color:var(--brandDark)] hover:shadow-xl hover:shadow-[color:var(--brand)]/30 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                          type="button"
                        >
                          Copy
                          <svg
                            className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7h8M8 11h8M8 15h5M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z"
                            />
                          </svg>
                        </button>
                      </div>

                      <textarea
                        readOnly
                        value={fbPostText}
                        rows={Math.min(14, Math.max(8, low.length + 6))}
                        className="mt-5 w-full rounded-xl border border-[color:var(--brandBorder)] bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]/20"
                      />

                      {copyMsg && (
                        <div className="mt-3 text-sm font-semibold text-slate-700">
                          {copyMsg}
                        </div>
                      )}
                    </div>

                    {/* Table */}
                    <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr className="text-left text-slate-600">
                              <th className="px-4 py-3 font-semibold">Item</th>
                              <th className="px-4 py-3 font-semibold">Category</th>
                              <th className="px-4 py-3 font-semibold">Unit</th>
                              <th className="px-4 py-3 font-semibold">Qty</th>
                              <th className="px-4 py-3 font-semibold">Threshold</th>
                              <th className="px-4 py-3 font-semibold">Why</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {low.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-4 text-slate-600">
                                  No low or out-of-stock items right now.
                                </td>
                              </tr>
                            ) : (
                              low.map((r) => (
                                <tr key={r.item_id} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 font-semibold text-slate-900">
                                    {r.name}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">{r.category}</td>
                                  <td className="px-4 py-3 text-slate-700">{r.unit}</td>
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

            {/* Bottom helper text (matches your homepage “no catches” vibe) */}
            <p className="mt-6 text-sm text-slate-500">
              Tip: Share weekly for best donor response · Keep the list short and specific
            </p>
          </div>
        </section>

        {/* Footer (homepage style) */}
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <Link
                href="/"
                className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] rounded"
              >
                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded">
                  <Image
                    src="/shelterstock-logo.png"
                    alt="ShelterStock"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                  />
                </span>

                <div>
                  <p className="font-semibold text-slate-900">ShelterStock</p>
                  <p className="text-sm text-slate-500">{year}</p>
                </div>
              </Link>

              <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <Link
                  href="/admin/inventory/dashboard"
                  className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900"
                >
                  Inventory
                </Link>
                <Link
                  href="/admin/dashboard"
                  className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900"
                >
                  Admin Dashboard
                </Link>
                <a
                  href="#top"
                  className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900 inline-flex items-center gap-1 group"
                >
                  Back to top
                  <svg
                    className="h-4 w-4 transition-transform group-hover:-translate-y-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                </a>
              </nav>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-slate-500">
                Developed in partnership with Denton nonprofits
              </p>
              <p className="text-sm text-slate-500">
                Share needs fast, keep donors in the loop
              </p>
            </div>
          </div>
        </footer>
      </main>
    </AuthGuard>
  );
}
