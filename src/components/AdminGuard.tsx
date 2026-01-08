"use client";

import { useEffect, useState } from "react";
import { getMyProfile } from "@/lib/auth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getMyProfile();
      if (!p) return setOk(false);
      setOk(p.role === "admin");
      if (p.role !== "admin") window.location.href = "/dashboard";
    })();
  }, []);

  if (ok === null) return <p className="p-6">Loading…</p>;
  if (!ok) return null;
  return <>{children}</>;
}
