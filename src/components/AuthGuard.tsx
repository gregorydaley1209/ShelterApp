"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setOk(!!data.session);
      supabase.auth.onAuthStateChange((_e, s) => setOk(!!s));
    })();
  }, []);

  if (ok === null) return <p className="p-6">Loading…</p>;
  if (!ok) {
    if (typeof window !== "undefined") window.location.href = "/";
    return null;
  }
  return <>{children}</>;
}
