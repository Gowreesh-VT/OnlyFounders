import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function generateEntityId(): string {
    const year = new Date().getFullYear();
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `OF-${year}-${randomSuffix}`;
}

function generateQRToken(entityId: string): string {
    const timestamp = Date.now();
    const secret = process.env.QR_SIGNING_SECRET || 'default-secret-change-in-production';
    const data = `${entityId}:${timestamp}`;
    const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return `${data}:${signature}`;
}

export async function POST(request: NextRequest) {
    try {
        const { email, password, fullName, phoneNumber, teamId } = await request.json();

        if (!email || !password || !fullName) {
            return NextResponse.json(
                { error: 'Email, password, and full name are required' },
                { status: 400 }
            );
        }

        const supabase = await createAnonClient();
        const supabaseAdmin = createAdminClient();

        // Create auth user with admin client (auto-confirms email)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email for event
            user_metadata: {
                full_name: fullName,
            },
        });

        if (authError) {
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            );
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: 'Failed to create user' },
                { status: 500 }
            );
        }

        // Generate Entity ID and QR Token
        const entityId = generateEntityId();
        const qrToken = generateQRToken(entityId);

        // Create profile using service role (bypasses RLS)
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                email,
                full_name: fullName,
                phone_number: phoneNumber || null,
                team_id: teamId || null,
                role: 'participant',
                entity_id: entityId,
                qr_token: qrToken,
                qr_generated_at: new Date().toISOString(),
                password_changed: false,
            })
            .select('*')
            .single();

        if (profileError) {
            console.error('Profile creation error:', profileError);
            return NextResponse.json(
                { error: 'Failed to create profile: ' + profileError.message },
                { status: 500 }
            );
        }

        // Auto-login the user after registration
        const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        return NextResponse.json({
            user: {
                id: authData.user.id,
                email: authData.user.email,
                profile,
            },
            session: sessionData?.session,
        });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
