import { NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/security/csrf';

/**
 * GET /api/auth/csrf
 * Returns a new CSRF token for use in forms and API requests
 */
export async function GET() {
    const token = generateCSRFToken();

    return NextResponse.json({
        csrfToken: token
    }, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
    });
}
