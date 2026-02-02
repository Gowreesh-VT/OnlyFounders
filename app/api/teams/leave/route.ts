import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createAnonClient();
        const supabaseAdmin = createAdminClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Get user's team membership
        const { data: teamMember, error: memberError } = await supabaseAdmin
            .from('team_members')
            .select('id, team_id, is_leader')
            .eq('user_id', user.id)
            .single();

        if (memberError || !teamMember) {
            return NextResponse.json(
                { error: 'You are not a member of any team' },
                { status: 400 }
            );
        }

        // If user is the leader, they can't leave unless they transfer leadership first
        if (teamMember.is_leader) {
            // Check if there are other members
            const { count } = await supabaseAdmin
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', teamMember.team_id)
                .neq('user_id', user.id);

            if (count && count > 0) {
                return NextResponse.json(
                    { error: 'You must transfer leadership before leaving the team' },
                    { status: 400 }
                );
            }

            // If leader is the only member, delete the team
            await supabaseAdmin
                .from('teams')
                .delete()
                .eq('id', teamMember.team_id);

            return NextResponse.json({ success: true, teamDeleted: true });
        }

        // Remove user from team
        const { error: deleteError } = await supabaseAdmin
            .from('team_members')
            .delete()
            .eq('id', teamMember.id);

        if (deleteError) {
            return NextResponse.json(
                { error: 'Failed to leave team' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Leave team error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
