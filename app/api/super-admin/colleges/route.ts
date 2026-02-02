import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET - Fetch all colleges with stats (super admin only)
export async function GET() {
    try {
        const supabase = await createAnonClient();
        const supabaseAdmin = createAdminClient();

        // Verify user is super admin
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Fetch all colleges
        const { data: colleges, error: collegesError } = await supabaseAdmin
            .from('colleges')
            .select('*')
            .order('name');

        if (collegesError) {
            console.error('Fetch colleges error:', collegesError);
            return NextResponse.json({ error: 'Failed to fetch colleges' }, { status: 500 });
        }

        // Get stats for each college
        const collegesWithStats = await Promise.all(
            (colleges || []).map(async (college) => {
                // Count students
                const { count: studentCount } = await supabaseAdmin
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('college_id', college.id)
                    .eq('role', 'student');

                // Count teams
                const { count: teamCount } = await supabaseAdmin
                    .from('teams')
                    .select('*', { count: 'exact', head: true })
                    .eq('college_id', college.id);

                // Count admins
                const { count: adminCount } = await supabaseAdmin
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('college_id', college.id)
                    .eq('role', 'admin');

                return {
                    ...college,
                    students: studentCount || 0,
                    teams: teamCount || 0,
                    admins: adminCount || 0,
                };
            })
        );

        // Calculate totals
        const totalColleges = collegesWithStats.length;
        const activeColleges = collegesWithStats.filter(c => c.status === 'active').length;
        const totalStudents = collegesWithStats.reduce((sum, c) => sum + c.students, 0);
        const totalTeams = collegesWithStats.reduce((sum, c) => sum + c.teams, 0);

        return NextResponse.json({
            colleges: collegesWithStats,
            stats: {
                totalColleges,
                activeColleges,
                totalStudents,
                totalTeams,
            },
        });
    } catch (error) {
        console.error('Super admin colleges error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
