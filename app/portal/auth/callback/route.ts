import { NextResponse, type NextRequest } from "next/server";
import { supabaseForRequest } from "@/lib/portal/supabase-server";

/** Where the emailed sign-in link lands: swap the one-time code for a session. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const target = request.nextUrl.clone();
  target.search = "";
  if (code) {
    const supabase = await supabaseForRequest();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      target.pathname = "/portal/";
      return NextResponse.redirect(target);
    }
  }
  target.pathname = "/portal/login/";
  target.searchParams.set("error", "That sign-in link has expired or was already used. Please request a new one.");
  return NextResponse.redirect(target);
}
