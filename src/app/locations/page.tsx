"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { getMyProfile } from "@/lib/auth";

type Location = { id: string; name: string };

export default function LocationsPage() {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Location[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await supabase.from("locations").select("id,name").order("name");
    setRows((data as any) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const p = await getMyProfile();
    if (!p) return setMsg("Missing profile.");
    const { error } = await supabase.from("locations").insert({
      organization_id: p.organization_id,
      name
    });
    if (error) return setMsg(error.message);
    setName("");
    load();
  }

  return (
    <AuthGuard>
      <Navbar />
      <AdminGuard>
        <main className="p-6 max-w-3xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold">Locations</h1>

          <form className="border rounded p-4 space-y-3" onSubmit={add}>
            <input className="w-full border rounded p-2" placeholder="Location name (e.g., Pantry Shelf A)"
              value={name} onChange={(e) => setName(e.target.value)} required />
            <button className="border rounded px-3 py-2">Add Location</button>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
          </form>

          <div className="border rounded p-4">
            <div className="font-semibold mb-2">Current Locations</div>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {rows.map(r => <li key={r.id}>{r.name}</li>)}
              {!rows.length && <li className="opacity-70">No locations yet.</li>}
            </ul>
          </div>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}
