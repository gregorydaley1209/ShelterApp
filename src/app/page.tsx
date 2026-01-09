"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        window.location.href = "/post-auth";
        return;
      }

      const selectedOrgName = localStorage.getItem("selected_org_name");
      if (selectedOrgName) setOrgName(selectedOrgName);

      const selectedOrgId = localStorage.getItem("selected_org_id");
      if (!selectedOrgId) {
        window.location.href = "/select-shelter";
        return;
      }
    })();
  }, []);

  function changeShelter() {
    localStorage.removeItem("selected_org_id");
    localStorage.removeItem("selected_org_name");
    window.location.href = "/select-shelter";
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!username || !password || !orgName) {
      setMsg("Enter username and password.");
      return;
    }

    const email = `${username.toLowerCase()}@${slugify(orgName)}.local.shelter`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg("Invalid login.");
      return;
    }

    window.location.href = "/post-auth";
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-12">
        {/* Brand */}
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
              ShelterStock
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Simple inventory tracking for shelters
          </p>
        </header>

        {/* Card */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Shelter context */}
          <div className="px-6 pt-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Shelter
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {orgName ?? "—"}
                </div>
                <button
                  type="button"
                  onClick={changeShelter}
                  className="rounded-lg px-2 py-1 text-sm font-medium text-slate-700 hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  Change
                </button>
              </div>
            </div>
          </div>

          {/* Form header */}
          <div className="px-6 pt-5">
            <h2 className="text-lg font-semibold text-slate-900">Log in</h2>
            <p className="mt-1 text-sm text-slate-500">
              Use your shelter’s shared login.
            </p>
          </div>

          {/* Form */}
          <form className="mt-5 space-y-4 px-6 pb-6" onSubmit={signIn}>
            <div>
              <label className="block text-sm font-medium text-slate-800">
                Username
              </label>
              <input
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                placeholder="frontdesk"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">
                Password
              </label>
              <input
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button className="h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 active:translate-y-px">
              Log in
            </button>

            {msg && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {msg}
              </div>
            )}
          </form>
        </section>

        <div className="flex-1" />
      </div>
    </main>
  );
}
