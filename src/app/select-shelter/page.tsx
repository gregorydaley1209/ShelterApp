"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Org = {
  id: string;
  name: string;
};

export default function SelectShelterPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      // If already logged in, just go dashboard
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        window.location.href = "/dashboard";
        return;
      }

      const { data, error } = await supabase
        .from("organizations")
        .select("id,name")
        .eq("is_listed", true)
        .order("name", { ascending: true });

      if (!error && data) setOrgs(data as Org[]);
      setLoading(false);
    })();
  }, []);

  function choose(org: Org) {
    // Clear invite-mode state (we're doing shelter-select mode)
    localStorage.removeItem("pending_invite_code");
    localStorage.removeItem("invite_error");

    // Store shelter choice so login page knows what they selected
    localStorage.setItem("selected_org_id", org.id);
    localStorage.setItem("selected_org_name", org.name);
    window.location.href = "/"; // send to login (your app's flow)
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return orgs;
    return orgs.filter((o) => o.name.toLowerCase().includes(query));
  }, [orgs, q]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-12">
        {/* Top row */}
        <div className="flex items-center justify-end">
          <Link
            href="/create-shelter"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          >
            Create shelter
          </Link>
        </div>

        {/* Header */}
        <header className="mt-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Select your shelter
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Choose your shelter first, then log in.
          </p>
        </header>

        {/* Card */}
        <section className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-800">
                Search
              </label>
              <input
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                placeholder="Search shelter name…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Results */}
            <div className="mt-5">
              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Loading shelters…
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No shelters found.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filtered.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => choose(org)}
                      className="group text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-[1px] hover:border-slate-300 hover:bg-slate-50/60 hover:shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                    >
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {org.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Click to continue
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-4">
            <p className="text-center text-xs text-slate-500">
              If your shelter isn’t listed, ask an admin to enable it.
            </p>
          </div>
        </section>

        <div className="flex-1" />
      </div>
    </main>
  );
}
