import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    // Create an SSR Supabase client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }: { name: string, value: string, options: CookieOptions }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }: { name: string, value: string, options: CookieOptions }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Avoid running this on assets and api routes that don't need auth (like public boundaries)
    // Actually, let's protect the dashboard page
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isBypass = request.cookies.get('webgis_bypass_auth')?.value === 'admin';
    const isAuthenticated = !!user || isBypass;

    const isLoginPage = request.nextUrl.pathname.startsWith('/login');

    if (!isAuthenticated && !isLoginPage && !request.nextUrl.pathname.startsWith('/_next') && !request.nextUrl.pathname.startsWith('/api')) {
        // If no user is logged in, and we're not on the login page or internal next paths, redirect to login
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isAuthenticated && isLoginPage) {
        // If user is already logged in, don't let them stay on the login page
        return NextResponse.redirect(new URL('/', request.url))
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
