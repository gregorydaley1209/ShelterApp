"use client";

import { useState } from "react";

export default function CreateShelterPage() {
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

  async function onCreate(e: React.FormEvent) {
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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-12">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Create shelter card */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6">
            <header>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Create a shelter
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                This creates a shelter organization and generates exactly two
                logins: one Admin and one Volunteer. Save them immediately.
              </p>
            </header>

            <form onSubmit={onCreate} className="mt-6 space-y-5">
              {/* Shelter name */}
              <div>
                <label className="block text-sm font-medium text-slate-800">
                  Shelter name
                </label>
                <input
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                  placeholder="Example Shelter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Setup code */}
              <div>
                <label className="block text-sm font-medium text-slate-800">
                  Setup code
                </label>
                <input
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                  placeholder="(must be given by developer)"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value)}
                />
                <p className="mt-2 text-xs text-slate-500">
                  This prevents random people from creating shelters.
                </p>
              </div>

              {/* Logins to create */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Logins to create
                </div>

                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {/* Admin */}
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Admin
                    </div>

                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-800">
                          Admin username
                        </label>
                        <input
                          className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                          value={adminUsername}
                          onChange={(e) => setAdminUsername(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-800">
                          Admin password
                        </label>
                        <input
                          type="password"
                          className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Volunteer */}
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Volunteer
                    </div>

                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-800">
                          Volunteer username
                        </label>
                        <input
                          className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                          value={volUsername}
                          onChange={(e) => setVolUsername(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-800">
                          Volunteer password
                        </label>
                        <input
                          type="password"
                          className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                          value={volPassword}
                          onChange={(e) => setVolPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  Tip: Keep usernames simple (e.g.{" "}
                  <span className="font-medium">admin</span>,{" "}
                  <span className="font-medium">frontdesk</span>) so staff can
                  remember them.
                </p>
              </div>

              {err && (
                <div
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                >
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create shelter + generate logins"}
              </button>
            </form>
          </div>
        </section>

        {/* Result card */}
        {result && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-6 space-y-5">
              <div>
                <div className="text-sm text-slate-500">Shelter created</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {result.organization.name}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                <div className="font-semibold">Save these logins now.</div>
                <div className="mt-1 text-amber-900">
                  These passwords are only shown once.
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Admin result */}
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Admin login
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-slate-900">
                        Username
                      </span>
                      <span className="font-mono text-slate-800">
                        {result.credentials.admin.username}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-slate-900">
                        Password
                      </span>
                      <span className="font-mono text-slate-800">
                        {result.credentials.admin.password}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Volunteer result */}
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Volunteer login
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-slate-900">
                        Username
                      </span>
                      <span className="font-mono text-slate-800">
                        {result.credentials.volunteer.username}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-slate-900">
                        Password
                      </span>
                      <span className="font-mono text-slate-800">
                        {result.credentials.volunteer.password}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="/select-shelter"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                >
                  Go to shelter picker
                </a>
                <a
                  href="/"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                >
                  Go to login
                </a>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
