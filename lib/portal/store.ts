import { DemoStore } from "./demo-store";
import { supabaseConfigured } from "./supabase-server";
import { SupabaseStore } from "./supabase-store";
import type { PortalStore } from "./types";

/** The real database when Supabase is configured, otherwise the demo store. */
export async function getStore(): Promise<PortalStore> {
  return supabaseConfigured() ? SupabaseStore.create() : new DemoStore();
}
