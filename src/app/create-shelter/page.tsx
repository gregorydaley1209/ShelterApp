"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";

export default function CreateShelterPage() {
  const year = new Date().getFullYear();

  const [name, setName] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [volUsername, setVolUsername] = useState("");
  const [volPassword, setVolPassword] = useState("");

  const [result, setResult] = useState<null | {
    organization: { id: string; name: string };
    credentials: {
      admin: { username: string; email: string; password: string };
      volunteer: { username: string; email: string; password: string };
    };
  }>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setResult(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Enter a shelter name.");
      return;
    }

    if (!adminUsername || !adminPassword || !volUsername || !volPassword) {
      setErr("All login fields are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/create-shelter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          setupCode,
          adminUsername: adminUsername.toLowerCase(),
          adminPassword,
          volUsername: volUsername.toLowerCase(),
          volPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Failed to create shelter.");
        return;
      }

      setResult(data);
    } catch (e: any) {
      setErr(e?.message || "Request failed.");
    } finally {
      setLoading(false);
    }
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

          <Link
            href="/select-shelter"
            className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
          >
            Back to picker
          </Link>
        </div>
      </header>

      {/* Hero + content */}
      <section
        id="main-content"
        className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          {/* Title */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
              <span className="h-2 w-2 rounded-full bg-[color:var(--brand)]" />
              Create organization
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              Create a shelter
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              This creates a shelter organization and generates exactly two logins:
              one Admin and one Volunteer. Save them immediately.
            </p>
          </div>

          {/* Form card */}
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <form onSubmit={onCreate} className="space-y-6">
              {/* Shelter name */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Shelter name
                </label>
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[color:var(--brandRing)]"
                  placeholder="Example Shelter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Setup code */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Setup code
                </label>
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[color:var(--brandRing)]"
                  placeholder="(must be given by developer)"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value)}
                />
                <p className="mt-2 text-xs text-slate-500">
                  This prevents random people from creating shelters.
                </p>
              </div>

              {/* Logins */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Logins to create
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      You’ll generate one Admin and one Volunteer login.
                    </p>
                  </div>

                  <span className="inline-flex items-center rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-3 py-1 text-xs font-semibold text-slate-900">
                    Two accounts
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {/* Admin */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">
                      Admin
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Admin username
                        </label>
                        <input
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]"
                          value={adminUsername}
                          onChange={(e) => setAdminUsername(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Admin password
                        </label>
                        <input
                          type="password"
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Volunteer */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">
                      Volunteer
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Volunteer username
                        </label>
                        <input
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]"
                          value={volUsername}
                          onChange={(e) => setVolUsername(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Volunteer password
                        </label>
                        <input
                          type="password"
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]"
                          value={volPassword}
                          onChange={(e) => setVolPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  Tip: Keep usernames simple (e.g.{" "}
                  <span className="font-semibold text-slate-700">admin</span>,{" "}
                  <span className="font-semibold text-slate-700">frontdesk</span>)
                  so staff can remember them.
                </p>
              </div>

              {err && (
                <div
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                  role="alert"
                >
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[color:var(--brand)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[color:var(--brand)]/20 transition hover:bg-[color:var(--brandDark)] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2 disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create shelter + generate logins"}
              </button>
            </form>
          </div>

          {/* Result card */}
          {result && (
            <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Shelter created
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {result.organization.name}
                  </p>
                </div>

                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  Save these logins now
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-600">
                These passwords are only shown once.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {/* Admin */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Admin login
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    <Row label="Username" value={result.credentials.admin.username} />
                    <Row label="Password" value={result.credentials.admin.password} mono />
                  </div>
                </div>

                {/* Volunteer */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Volunteer login
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    <Row label="Username" value={result.credentials.volunteer.username} />
                    <Row label="Password" value={result.credentials.volunteer.password} mono />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/select-shelter"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                >
                  Go to shelter picker
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-[color:var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
                >
                  Go to login
                </Link>
              </div>
            </div>
          )}
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

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-medium text-slate-700">{label}</span>
      <span className={mono ? "font-mono text-slate-900" : "text-slate-900"}>
        {value}
      </span>
    </div>
  );
}
