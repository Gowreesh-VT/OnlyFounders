import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

        // Get user's profile to check role
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, college_id')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            );
        }

        // Get user's team
        const { data: teamMember } = await supabaseAdmin
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .single();

        let submissions;

        if (profile.role === 'admin' || profile.role === 'super_admin') {
            // Admins see all submissions for their college
            const { data, error } = await supabaseAdmin
                .from('submissions')
                .select(`
          *,
          team:teams(
            *,
            college:colleges(*)
          )
        `)
                .order('submitted_at', { ascending: false });

            if (error) throw error;

            // Filter by college for admins
            if (profile.role === 'admin' && profile.college_id) {
                submissions = data?.filter(
                    (s: { team?: { college_id?: string } }) => s.team?.college_id === profile.college_id
                );
            } else if (profile.role === 'super_admin') {
                // Check if specific college ID is requested
                const url = new URL(request.url);
                const collegeId = url.searchParams.get('collegeId');

                if (collegeId) {
                    submissions = data?.filter(
                        (s: { team?: { college_id?: string } }) => s.team?.college_id === collegeId
                    );
                } else {
                    submissions = data;
                }
            } else {
                submissions = data;
            }
        } else {
            // Students see only their team's submissions
            if (!teamMember) {
                return NextResponse.json({ submissions: [] });
            }

            const { data, error } = await supabaseAdmin
                .from('submissions')
                .select(`
          *,
          team:teams(*)
        `)
                .eq('team_id', teamMember.team_id)
                .order('submitted_at', { ascending: false });

            if (error) throw error;
            submissions = data;
        }

        return NextResponse.json({ submissions: submissions || [] });
    } catch (error) {
        console.error('Get submissions error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { projectTitle, idea, driveLink, publicAccessConfirmed } = await request.json();

        if (!projectTitle || !idea || !driveLink) {
            return NextResponse.json(
                { error: 'All fields are required' },
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

        // Get user's team
        const { data: teamMember } = await supabaseAdmin
            .from('team_members')
            .select('team_id, is_leader')
            .eq('user_id', user.id)
            .single();

        if (!teamMember) {
            return NextResponse.json(
                { error: 'You must be in a team to submit' },
                { status: 400 }
            );
        }

        // Create submission
        const { data: submission, error: submissionError } = await supabaseAdmin
            .from('submissions')
            .insert({
                team_id: teamMember.team_id,
                project_title: projectTitle,
                idea,
                drive_link: driveLink,
                public_access_confirmed: publicAccessConfirmed || false,
                status: 'not_viewed',
            })
            .select()
            .single();

        if (submissionError) {
            console.error('Submission error:', submissionError);
            return NextResponse.json(
                { error: 'Failed to create submission' },
                { status: 500 }
            );
        }

        return NextResponse.json({ submission });
    } catch (error) {
        console.error('Create submission error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
