import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
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

        // Get user's profile and team
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('college_id')
            .eq('id', user.id)
            .single();

        const { data: teamMember } = await supabaseAdmin
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .single();

        if (!profile?.college_id) {
            return NextResponse.json({ tasks: [] });
        }

        // Get global tasks for user's college
        const { data: globalTasks, error: tasksError } = await supabaseAdmin
            .from('tasks')
            .select('*')
            .eq('college_id', profile.college_id)
            .eq('is_global', true)
            .order('deadline', { ascending: true });

        if (tasksError) {
            return NextResponse.json(
                { error: tasksError.message },
                { status: 500 }
            );
        }

        // If user has a team, get team-specific task statuses
        let tasksWithStatus = globalTasks || [];

        if (teamMember?.team_id && globalTasks) {
            const { data: teamTasks } = await supabaseAdmin
                .from('team_tasks')
                .select('*')
                .eq('team_id', teamMember.team_id);

            const teamTaskMap = new Map(
                (teamTasks || []).map(tt => [tt.task_id, tt])
            );

            tasksWithStatus = globalTasks.map(task => ({
                ...task,
                teamStatus: teamTaskMap.get(task.id)?.status || 'pending',
                completedAt: teamTaskMap.get(task.id)?.completed_at || null,
            }));
        }

        return NextResponse.json({ tasks: tasksWithStatus });
    } catch (error) {
        console.error('Get tasks error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
