'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const navLinks = [
  { href: '/about', label: 'About' },
  { href: '/demo', label: 'Demo' },
  { href: '/contact', label: 'Contact' },
  { href: "/current-usage", label: "Current Usage" },
  { href: "/support", label: "FAQs" },
];

export default function AboutPage() {
  const year = new Date().getFullYear();

  return (
    <main
      id="top"
      className="min-h-screen bg-white"
      style={
        {
          // Brand blues sampled from your logo (keep consistent across pages)
          ['--brand' as any]: '#5883A8',
          ['--brandDark' as any]: '#40556A',
          ['--brandSoft' as any]: '#EAF2F8',
          ['--brandBorder' as any]: '#B7C9D7',
          ['--brandRing' as any]: '#5883A8',
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

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => {
              const active = link.href === '/about';
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    'relative text-sm font-medium transition-colors focus:outline-none after:absolute after:bottom-0 after:left-0 after:h-0.5 after:transition-all',
                    active
                      ? 'text-slate-900 after:w-full after:bg-[color:var(--brand)]'
                      : 'text-slate-600 hover:text-slate-900 after:w-0 after:bg-[color:var(--brand)] hover:after:w-full focus:text-slate-900 focus:after:w-full',
                  ].join(' ')}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/select-shelter"
              className="hidden md:inline-flex items-center justify-center rounded bg-[color:var(--brand)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Content (short, first-person, creator-focused) ===== */}
      <section
        id="main-content"
        className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/40 to-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 lg:px-8 lg:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
            <span className="h-2 w-2 rounded-full bg-[color:var(--brand)]" />
            Our story
          </div>

          <h1 className="mt-8 text-4xl font-bold text-slate-900 sm:text-5xl">
            Why we built ShelterStock
          </h1>

          <p className="mt-8 text-lg leading-relaxed text-slate-600">
            We built ShelterStock because we believe STEM should be used to directly support underserved
            communities—not just as an academic exercise, but as a way to solve real problems.
          </p>

          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            We’re <span className="font-semibold text-slate-900">Charvi Medooru</span> and{' '}
            <span className="font-semibold text-slate-900">Gregory Daley</span>, students at the Texas Academy of
            Mathematics and Science (TAMS). After talking with local nonprofits, we kept seeing the same issue:
            too much time and energy was being lost to broken, manual systems that were never designed for how
            these organizations actually operate.
          </p>

          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            So we focused on building something practical. ShelterStock isn’t a class project or an experiment—it’s
            a tool shaped by real conversations, real needs, and a desire to reduce friction for the people doing
            important work every day.
          </p>

          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Our goal is simple: use engineering to remove barriers, so nonprofits can spend less time managing
            systems and more time serving their communities.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-8 py-3 text-base font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              View demo
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[color:var(--brand)]/20 transition-all hover:bg-[color:var(--brandDark)] hover:shadow-xl hover:shadow-[color:var(--brand)]/30 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
            >
              Contact us
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
