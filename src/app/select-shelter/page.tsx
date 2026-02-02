"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

type Org = {
  id: string;
  name: string;
};

export default function SelectShelterPage() {
  const router = useRouter();
  const year = new Date().getFullYear(); // ✅ FIX: define year

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      // If already logged in, go through post-auth flow
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        router.replace("/post-auth");
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
  }, [router]);

  function choose(org: Org) {
    // Clear invite-mode state (we're doing shelter-select mode)
    localStorage.removeItem("pending_invite_code");
    localStorage.removeItem("invite_error");

    // Store selection for login / auth flow
    localStorage.setItem("selected_org_id", org.id);
    localStorage.setItem("selected_org_name", org.name);

    // IMPORTANT: go to the login page (not post-auth)
    router.replace("/login");
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return orgs;
    return orgs.filter((o) => o.name.toLowerCase().includes(query));
  }, [orgs, q]);

  return (
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
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[color:var(--brand)] focus:text-white focus:px-4 focus:py-2 focus:rounded focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]"
      >
        Skip to content
      </a>

      {/* Header */}
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
            <span className="text-lg font-semibold text-slate-900">
              ShelterStock
            </span>
          </Link>

          <Link
            href="/create-shelter"
            className="inline-flex items-center justify-center rounded bg-[color:var(--brand)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
          >
            Create shelter
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        id="main-content"
        className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
              <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
              Select organization
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              Select your shelter
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              Choose your shelter first, then continue to log in.
            </p>
          </div>

          {/* Card */}
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* Search */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-[color:var(--brandRing)]">
                <SearchIcon />
                <input
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                  placeholder="Search shelter name…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="text-xs text-slate-500 hover:text-slate-900 transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="mt-5">
              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Loading shelters…
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  No shelters found.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filtered.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => choose(org)}
                      className="group text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[color:var(--brandBorder)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brandRing)] focus-visible:ring-offset-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {org.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Click to continue
                          </div>
                        </div>

                        <span className="flex-none inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[color:var(--brand)] group-hover:bg-[color:var(--brandSoft)] group-hover:border-[color:var(--brandBorder)]">
                          <ArrowIcon />
                        </span>
                      </div>

                      <div className="mt-5 h-1 w-14 rounded-full bg-[color:var(--brand)]/30 group-hover:w-20 transition-all duration-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-center text-xs text-slate-500">
                If your shelter isn’t listed, ask an admin to enable it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (matches your PublicDashboardPage style) */}
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

            <a
              href="#top"
              className="text-sm text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900 inline-flex items-center gap-1 group"
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
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-slate-500">
              Developed in partnership with Denton nonprofits
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* =========================
   Icons
========================= */

function SearchIcon() {
  return (
    <svg
      className="w-4 h-4 text-slate-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}
