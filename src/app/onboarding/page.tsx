"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { getMyProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

export default function Onboarding() {
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const p = await getMyProfile();
      if (p) window.location.href = "/dashboard";
    })();
  }, []);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const { data, error } = await supabase.rpc("create_org_and_profile", {
      org_name: orgName,
      full_name: fullName,
    });

    if (error) return setMsg(error.message);
    window.location.href = "/dashboard";
  }

  async function joinOrg(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const { data, error } = await supabase.rpc("join_org_with_code", {
      invite_code: inviteCode,
      full_name: fullName,
    });

    if (error) return setMsg(error.message);
    window.location.href = "/dashboard";
  }

  return (
    <AuthGuard>
      <Navbar />
      <main className="p-6 max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Set up your account</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <form className="border rounded p-4 space-y-3" onSubmit={createOrg}>
            <h2 className="font-semibold">Create a new shelter</h2>
            <input className="w-full border rounded p-2" placeholder="Your full name"
              value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input className="w-full border rounded p-2" placeholder="Shelter name"
              value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
            <button className="border rounded px-3 py-2">Create (Admin)</button>
          </form>

          <form className="border rounded p-4 space-y-3" onSubmit={joinOrg}>
            <h2 className="font-semibold">Join an existing shelter</h2>
            <input className="w-full border rounded p-2" placeholder="Your full name"
              value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input className="w-full border rounded p-2" placeholder="Invite code"
              value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
            <button className="border rounded px-3 py-2">Join</button>
          </form>
        </div>

        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </main>
    </AuthGuard>
  );
}
