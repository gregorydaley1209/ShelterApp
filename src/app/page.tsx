'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const navLinks = [
  { href: '/about', label: 'About' },
  { href: '/demo', label: 'Demo' },
  { href: '/contact', label: 'Contact' },
  { href: "/current-usage", label: "Current Usage" },
  { href: "/support", label: "FAQs" },
];

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: 'Track everything',
    description: 'Every item, every location, every movement—all in one place.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    title: 'Log with ease',
    description: 'Standardized workflows designed for simple volunteer and admin use.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Share needs instantly',
    description: 'Publish what you need to donors and partners in real time.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'See the full picture',
    description: 'Clear reports for your team, your board, and your funders.',
  },
];

const stats = [
  { label: 'Free forever', value: '$0' },
  { label: 'Setup time', value: '<5min' },
  { label: 'Required training', value: 'Minimal' },
];

export default function PublicDashboardPage() {
  const year = new Date().getFullYear();
  const [isVisible, setIsVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <main
      id="top"
      className="min-h-screen bg-white"
      style={
        {
          // Brand blues sampled from your logo
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

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2 rounded"
          >
            {/* LOGO replaces SS */}
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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus:text-slate-900 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[color:var(--brand)] after:transition-all hover:after:w-full focus:after:w-full"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/select-shelter"
              className="hidden md:inline-flex items-center justify-center rounded bg-[color:var(--brand)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
            >
              Sign in
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] rounded"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <nav className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-base font-medium text-slate-700 hover:text-[color:var(--brand)] focus:outline-none focus:text-[color:var(--brand)] py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/select-shelter"
                className="mt-2 inline-flex items-center justify-center rounded bg-[color:var(--brand)] px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-[color:var(--brandDark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section id="main-content" className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[color:var(--brandSoft)] via-transparent to-transparent"></div>

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-32">
          <div
            className={`mx-auto max-w-4xl text-center transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brandBorder)] bg-[color:var(--brandSoft)] px-4 py-1.5 text-sm font-medium text-slate-900">
              <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]"></span>
              Free for nonprofits
            </div>

            <h1 className="mt-8 text-5xl font-bold leading-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Operations tracking that actually works
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-slate-600 lg:text-2xl">
              Track supplies, usage, and operations—without spreadsheets or headaches.
            </p>

            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/select-shelter"
                className="group w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-[color:var(--brand)]/20 transition-all hover:bg-[color:var(--brandDark)] hover:shadow-xl hover:shadow-[color:var(--brand)]/30 focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] focus:ring-offset-2"
              >
                Get started
                <svg
                  className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/demo"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-10 py-4 text-lg font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                View demo
              </Link>
            </div>

            <p className="mt-6 text-sm text-slate-500">No credit card · No setup fees · No catches</p>

            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-4xl font-bold text-[color:var(--brand)]">{stat.value}</div>
                  <div className="mt-2 text-sm font-medium text-slate-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-white py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900 lg:text-4xl">Everything you need, nothing you don't</h2>
            <p className="mt-4 text-lg text-slate-600">Built specifically for nonprofits managing day-to-day operations.</p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group relative rounded-xl border border-slate-200 bg-white p-8 transition-all hover:border-[color:var(--brandBorder)] hover:shadow-lg"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[color:var(--brandSoft)] text-[color:var(--brand)] transition-colors group-hover:bg-[color:var(--brand)] group-hover:text-white">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900 lg:text-4xl">Simple by design</h2>
            <p className="mt-4 text-lg text-slate-600">No complicated setup, no IT department required</p>
          </div>

          <div className="mt-16 grid gap-12 lg:grid-cols-3">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--brand)] text-xl font-bold text-white">
                1
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">Sign in</h3>
              <p className="mt-3 text-slate-600 leading-relaxed">
                Access your organization's dashboard instantly. No downloads, no installation, no waiting.
              </p>
            </div>

            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--brand)] text-xl font-bold text-white">
                2
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">Add data</h3>
              <p className="mt-3 text-slate-600 leading-relaxed">
                Enter your items, people, and locations. The interface guides you through each step with clear prompts.
              </p>
            </div>

            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--brand)] text-xl font-bold text-white">
                3
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">Start tracking</h3>
              <p className="mt-3 text-slate-600 leading-relaxed">
                Log distributions, update counts, publish needs. Your whole team stays synchronized.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-white py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 lg:text-4xl">Built with real nonprofits</h2>
              <p className="mt-6 text-lg text-slate-600 leading-relaxed">
                ShelterStock was developed in partnership with Denton-area nonprofits who needed better tools to manage their operations.
              </p>
              <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                We listened to shelter managers, food bank organizers, and volunteer coordinators. Then we built exactly what they asked for.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <svg className="h-6 w-6 flex-shrink-0 text-[color:var(--brand)] mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold text-slate-900">Shelters and food banks</p>
                    <p className="text-slate-600">Track donations, manage distribution, coordinate volunteers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="h-6 w-6 flex-shrink-0 text-[color:var(--brand)] mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold text-slate-900">Community organizations</p>
                    <p className="text-slate-600">Maintain accurate counts, generate reports for stakeholders</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="h-6 w-6 flex-shrink-0 text-[color:var(--brand)] mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1.0 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold text-slate-900">Relief programs</p>
                    <p className="text-slate-600">Real-time inventory visibility across multiple locations</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 lg:p-12">
              <div className="space-y-8">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wider text-[color:var(--brand)]">
                    What makes us different
                  </div>
                  <h3 className="mt-3 text-2xl font-bold text-slate-900">Actually Free</h3>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    No premium tiers, no feature gates, no surprise fees. Every nonprofit gets the full system.
                  </p>
                </div>

                <div className="border-t border-slate-200 pt-8">
                  <div className="text-sm font-semibold uppercase tracking-wider text-[color:var(--brand)]">
                    How we do it
                  </div>
                  <h3 className="mt-3 text-2xl font-bold text-slate-900">Purpose-driven</h3>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    This isn't a product looking for customers. It's a tool built to solve a real problem for organizations doing important work.
                  </p>
                </div>

                <div className="border-t border-slate-200 pt-8">
                  <div className="text-sm font-semibold uppercase tracking-wider text-[color:var(--brand)]">
                    Our commitment
                  </div>
                  <h3 className="mt-3 text-2xl font-bold text-slate-900">Built to Last</h3>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    We’re committed to keeping ShelterStock accessible for nonprofits—today and long term.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-slate-900 py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--brandDark)]/25 via-transparent to-transparent"></div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-bold text-white lg:text-5xl">Ready to get started?</h2>
            <p className="mt-6 text-xl text-slate-300">
              Join the nonprofits already using ShelterStock to manage their operations more effectively.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/select-shelter"
                className="group w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-10 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-[color:var(--brandDark)] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--brandSoft)] focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Sign in now
                <svg
                  className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border-2 border-slate-600 bg-slate-800 px-10 py-4 text-lg font-medium text-white transition-all hover:bg-slate-700 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Contact us
              </Link>
            </div>

            <p className="mt-8 text-sm text-slate-400">
              Questions? Check out our{' '}
              <Link
                href="/demo"
                className="text-[color:var(--brandSoft)] hover:text-white underline focus:outline-none focus:ring-2 focus:ring-[color:var(--brandSoft)] rounded"
              >
                demo
              </Link>{' '}
              or reach out to our{' '}
              <Link
                href="/support"
                className="text-[color:var(--brandSoft)] hover:text-white underline focus:outline-none focus:ring-2 focus:ring-[color:var(--brandSoft)] rounded"
              >
                support team
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[color:var(--brandRing)] rounded">
              {/* LOGO replaces SS */}
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
              <Link href="/about" className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900">
                About
              </Link>
              <Link href="/demo" className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900">
                Demo
              </Link>
              <Link href="/contact" className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900">
                Contact
              </Link>
              <Link href="/support" className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900">
                Support
              </Link>
              <Link href="/current-usage" className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900">
                Current Usage
              </Link>
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
