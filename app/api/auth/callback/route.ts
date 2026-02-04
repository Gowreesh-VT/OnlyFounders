import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');

    // SECURITY: Validate next parameter to prevent open redirect attacks
    let next = searchParams.get('next') ?? '/dashboard';
    if (!next.startsWith('/') || next.startsWith('//') || next.includes('://')) {
        next = '/dashboard';
    }

    if (code) {
        const cookieStore = request.cookies;
        const response = NextResponse.redirect(`${origin}${next}`);
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        );
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return response;
        } else {
            console.error('Auth Callback Error:', error);
        }
    }

    // return the user to an error page with instructions
    // For now redirect to login with error
    return NextResponse.redirect(`${origin}/auth/login?error=auth_code_error`);
}
