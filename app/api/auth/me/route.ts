import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createAnonClient();
        const supabaseAdmin = createAdminClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        console.log('Auth/me - User check:', { userId: user?.id, error: userError?.message });

        if (userError || !user) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Fetch user profile with college (use admin to bypass RLS)
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select(`
                *,
                college:colleges(*)
            `)
            .eq('id', user.id)
            .single();

        console.log('Auth/me - Profile:', { profileId: profile?.id, error: profileError?.message });

        if (profileError) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            );
        }

        // Get user's team membership (use admin to bypass RLS)
        const { data: teamMember, error: teamMemberError } = await supabaseAdmin
            .from('team_members')
            .select(`
                is_leader,
                team:teams(
                    *,
                    college:colleges(*)
                )
            `)
            .eq('user_id', user.id)
            .maybeSingle();

        console.log('Auth/me - Team member:', {
            hasTeam: !!teamMember?.team,
            isLeader: teamMember?.is_leader,
            error: teamMemberError?.message
        });

        // If user has a team, get all team members
        let teamWithMembers: any = teamMember?.team || null;
        if (teamWithMembers) {
            const { data: members, error: membersError } = await supabaseAdmin
                .from('team_members')
                .select(`
                    *,
                    user:profiles(*)
                `)
                .eq('team_id', (teamWithMembers as unknown as { id: string }).id);

            console.log('Auth/me - Team members count:', members?.length, 'error:', membersError?.message);

            teamWithMembers = {
                ...teamWithMembers,
                members: members || [],
            };
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                profile,
                team: teamWithMembers,
                isTeamLeader: teamMember?.is_leader || false,
            },
        });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
