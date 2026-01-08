"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getMyProfile, Profile } from "@/lib/auth";

export default function Navbar() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => setProfile(await getMyProfile()))();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="border-b">
      <div className="max-w-6xl mx-auto p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="font-bold">Inventory</div>

        <div className="flex gap-4 text-sm">
          <a className="underline" href="/dashboard">Dashboard</a>
          <a className="underline" href="/log">Log</a>
          <a className="underline" href="/wishlist">Wishlist</a>
          <a className="underline" href="/reports">Reports</a>
          {profile?.role === "admin" && (
            <>
              <a className="underline" href="/items">Items</a>
              <a className="underline" href="/locations">Locations</a>
              <a className="underline" href="/admin">Admin</a>
            </>
          )}
        </div>

        <button className="border px-3 py-1 rounded text-sm" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
