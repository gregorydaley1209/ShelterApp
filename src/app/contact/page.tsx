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

export default function ContactPage() {
  const year = new Date().getFullYear();

  const primaryEmail = "gregorydaley1209@gmail.com";
  const secondaryEmail = "cmedooru@gmail.com";

  const phone1Display = "817-450-3879";
  const phone1Href = "+18174503879";

  const phone2Display = "214-727-0559";
  const phone2Href = "+12147270559";

  // BLANK mailto links (no subject, no body)
  const mailtoPrimary = `mailto:${primaryEmail}`;
  const mailtoSecondary = `mailto:${secondaryEmail}`;

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

      {/* ===== Header (match homepage) ===== */}
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
                  link.href === "/contact"
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

      {/* ===== Hero ===== */}
      <section
        id="main-content"
        className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/40 to-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
              <span className="h-2 w-2 rounded-full bg-[color:var(--brand)]" />
              Contact
            </div>

            <h1 className="mt-8 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Reach out to use ShelterStock or learn more
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              If your nonprofit is interested in using ShelterStock or learning more, email or call us.
              We’ll respond soon.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href={mailtoPrimary}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-[color:var(--brand)]/20 transition-all hover:bg-[color:var(--brandDark)] hover:shadow-xl hover:shadow-[color:var(--brand)]/30 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
              >
                Email us
              </a>

              <a
                href={`tel:${phone1Href}`}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-10 py-4 text-lg font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                Call us
              </a>
            </div>

            <p className="mt-6 text-sm text-slate-500">

            </p>
          </div>
        </div>
      </section>

      {/* ===== Contact Options ===== */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900 lg:text-4xl">Contact options</h2>
            <p className="mt-4 text-lg text-slate-600">
              Choose whichever is easiest — we check both emails.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <ContactCard title="Primary email" value={primaryEmail} href={mailtoPrimary} meta="Opens your email app" />
            <ContactCard title="Secondary email" value={secondaryEmail} href={mailtoSecondary} meta="Opens your email app" />
            <ContactCard
              title="Phone"
              value={`${phone1Display} • ${phone2Display}`}
              href={`tel:${phone1Href}`}
              meta="Calls the primary number"
            />
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="bg-slate-50 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900 lg:text-4xl">FAQ</h2>
            <p className="mt-4 text-lg text-slate-600">A few quick answers.</p>
          </div>

          <div className="mt-12 mx-auto max-w-3xl space-y-4">
            <FaqItem
              q="Is ShelterStock free?"
              a="Yes. ShelterStock is free to use and designed to support nonprofits without financial barriers."
            />
            <FaqItem
              q="Is ShelterStock available right now?"
              a="ShelterStock is fully available, but always being modified to better fit the needs of our users."
            />
            <FaqItem
              q="What kinds of organizations can use it?"
              a="Any nonprofit that wants clearer tracking and reporting."
            />
            <FaqItem q="How do we get access?" a="Email or call us and we’ll walk you through next steps." />
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
              <svg className="h-4 w-4 transition-transform group-hover:-translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ===== Components ===== */

function ContactCard({
  title,
  value,
  href,
  meta,
}: {
  title: string;
  value: string;
  href: string;
  meta: string;
}) {
  return (
    <a
      href={href}
      className="group relative rounded-xl border border-slate-200 bg-white p-8 transition-all hover:border-[color:var(--brandBorder)] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
    >
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[color:var(--brandSoft)] text-[color:var(--brand)] transition-colors group-hover:bg-[color:var(--brand)] group-hover:text-white">
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 8V7a2 2 0 00-2-2H5a2 2 0 00-2 2v1m18 0l-9 6-9-6m18 0v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8" />
        </svg>
      </div>

      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 break-words">{value}</p>
      <p className="mt-3 text-xs text-slate-500">{meta}</p>
    </a>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-base font-semibold text-slate-900">{q}</p>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{a}</p>
    </div>
  );
}
