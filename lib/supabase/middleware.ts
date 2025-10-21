import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  console.log("[v0] Middleware: Processing request for path:", request.nextUrl.pathname)

  if (request.nextUrl.pathname.startsWith("/api/webhooks/")) {
    console.log("[v0] Middleware: ALLOWING WEBHOOK ROUTE - bypassing all auth checks")
    return NextResponse.next()
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    console.log("[v0] Middleware: Allowing API route:", request.nextUrl.pathname)
    return NextResponse.next()
  }

  const isStaticAsset =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/logos") ||
    request.nextUrl.pathname.startsWith("/images") ||
    request.nextUrl.pathname.startsWith("/favicon") ||
    request.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/)

  if (isStaticAsset) {
    console.log("[v0] Middleware: Allowing static asset:", request.nextUrl.pathname)
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[v0] Middleware: User authenticated:", !!user)

  const publicPaths = ["/", "/auth", "/login", "/signup", "/terms", "/privacy", "/cookies"]
  const isPublicPath = publicPaths.some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + "/"),
  )

  console.log("[v0] Middleware: Is public path:", isPublicPath, "for path:", request.nextUrl.pathname)

  if (!user && !isPublicPath) {
    console.log("[v0] Middleware: Redirecting to /auth/login - no user and not a public path")
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  console.log("[v0] Middleware: Allowing request to proceed")
  return supabaseResponse
}
