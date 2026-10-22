/**
 * Keeps coaches' sign-in sessions fresh and sends signed-out visitors to the
 * sign-in page. Runs only on /portal pages, and only once Supabase is set up
 * (before that, the portal shows demo data and needs no sign-in).
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const open = path.startsWith("/portal/login") || path.startsWith("/portal/auth");
  if (!data.user && !open) {
    const login = request.nextUrl.clone();
    login.pathname = "/portal/login/";
    login.search = "";
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/portal/:path*"],
};
