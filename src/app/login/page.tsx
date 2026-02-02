"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function LoginPage() {
  const router = useRouter();
  const year = new Date().getFullYear();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();

      // If already logged in, let post-auth route appropriately
      if (data.session) {
        router.replace("/post-auth");
        return;
      }

      const selectedOrgName = localStorage.getItem("selected_org_name");
      if (selectedOrgName) setOrgName(selectedOrgName);

      const selectedOrgId = localStorage.getItem("selected_org_id");
      if (!selectedOrgId) {
        router.replace("/select-shelter");
        return;
      }
    })();
  }, [router]);

  function changeShelter() {
    localStorage.removeItem("selected_org_id");
    localStorage.removeItem("selected_org_name");
    router.replace("/select-shelter");
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!username || !password || !orgName) {
      setMsg("Enter your username and password.");
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

    router.replace("/post-auth");
  }

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
        } as any
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
            className="inline-flex items-center gap-2.5 rounded focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
          >
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded">
              <Image
                src="/shelterstock-logo.png"
                alt="ShelterStock"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
            </span>
            <span className="text-lg font-semibold text-slate-900">
              ShelterStock
            </span>
          </Link>

          <button
            type="button"
            onClick={changeShelter}
            className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
          >
            Change shelter
          </button>
        </div>
      </header>

      {/* Hero */}
      <section
        id="main-content"
        className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
              <span className="h-2 w-2 rounded-full bg-[color:var(--brand)]" />
              Sign in
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              Welcome back
              <span className="block">to ShelterStock.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              Use your organization’s shared login to continue.
            </p>
          </div>

          {/* Card */}
          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* Org context */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Selected shelter
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {orgName ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    This selection is used to construct your login email.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={changeShelter}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Form */}
            <form className="mt-6 space-y-4" onSubmit={signIn}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Username
                </label>
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[color:var(--brandRing)]"
                  placeholder="frontdesk"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Password
                </label>
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[color:var(--brandRing)]"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg bg-[color:var(--brand)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[color:var(--brand)]/20 transition hover:bg-[color:var(--brandDark)] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
              >
                Log in
              </button>

              {msg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {msg}
                </div>
              )}
            </form>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-center text-xs text-slate-500">
                If you can’t sign in, contact your organization admin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="flex items-center gap-3">
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
              className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              Back to top
              <svg
                className="h-4 w-4"
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
        </div>
      </footer>
    </main>
  );
}
