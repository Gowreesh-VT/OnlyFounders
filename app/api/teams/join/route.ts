import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { code } = await request.json();

        if (!code) {
            return NextResponse.json(
                { error: 'Team code is required' },
                { status: 400 }
            );
        }

        const supabase = await createAnonClient();
        const supabaseAdmin = createAdminClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Check if user already has a team
        const { data: existingMember } = await supabaseAdmin
            .from('team_members')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (existingMember) {
            return NextResponse.json(
                { error: 'You are already a member of a team' },
                { status: 400 }
            );
        }

        // Clean the code (remove dash if present)
        const cleanCode = code.replace('-', '').toUpperCase();

        // Find team by code
        const { data: team, error: teamError } = await supabaseAdmin
            .from('teams')
            .select(`
        *,
        college:colleges(*)
      `)
            .eq('code', cleanCode)
            .single();

        if (teamError || !team) {
            return NextResponse.json(
                { error: 'Invalid team code' },
                { status: 404 }
            );
        }

        // Check team size
        const { count } = await supabaseAdmin
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

        if (count && count >= team.size) {
            return NextResponse.json(
                { error: 'Team is full' },
                { status: 400 }
            );
        }

        // Add user as team member
        const { error: memberError } = await supabaseAdmin
            .from('team_members')
            .insert({
                team_id: team.id,
                user_id: user.id,
                is_leader: false,
            });

        if (memberError) {
            console.error('Team member error:', memberError);
            return NextResponse.json(
                { error: 'Failed to join team' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            team: {
                ...team,
                displayCode: team.code.slice(0, 3) + '-' + team.code.slice(3),
            },
        });
    } catch (error) {
        console.error('Join team error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
