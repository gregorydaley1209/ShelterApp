"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (session) {
    return (
      <main className="p-6 max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Inventory App</h1>
        <p className="text-sm opacity-80">Logged in as {session.user.email}</p>

        <div className="flex gap-4">
          <a className="underline" href="/dashboard">Go to Dashboard</a>
          <button className="border px-3 py-1 rounded" onClick={signOut}>
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form className="space-y-3" onSubmit={signIn}>
        <input
          className="w-full border rounded p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded p-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="w-full border rounded p-2">Sign in</button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>
    </main>
  );
}
