"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/demo", label: "Demo" },
  { href: "/contact", label: "Contact" },
  { href: "/current-usage", label: "Current Usage" },
  { href: "/support", label: "FAQs" },
];

export default function CurrentUsagePage() {
  const year = new Date().getFullYear();

  const nonprofits = [
    {
      name: "Cumberland Youth and Family Services",
      city: "Denton",
      state: "TX",
      type: "Community nonprofit",
      since: "February 2026",
      note:
        "Working with the ShelterStock team to test the platform in order to support inventory tracking and organization across nonprofit operations.",
    },
    {
      name: "Giving Grace",
      city: "Denton",
      state: "TX",
      type: "Homeless shelter",
      since: "January 2026",
      note:
        "Working with the ShelterStock team as the platform is currently being implemented to support inventory tracking and day-to-day operations.",
    },
  ];

  const totalNonprofits = nonprofits.length;
  const cities = new Set(nonprofits.map((n) => `${n.city}, ${n.state}`)).size;
  const states = new Set(nonprofits.map((n) => n.state)).size;

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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[color:var(--brand)] focus:text-white focus:px-4 focus:py-2 focus:rounded focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]"
      >
        Skip to content
      </a>

      {/* ===== Header ===== */}
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

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => {
              const active = link.href === "/current-usage";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "relative text-sm font-medium transition-colors focus:outline-none",
                    active
                      ? "text-slate-900"
                      : "text-slate-600 hover:text-slate-900",
                    "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[color:var(--brand)] after:transition-all",
                    active
                      ? "after:w-full"
                      : "hover:after:w-full focus:after:w-full",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/select-shelter"
            className="hidden md:inline-flex items-center justify-center rounded bg-[color:var(--brand)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section
        id="main-content"
        className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
              <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
              Current usage
            </div>

            <h1 className="mt-8 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Where ShelterStock is being used today
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-slate-600 max-w-2xl">
              ShelterStock is currently being developed and tested in
              collaboration with real nonprofits to ensure the platform works in
              day-to-day operations.
            </p>
          </div>
        </div>
      </section>

      {/* ===== Counters ===== */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <Counter label="Active nonprofits" value={totalNonprofits} />
            <Counter label="Cities" value={cities} />
            <Counter label="States" value={states} />
          </div>
        </div>
      </section>

      {/* ===== Usage list ===== */}
      <section className="bg-slate-50 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 lg:text-3xl">
                Active nonprofit partners
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Listings shown prior to public launch pending nonprofit approval.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              Contact us
              <svg
                className="ml-2 h-4 w-4"
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
            </Link>
          </div>

          <div className="mt-10 grid gap-6">
            {nonprofits.map((n, idx) => (
              <UsageCard key={idx} nonprofit={n} />
            ))}
          </div>

          <div className="mt-14 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-bold text-slate-900">
              We’re always looking to support more nonprofits
            </p>
            <p className="mt-3 text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
              ShelterStock is built to help nonprofits stay organized and reduce
              friction in day-to-day operations. If your organization is
              interested, reach out — we’d love to talk.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[color:var(--brand)]/20 transition-all hover:bg-[color:var(--brandDark)] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
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
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-slate-500">
              Developed in partnership with Denton nonprofits
            </p>
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
        </div>
      </footer>
    </main>
  );
}

/* =========================
   Components
========================= */

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <p className="text-4xl font-bold text-[color:var(--brand)]">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

function UsageCard({
  nonprofit,
}: {
  nonprofit: {
    name: string;
    city: string;
    state: string;
    type: string;
    since: string;
    note: string;
  };
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-lg hover:border-[color:var(--brandBorder)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{nonprofit.name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {nonprofit.city}, {nonprofit.state}
          </p>
        </div>

        <span className="rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1 text-xs font-semibold text-slate-900">
          {nonprofit.type}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Info label="Location" value={`${nonprofit.city}, ${nonprofit.state}`} />
        <Info label="Working with us since" value={nonprofit.since} />
        <Info label="Status" value="Currently in use" />
      </div>

      <p className="mt-6 text-sm text-slate-600 leading-relaxed">
        {nonprofit.note}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-900">{value}</p>
    </div>
  );
}
