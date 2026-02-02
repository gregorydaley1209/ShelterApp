"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function VolunteerDashboardPage() {
  const router = useRouter();
  const year = new Date().getFullYear();

  const particles = useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      id: i,
      left: `${(i * 37) % 100}%`,
      top: `${(i * 53) % 100}%`,
      delay: `${(i * 0.35) % 5}s`,
      duration: `${15 + (i % 10)}s`,
      opacityClass:
        i % 3 === 0
          ? "bg-blue-400/30"
          : i % 3 === 1
          ? "bg-cyan-400/25"
          : "bg-indigo-400/25",
    }));
  }, []);

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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[color:var(--brand)] focus:text-white focus:px-4 focus:py-2 focus:rounded focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]"
      >
        Skip to content
      </a>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-[color:var(--brandSoft)] blur-3xl opacity-70" />
        <div className="absolute -bottom-24 left-[-10%] h-72 w-72 rounded-full bg-slate-100 blur-3xl opacity-70" />
      </div>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className={`absolute w-1 h-1 ${p.opacityClass} rounded-full animate-float`}
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
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

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
              <span className="h-2 w-2 rounded-full bg-[color:var(--brand)]" />
              Volunteer
            </span>

            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section
        id="main-content"
        className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/40 to-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="mx-auto max-w-4xl">
            <div className="text-center animate-fade-in">
              <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
                Volunteer Dashboard
              </h1>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <ActionCard
                title="Check In"
                desc="Start your shift or mark attendance."
                cta="Go to check-in"
                onClick={() => router.push("/volunteer/check-in")}
                icon={<CheckInIcon />}
              />

              <ActionCard
                title="Log Item"
                desc="Record donated or distributed items."
                cta="Log an item"
                onClick={() => router.push("/log-item")}
                icon={<LogIcon />}
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
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

            <p className="text-sm text-slate-500">
              Built by students • Designed for real-world impact
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
            opacity: 0.15;
          }
          50% {
            transform: translateY(-90px) translateX(45px);
            opacity: 0.3;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-float {
          animation: float linear infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.7s ease-out forwards;
        }
      `}</style>
    </main>
  );
}

/* =========================
   Components
========================= */

function ActionCard({
  title,
  desc,
  cta,
  icon,
  onClick,
}: {
  title: string;
  desc: string;
  cta: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] text-[color:var(--brandDark)]">
          {icon}
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>

          <span className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow shadow-[color:var(--brand)]/15">
            {cta}
            <svg
              className="w-4 h-4"
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
          </span>
        </div>
      </div>
    </button>
  );
}

function CheckInIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function LogIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
