"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

export default function AdminPage() {
  const [role, setRole] = useState<"volunteer" | "admin">("volunteer");
  const [days, setDays] = useState(7);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  async function createCode() {
    setMsg("");
    setCode("");
    const { data, error } = await supabase.rpc("create_invite_code", {
      role_to_assign: role,
      days_valid: days,
    });
    if (error) return setMsg(error.message);
    setCode(String(data));
  }

  async function copy() {
    await navigator.clipboard.writeText(code);
    setMsg("Copied!");
  }

  return (
    <AuthGuard>
      <Navbar />
      <AdminGuard>
        <main className="p-6 max-w-3xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold">Admin</h1>

          <div className="border rounded p-4 space-y-3">
            <div className="font-semibold">Create Invite Code</div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <div className="text-sm">Role</div>
                <select className="w-full border rounded p-2" value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="volunteer">Volunteer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <div className="text-sm">Days valid</div>
                <input className="w-full border rounded p-2" type="number" min={1} value={days}
                  onChange={(e) => setDays(parseInt(e.target.value || "7", 10))} />
              </div>

              <div className="flex items-end">
                <button className="w-full border rounded p-2" onClick={createCode}>
                  Generate
                </button>
              </div>
            </div>

            {code && (
              <div className="border rounded p-3 flex items-center justify-between gap-3">
                <code className="text-sm">{code}</code>
                <button className="border px-3 py-1 rounded text-sm" onClick={copy}>Copy</button>
              </div>
            )}

            {msg && <p className="text-sm">{msg}</p>}
          </div>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}
