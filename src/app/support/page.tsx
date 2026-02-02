"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Faq = {
  category: string;
  q: string;
  a: string;
};

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/demo", label: "Demo" },
  { href: "/contact", label: "Contact" },
  { href: "/current-usage", label: "Current Usage" },
  { href: "/support", label: "FAQs" },
];

export default function SupportPage() {
  const year = new Date().getFullYear();

  // No FAQs yet (you'll add these later)
  const faqs: Faq[] = [];

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) =>
        f.q.toLowerCase().includes(q) ||
        f.a.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    );
  }, [faqs, query]);

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
      {/* ===== Header (same as homepage) ===== */}
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
            <span className="text-lg font-semibold text-slate-900">ShelterStock</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  link.href === "/support"
                    ? "text-slate-900 border-b-2 border-[color:var(--brand)] pb-1"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/select-shelter"
            className="hidden md:inline-flex items-center justify-center rounded bg-[color:var(--brand)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* ===== Hero (with subtle brand color) ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/40 to-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 pt-14 pb-8 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
              <span className="h-2 w-2 rounded-full bg-[color:var(--brand)]" />
              FAQs • Current users
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Help center for day-to-day use
            </h1>

            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Search FAQs about inventory, logging, reporting, and access. If you’re stuck, use the contact page
              and we’ll help you out.
            </p>
          </div>
        </div>
      </section>

      {/* ===== ONE COLUMN: Search above FAQs ===== */}
      <section className="bg-white pb-20">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          {/* Search panel (integrated + a bit of color) */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-[color:var(--brandSoft)]/55 to-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Search FAQs</p>
                <p className="mt-1 text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{filtered.length}</span>{" "}
                  result{filtered.length === 1 ? "" : "s"}
                </p>
              </div>

              <Link
                href="/contact"
                className="text-xs font-semibold text-[color:var(--brandDark)] hover:text-slate-900 underline underline-offset-4"
              >
                Need help? Contact →
              </Link>
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-xl border border-[color:var(--brandBorder)] bg-white px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[color:var(--brandRing)]">
              <SearchIcon />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search inventory, logging, reporting…"
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
              />
              {query.trim().length > 0 && (
                <button
                  onClick={() => setQuery("")}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* FAQs header row */}
          <div className="mt-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">FAQs</h2>
              <p className="mt-1 text-sm text-slate-600">Quick answers for the most common questions.</p>
            </div>

            <Link
              href="/contact"
              className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
            >
              Still stuck? Contact us
              <ArrowIcon />
            </Link>
          </div>

          {/* FAQ list */}
          <div className="mt-6 grid gap-4">
            {filtered.map((f, idx) => (
              <FaqCard key={`${f.category}-${idx}`} category={f.category} q={f.q} a={f.a} />
            ))}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-lg font-bold text-slate-900">There are no FAQs yet.</p>
              <p className="mt-2 text-sm text-slate-600">
                Check back soon as we continue adding answers and guidance.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear search
                </button>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-6 py-3 text-sm font-semibold text-white hover:bg-[color:var(--brandDark)]"
                >
                  Contact us
                </Link>
              </div>
            </div>
          )}

          {/* Mobile CTA */}
          <div className="mt-10 sm:hidden">
            <Link
              href="/contact"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--brand)] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[color:var(--brandDark)]"
            >
              Still stuck? Contact us
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer (match homepage) ===== */}
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
            <p className="text-sm text-slate-500">Developed in partnership with Denton nonprofits</p>
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

function FaqCard({ category, q, a }: { category: string; q: string; a: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--brandDark)]">{category}</p>
        <span className="text-xs text-slate-400">FAQs</span>
      </div>

      <div className="mt-4 flex gap-4">
        <div className="mt-1.5 h-full w-1 rounded-full bg-[color:var(--brand)]" />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900">{q}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Icons
========================= */

function ArrowIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}
