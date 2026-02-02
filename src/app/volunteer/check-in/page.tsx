"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { getMyProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

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

export default function VolunteerCheckInPage() {
  const [name, setName] = useState("");
  const [hours, setHours] = useState<number | "">("");
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");

  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "error" | "neutral">("neutral");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getMyProfile();
      if (!p) window.location.href = "/login";
      // No other fetching needed; date handled by DB default.
    })();
  }, []);

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

    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setMsgTone("error");
      setMsg("Please enter your name.");
      return;
    }

    if (hours === "" || Number(hours) <= 0) {
      setMsgTone("error");
      setMsg("Hours must be greater than 0.");
      return;
    }

    if (isGroup && groupName.trim().length < 2) {
      setMsgTone("error");
      setMsg("Please enter a group name or turn off group check-in.");
      return;
    }

    setSubmitting(true);

    const payload = {
      organization_id: p.organization_id,
      volunteer_name: cleanName,
      hours_worked: Number(hours),
      group_name: isGroup ? groupName.trim() : null,
      // checkin_date is default current_date in DB
    };

    const { error } = await supabase.from("volunteer_checkins").insert(payload);

    if (error) {
      setMsgTone("error");
      setMsg(error.message);
      setSubmitting(false);
      return;
    }

    setMsgTone("ok");
    setMsg("✓ Checked in!");

    setName("");
    setHours("");
    setIsGroup(false);
    setGroupName("");
    setSubmitting(false);
  }

  const msgBoxCls =
    msgTone === "ok"
      ? "border-emerald-600/20 bg-emerald-500/10 text-emerald-800"
      : msgTone === "error"
      ? "border-red-600/20 bg-red-500/10 text-red-800"
      : "border-slate-300 bg-slate-50 text-slate-700";

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

        {/* Header (match Log Item page) */}
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

            <div className="flex items-center gap-3">
              <Link
                href="/volunteer/dashboard"
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
                Volunteers • Check-In
              </div>

              <h1 className="mt-6 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
                Volunteer check-in
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                Enter your name and hours so the shelter can report volunteer
                time accurately.
              </p>

              {/* Main card */}
              <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <form className="space-y-5" onSubmit={submit}>
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">
                      Your name
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                      placeholder="e.g., Alex Johnson"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="off"
                    />
                  </div>

                  {/* Hours */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-900">
                        Hours you will work
                      </label>
                      <Pill tone="neutral">No check-out needed</Pill>
                    </div>
                    <input
                      type="number"
                      min={0.25}
                      step={0.25}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                      placeholder="e.g., 2"
                      value={hours}
                      onChange={(e) =>
                        setHours(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  </div>

                  {/* Group toggle */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Volunteering with a group?
                        </div>
                        <div className="text-xs text-slate-600">
                          Optional — helps reporting for organizations/schools.
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isGroup}
                          onChange={(e) => setIsGroup(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-700">Yes</span>
                      </label>
                    </div>

                    {isGroup && (
                      <div className="mt-3 space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Group name
                        </label>
                        <input
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[color:var(--brandBorder)] focus:ring-2 focus:ring-[color:var(--brandRing)]/25"
                          placeholder="e.g., NHS, Key Club, Company Team"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className={clsx(
                      "group w-full inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2",
                      submitting
                        ? "bg-slate-300 cursor-not-allowed"
                        : "bg-[color:var(--brand)] hover:bg-[color:var(--brandDark)]"
                    )}
                  >
                    {submitting ? "Submitting…" : "Check In"}
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

              {/* Tip card (match Log Item page style) */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">
                  Tip
                </p>
                <p className="mt-2 leading-relaxed">
                  Use the same name format each time (e.g., first + last) so
                  reports group your hours correctly.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}
