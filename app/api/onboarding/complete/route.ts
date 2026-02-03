import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const QR_SECRET = process.env.QR_SECRET || 'onlyfounders-qr-secret-key-2026';

// Generate unique Entity ID (e.g., OF-2026-A7F3)
function generateEntityId(): string {
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `OF-${year}-${randomHex}`;
}

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

export async function POST(request: NextRequest) {
    try {
        const { photoUrl } = await request.json();

        if (!photoUrl) {
            return NextResponse.json(
                { error: 'Photo URL is required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if user already has entity_id (already onboarded)
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('entity_id, qr_token')
            .eq('id', user.id)
            .single();

        let entityId = existingProfile?.entity_id;
        let qrToken = existingProfile?.qr_token;

        // Generate new entity_id if not exists
        if (!entityId) {
            // Generate unique entity_id with retry logic
            let attempts = 0;
            const maxAttempts = 5;

            while (attempts < maxAttempts) {
                entityId = generateEntityId();
                
                // Check if entity_id already exists
                const { data: existing } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('entity_id', entityId)
                    .maybeSingle();

                if (!existing) break;
                attempts++;
            }

            if (attempts >= maxAttempts) {
                return NextResponse.json(
                    { error: 'Failed to generate unique Entity ID. Please try again.' },
                    { status: 500 }
                );
            }
        }

        // Always generate fresh QR token
        qrToken = generateQRToken(entityId);

        // Update profile with photo, entity_id, and qr_token
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                photo_url: photoUrl,
                photo_uploaded_at: new Date().toISOString(),
                entity_id: entityId,
                qr_token: qrToken,
                qr_generated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Profile update error:', updateError);
            return NextResponse.json(
                { error: 'Failed to update profile' },
                { status: 500 }
            );
        }

        // Log the onboarding completion
        await supabase.from('audit_logs').insert({
            event_type: 'onboarding_completed',
            actor_id: user.id,
            target_id: user.id,
            metadata: {
                entity_id: entityId,
                photo_uploaded: true,
            },
        });

        return NextResponse.json({
            success: true,
            entityId,
            message: 'Onboarding completed successfully',
        });
    } catch (error) {
        console.error('Onboarding error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
