import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { newLeaderId } = await request.json();

        if (!newLeaderId) {
            return NextResponse.json(
                { error: 'New leader ID is required' },
                { status: 400 }
            );
        }

        const supabase = await createAnonClient();
        const supabaseAdmin = createAdminClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Get current user's team membership
        const { data: currentMember, error: memberError } = await supabaseAdmin
            .from('team_members')
            .select('id, team_id, is_leader')
            .eq('user_id', user.id)
            .single();

        if (memberError || !currentMember) {
            return NextResponse.json(
                { error: 'You are not a member of any team' },
                { status: 400 }
            );
        }

        if (!currentMember.is_leader) {
            return NextResponse.json(
                { error: 'Only the team leader can transfer leadership' },
                { status: 403 }
            );
        }

        // Verify new leader is in the same team
        const { data: newLeaderMember, error: newLeaderError } = await supabaseAdmin
            .from('team_members')
            .select('id, user_id')
            .eq('team_id', currentMember.team_id)
            .eq('user_id', newLeaderId)
            .single();

        if (newLeaderError || !newLeaderMember) {
            return NextResponse.json(
                { error: 'Selected user is not a member of your team' },
                { status: 400 }
            );
        }

        // Update current leader to non-leader
        await supabaseAdmin
            .from('team_members')
            .update({ is_leader: false })
            .eq('id', currentMember.id);

        // Update new leader
        await supabaseAdmin
            .from('team_members')
            .update({ is_leader: true })
            .eq('id', newLeaderMember.id);

        // Update team's leader_id
        await supabaseAdmin
            .from('teams')
            .update({ leader_id: newLeaderId })
            .eq('id', currentMember.team_id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Transfer leadership error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
