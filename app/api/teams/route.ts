import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

function generateTeamCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code.slice(0, 3) + '-' + code.slice(3);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { teamName, collegeId, size, track } = body;

        console.log('Create team request:', { teamName, collegeId, size, track });

        if (!teamName || !collegeId) {
            return NextResponse.json(
                { error: 'Team name and college are required' },
                { status: 400 }
            );
        }

        const supabase = await createAnonClient();
        const supabaseAdmin = createAdminClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        console.log('Auth check:', { userId: user?.id, userError: userError?.message });

        if (userError || !user) {
            return NextResponse.json(
                { error: 'Not authenticated. Please log in first.' },
                { status: 401 }
            );
        }

        // Check if user already has a team
        const { data: existingMember, error: memberCheckError } = await supabaseAdmin
            .from('team_members')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        console.log('Existing member check:', { existingMember, memberCheckError: memberCheckError?.message });

        if (existingMember) {
            return NextResponse.json(
                { error: 'You are already a member of a team' },
                { status: 400 }
            );
        }

        // Generate unique team code
        let teamCode = generateTeamCode();
        let codeExists = true;
        let attempts = 0;
        while (codeExists && attempts < 10) {
            const { data: existing } = await supabaseAdmin
                .from('teams')
                .select('id')
                .eq('code', teamCode.replace('-', ''))
                .maybeSingle();
            if (!existing) {
                codeExists = false;
            } else {
                teamCode = generateTeamCode();
            }
            attempts++;
        }

        console.log('Generated team code:', teamCode.replace('-', ''));

        // Create team
        const { data: team, error: teamError } = await supabaseAdmin
            .from('teams')
            .insert({
                name: teamName,
                code: teamCode.replace('-', ''),
                college_id: collegeId,
                leader_id: user.id,
                size: size || 4,
                track: track || 'Open',
                status: 'approved',
            })
            .select()
            .single();

        if (teamError) {
            console.error('Team creation error:', teamError);
            return NextResponse.json(
                { error: `Failed to create team: ${teamError.message}` },
                { status: 500 }
            );
        }

        console.log('Team created:', team.id);

        // Add user as team member (leader)
        const { error: memberError } = await supabaseAdmin
            .from('team_members')
            .insert({
                team_id: team.id,
                user_id: user.id,
                is_leader: true,
            });

        if (memberError) {
            console.error('Team member error:', memberError);
            // Rollback team creation
            await supabaseAdmin.from('teams').delete().eq('id', team.id);
            return NextResponse.json(
                { error: `Failed to add team member: ${memberError.message}` },
                { status: 500 }
            );
        }

        console.log('Team member added successfully');

        return NextResponse.json({
            team: {
                ...team,
                displayCode: team.code.slice(0, 3) + '-' + team.code.slice(3),
            },
        });
    } catch (error) {
        console.error('Create team error:', error);
        return NextResponse.json(
            { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 500 }
        );
    }
}


export async function GET() {
    try {
        const supabase = await createAnonClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Get user's team
        const { data: teamMember } = await supabase
            .from('team_members')
            .select(`
        is_leader,
        team:teams(
          *,
          college:colleges(*)
        )
      `)
            .eq('user_id', user.id)
            .single();

        if (!teamMember?.team) {
            return NextResponse.json({ team: null });
        }

        // Get all team members
        const { data: members } = await supabase
            .from('team_members')
            .select(`
        *,
        user:profiles(*)
      `)
            .eq('team_id', (teamMember.team as unknown as { id: string }).id);

        const teamWithCode = teamMember.team as unknown as { code: string; id: string };

        return NextResponse.json({
            team: {
                ...(teamMember.team as any),
                displayCode: teamWithCode.code.slice(0, 3) + '-' + teamWithCode.code.slice(3),
                members: members || [],
            },
            isLeader: teamMember.is_leader,
        });
    } catch (error) {
        console.error('Get team error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
