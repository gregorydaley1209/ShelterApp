"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) window.location.href = "/dashboard";
    })();
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(error.message);

    // after login, go dashboard (dashboard will route to onboarding if profile missing)
    window.location.href = "/dashboard";
  }

  return (
    <main className="p-6 max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form className="space-y-3" onSubmit={signIn}>
        <input className="w-full border rounded p-2" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded p-2" placeholder="Password" type="password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full border rounded p-2">Sign in</button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>

      <p className="text-sm opacity-80">
        New shelter? Ask an admin for an invite code (or you can create a new org in onboarding).
      </p>
    </main>
  );
}
