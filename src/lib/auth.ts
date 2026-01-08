import { supabase } from "@/lib/supabaseClient";

export type Profile = {
  id: string;
  organization_id: string;
  full_name: string | null;
  role: "admin" | "volunteer";
};

export async function getSessionUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getMyProfile(): Promise<Profile | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name, role")
    .eq("id", user.id)
    .single();

  if (error) return null;
  return data as Profile;
}
