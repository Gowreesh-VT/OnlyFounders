import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const QR_SECRET = process.env.QR_SECRET || 'onlyfounders-qr-secret-key-2026';

// Generate signed QR token
function generateQRToken(entityId: string): string {
    const timestamp = Date.now().toString();
    const message = `${entityId}:${timestamp}`;
    const signature = crypto
        .createHmac('sha256', QR_SECRET)
        .update(message)
        .digest('hex');
    
    return `${entityId}:${timestamp}:${signature}`;
}

// POST: Refresh QR token for a user
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get user's entity_id
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('entity_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.entity_id) {
            return NextResponse.json(
                { error: 'Entity ID not found. Please complete onboarding first.' },
                { status: 400 }
            );
        }

        // Generate new QR token
        const qrToken = generateQRToken(profile.entity_id);

        // Update profile with new QR token
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                qr_token: qrToken,
                qr_generated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('QR token update error:', updateError);
            return NextResponse.json(
                { error: 'Failed to refresh QR token' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            qrToken,
            entityId: profile.entity_id,
        });
    } catch (error) {
        console.error('QR refresh error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET: Get current QR token
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get user's QR data
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('entity_id, qr_token, qr_generated_at')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            );
        }

        if (!profile.entity_id || !profile.qr_token) {
            return NextResponse.json(
                { error: 'Please complete onboarding first' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            entityId: profile.entity_id,
            qrToken: profile.qr_token,
            generatedAt: profile.qr_generated_at,
        });
    } catch (error) {
        console.error('QR fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
