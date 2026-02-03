import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateSecurePassword, sendBulkCredentials } from '@/lib/email/sender';
import crypto from 'crypto';

function generateEntityId(): string {
    const year = new Date().getFullYear();
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `OF-${year}-${randomSuffix}`;
}

function generateQRToken(entityId: string): string {
    const timestamp = Date.now();
    const secret = process.env.QR_SECRET || 'onlyfounders-qr-secret-key-2026';
    const data = `${entityId}:${timestamp}`;
    const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return `${data}:${signature}`;
}

interface CSVParticipant {
    fullName: string;
    email: string;
    collegeName: string;
    teamName: string;
    role: 'participant' | 'team_lead' | 'admin' | 'super_admin' | 'gate_volunteer' | 'event_coordinator';
    phoneNumber?: string;
    domain?: string; // Team domain: fintech, edtech, healthtech, etc.
}

export async function POST(request: NextRequest) {
    try {
        const { participants } = await request.json() as { participants: CSVParticipant[] };

        if (!participants || !Array.isArray(participants)) {
            return NextResponse.json(
                { error: 'Invalid participants data' },
                { status: 400 }
            );
        }

        const supabaseAdmin = createAdminClient();

        // Simple user creation - no college/team tables needed
        const results = {
            success: [] as any[],
            failed: [] as any[],
        };

        const emailList: Array<{
            email: string;
            fullName: string;
            password: string;
        }> = [];

        for (const participant of participants) {
            try {
                const password = generateSecurePassword(12);
                const entityId = generateEntityId();
                const qrToken = generateQRToken(entityId);

                // Create auth user
                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email: participant.email,
                    password,
                    email_confirm: true,
                });

                if (authError) throw authError;

                // Find college_id if collegeName provided
                let collegeId = null;
                if (participant.collegeName) {
                    const { data: college } = await supabaseAdmin
                        .from('colleges')
                        .select('id')
                        .eq('name', participant.collegeName)
                        .single();
                    collegeId = college?.id || null;
                }

                // Find team_id if teamName provided
                let teamId = null;
                if (participant.teamName) {
                    const { data: team } = await supabaseAdmin
                        .from('teams')
                        .select('id')
                        .eq('name', participant.teamName)
                        .single();
                    teamId = team?.id || null;
                }

                // Create profile with all fields
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .insert({
                        id: authData.user.id,
                        email: participant.email,
                        full_name: participant.fullName,
                        phone_number: participant.phoneNumber?.toString() || null,
                        role: participant.role,
                        entity_id: entityId,
                        qr_token: qrToken,
                        college_id: collegeId,
                        team_id: teamId,
                    });

                if (profileError) throw profileError;

                results.success.push({
                    email: participant.email,
                    team: participant.teamName,
                    password: password,
                    entity_id: entityId,
                });

                emailList.push({
                    email: participant.email,
                    fullName: participant.fullName,
                    password,
                });

            } catch (error: any) {
                results.failed.push({
                    email: participant.email,
                    error: error.message,
                });
            }
        }

        // Step 4: Send emails in bulk
        const emailResults = await sendBulkCredentials(emailList);

        return NextResponse.json({
            message: 'Bulk import completed',
            imported: results.success.length,
            failed: results.failed.length,
            emailsSent: emailResults.success.length,
            emailsFailed: emailResults.failed.length,
            details: {
                importResults: results,
                emailResults,
            },
        });

    } catch (error: any) {
        console.error('Bulk import error:', error);
        return NextResponse.json(
            { error: 'Bulk import failed: ' + error.message },
            { status: 500 }
        );
    }
}
