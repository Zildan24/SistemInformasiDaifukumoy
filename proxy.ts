import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/login"]);

export default clerkMiddleware(async (auth, request) => {
  console.log("PROXY EXECUTING FOR PATH:", request.nextUrl.pathname);
  const { userId } = await auth();

  if (userId && isPublicRoute(request)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Role-based routing at the edge
  if (userId && request.nextUrl.pathname === "/") {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/users?clerk_id=eq.${userId}&select=role`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            cache: "no-store", 
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const role = data[0].role?.toLowerCase();
            if (role === "reseller") {
              return NextResponse.redirect(new URL("/reseller", request.url));
            }
          } else {
            // Default for new users before AuthContext inserts them
            return NextResponse.redirect(new URL("/reseller", request.url));
          }
        }
      }
    } catch (e) {
      console.error("Middleware fetch error:", e);
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
