import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/// Refreshes the Supabase session cookie on each request so server components
/// reading `auth.getUser()` always see a fresh state. Returns the response so
/// middleware can either pass it through or replace it with a redirect.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: CookieToSet[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Routes reachable without a session:
  //   /login       — sign-in page
  //   /auth/*      — invite/recovery callback + accept-invite page; these
  //                  must be reachable both before AND after the session
  //                  cookie lands (the invite flow toggles between states
  //                  mid-flight, and bouncing them around mid-flight breaks
  //                  the set-password form).
  const isPublicPath = path === "/login" || path.startsWith("/auth/");
  const isPublicAsset =
    path.startsWith("/_next") || path.startsWith("/favicon") || path === "/api/health";

  if (!user && !isPublicPath && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Only auto-bounce authenticated users away from /login — never from /auth/*,
  // because /auth/accept is *meant* to be visited while authenticated (to set
  // an initial password after clicking an invite link).
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
