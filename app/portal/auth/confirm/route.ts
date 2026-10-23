import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseForRequest } from "@/lib/portal/supabase-server";

const TYPES: EmailOtpType[] = ["email", "magiclink", "invite", "signup", "recovery", "email_change"];

/**
 * Where invitation and sign-in emails land when the Supabase email templates
 * link here with a token hash. Unlike /portal/auth/callback/ (a one-time code
 * tied to the browser that asked for it), this works on any device, so a
 * coach can request the link on a laptop and open it on her phone.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const target = request.nextUrl.clone();
  target.search = "";
  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await supabaseForRequest();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      target.pathname = "/portal/";
      return NextResponse.redirect(target);
    }
    console.error("[portal] sign-in link rejected:", error.code ?? error.message);
  }
  target.pathname = "/portal/login/";
  target.searchParams.set("error", "That sign-in link has expired or was already used. Please request a new one.");
  return NextResponse.redirect(target);
}
