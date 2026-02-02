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

export default function DemoPage() {
  const year = new Date().getFullYear();

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
      {/* ===== Header ===== */}
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
              />
            </span>
            <span className="text-lg font-semibold text-slate-900">
              ShelterStock
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  link.href === "/demo"
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
            className="hidden md:inline-flex items-center justify-center rounded bg-[color:var(--brand)] px-5 py-2 text-sm font-medium text-white hover:bg-[color:var(--brandDark)]"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/40 to-white">
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-12 items-start">
            {/* Left */}
            <div className="lg:col-span-7 space-y-8">
              <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
                A preview of how ShelterStock works
              </h1>

              <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
                Explore the primary systems within ShelterStock including client
                management, volunteer coordination, inventory tracking, and the
                dedicated volunteer portal experience.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-lg bg-[color:var(--brand)] px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-[color:var(--brandDark)] transition"
                >
                  Contact us
                </Link>
                <Link
                  href="/select-shelter"
                  className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-8 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Sign in
                </Link>
              </div>
            </div>

            {/* Right */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Product previews
                </h2>

                <div className="mt-6 grid gap-4">
                  <PreviewVideo
                    label="Client System"
                    src="/videos/Client.mp4"
                  />
                  <PreviewVideo
                    label="Volunteer System"
                    src="/videos/volunteer.mp4"
                  />
                  <PreviewVideo
                    label="Inventory System"
                    src="/videos/inventory.mp4"
                  />
                  <PreviewVideo
                    label="Volunteer Portal"
                    src="/videos/volunteer-portal.mp4"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 flex justify-between items-center">
          <p className="text-sm text-slate-500">
            Developed in partnership with Denton nonprofits • {year}
          </p>
          <a href="#top" className="text-sm text-slate-600 hover:text-slate-900">
            Back to top
          </a>
        </div>
      </footer>
    </main>
  );
}

/* ===== Components ===== */

function PreviewVideo({ label, src }: { label: string; src: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-900">{label}</p>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-black">
        <video
          className="w-full aspect-video"
          controls
          preload="metadata"
          playsInline
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
