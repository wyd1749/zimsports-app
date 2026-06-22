import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/results'

  if (!code) {
    console.error('No OAuth code received')
    return NextResponse.redirect(new URL('/results?error=no_code', requestUrl.origin))
  }

  try {
    // Build the redirect response FIRST so we can set cookies on it
    const redirectUrl = new URL(next.startsWith('/') ? next : '/results', requestUrl.origin)
    const response = NextResponse.redirect(redirectUrl)

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Set on BOTH the cookie store AND the response headers
              cookieStore.set(name, value, options)
              response.cookies.set(name, value, {
                ...options,
                sameSite: 'lax',   // ← fixes the Chrome intermediate-site warning
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
              })
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth exchange error:', error)
      return NextResponse.redirect(
        new URL(
          `/results?error=oauth_exchange_failed&message=${encodeURIComponent(error.message)}`,
          requestUrl.origin
        )
      )
    }

    console.log('OAuth success ✅ redirecting to:', redirectUrl.toString())
    return response   // ← returns the response WITH the session cookies attached

  } catch (err: any) {
    console.error('Callback error:', err)
    return NextResponse.redirect(
      new URL(
        `/results?error=callback_failed&message=${encodeURIComponent(err?.message || 'Unknown error')}`,
        requestUrl.origin
      )
    )
  }
}