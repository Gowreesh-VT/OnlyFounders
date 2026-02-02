import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ teamId: string }> }
) {
    try {
        const { teamId } = await params;

        const supabase = await createAnonClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const supabaseAdmin = createAdminClient();

        // Verify user is part of this team
        const { data: membership } = await supabaseAdmin
            .from('team_members')
            .select('id')
            .eq('team_id', teamId)
            .eq('user_id', user.id)
            .single();

        if (!membership) {
            return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
        }

        // Get the team's submission
        const { data: submission, error: submissionError } = await supabaseAdmin
            .from('submissions')
            .select(`
                id,
                project_title,
                idea,
                drive_link,
                public_access_confirmed,
                status,
                admin_notes,
                submitted_at,
                updated_at,
                team:teams(
                    id,
                    name,
                    code,
                    leader_id
                )
            `)
            .eq('team_id', teamId)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .single();

        if (submissionError && submissionError.code !== 'PGRST116') {
            console.error('Error fetching submission:', submissionError);
            return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
        }

        return NextResponse.json({ submission: submission || null });
    } catch (error) {
        console.error('Get team submission error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
