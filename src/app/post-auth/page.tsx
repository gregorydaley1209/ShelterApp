"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PostAuthPage() {
  const [msg, setMsg] = useState("Finishing setup…");

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        window.location.href = "/";
        return;
      }

      async function setOrgStorage(orgId: string) {
        const { data: org, error } = await supabase
          .from("organizations")
          .select("id,name")
          .eq("id", orgId)
          .single();

        localStorage.setItem("selected_org_id", orgId);
        if (!error && org?.name) {
          localStorage.setItem("selected_org_name", org.name);
        } else {
          localStorage.setItem("selected_org_name", "Your Shelter");
        }
      }

      // 1) Read profile -> DB is source of truth
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      const dbOrgId = profile?.organization_id
        ? String(profile.organization_id)
        : null;

      // If profile row missing OR org missing, send to join (or you can send to select-shelter)
      // For your shared-login model, this should basically never happen once shelters are created properly.
      if (!dbOrgId) {
        // If query errored for something other than "row not found"
        if (profileErr && profileErr.code !== "PGRST116") {
          window.location.href = "/select-shelter";
          return;
        }

        // If you still want invite flow as fallback, keep it.
        // Otherwise just force shelter selection.
        window.location.href = "/select-shelter";
        return;
      }

      // 2) Enforce "selected shelter" must match the account's org
      const selectedOrgId = localStorage.getItem("selected_org_id");
      if (selectedOrgId && selectedOrgId !== dbOrgId) {
        setMsg("Wrong shelter selected. Sending you back…");

        // sign them out to prevent cross-shelter confusion
        await supabase.auth.signOut();

        localStorage.setItem(
          "auth_error",
          "You selected a different shelter than the account you logged into. Please pick the correct shelter and try again."
        );

        window.location.href = "/select-shelter";
        return;
      }

      // 3) If they didn't pick a shelter first, sync selection from DB
      if (!selectedOrgId) {
        setMsg("Syncing your shelter…");
        await setOrgStorage(dbOrgId);
      }

      // Clear any stale invite state
      localStorage.removeItem("pending_invite_code");
      localStorage.removeItem("invite_error");

      window.location.href = "/dashboard";
    })();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6">
        <div className="text-sm text-slate-500">Shelter Inventory</div>
        <div className="mt-2 text-base font-semibold text-slate-900">{msg}</div>
        <div className="mt-2 text-sm text-slate-600">
          Please don’t close this tab.
        </div>
      </div>
    </main>
  );
}
