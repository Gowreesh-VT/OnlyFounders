import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const supabase = await createAnonClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const supabaseAdmin = createAdminClient();

        // Check if user is admin
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get team details with members
        const { data: team, error: teamError } = await supabaseAdmin
            .from('teams')
            .select(`
                id,
                name,
                code,
                track,
                status,
                created_at,
                leader:profiles!teams_leader_id_fkey(id, full_name, email),
                college:colleges(name)
            `)
            .eq('id', id)
            .single();

        if (teamError) {
            console.error('Error fetching team:', teamError);
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        // Get team members
        const { data: members, error: membersError } = await supabaseAdmin
            .from('team_members')
            .select(`
                id,
                is_leader,
                joined_at,
                user:profiles(
                    id,
                    full_name,
                    email,
                    member_id
                )
            `)
            .eq('team_id', id)
            .order('is_leader', { ascending: false });

        if (membersError) {
            console.error('Error fetching members:', membersError);
            return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
        }

        // Get submission details
        const { data: submission } = await supabaseAdmin
            .from('submissions')
            .select(`
                id,
                project_title,
                idea,
                drive_link,
                status,
                submitted_at,
                admin_notes
            `)
            .eq('team_id', id)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .single();

        return NextResponse.json({
            team: {
                ...team,
                members: members || [],
                submission: submission || null,
            },
        });
    } catch (error) {
        console.error('Get team error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
