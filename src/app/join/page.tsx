"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/post-auth";
    });
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const cleaned = code.trim();
    if (!cleaned) {
      setErr("Enter an invite code.");
      return;
    }

    // Store invite code for later claim
    localStorage.setItem("pending_invite_code", cleaned);

    // Clear any shelter selection to avoid mismatch
    localStorage.removeItem("selected_org_id");
    localStorage.removeItem("selected_org_name");

    // Go to login
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-slate-50 grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6">
        <div className="text-sm text-slate-500">Shelter Inventory</div>
        <h1 className="mt-1 text-xl font-bold text-slate-900">Join a shelter</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter the invite code your shelter admin gave you. After you log in,
          we’ll link your account automatically.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Invite code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. TESTCODE"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {err && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              {err}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Continue
          </button>

          <div className="text-xs text-slate-500 text-center">
            Don’t have a code? Ask your shelter admin.
          </div>
        </form>
      </div>
    </main>
  );
}
