import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, description, type = 'info', action_url } = body;

        if (!title || !description) {
            return NextResponse.json(
                { error: 'Title and description are required' },
                { status: 400 }
            );
        }

        const supabase = await createAnonClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const supabaseAdmin = createAdminClient();

        // Get user profile with college
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, college_id')
            .eq('id', user.id)
            .single();

        if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (!profile.college_id) {
            return NextResponse.json({ error: 'No college associated' }, { status: 400 });
        }

        // Get all students in this college
        const { data: students, error: studentsError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('college_id', profile.college_id)
            .eq('role', 'student');

        if (studentsError) {
            console.error('Error fetching students:', studentsError);
            return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
        }

        if (!students || students.length === 0) {
            return NextResponse.json({ error: 'No students found in your college' }, { status: 400 });
        }

        // Create notifications for all students
        const notifications = students.map(student => ({
            user_id: student.id,
            title,
            description,
            type,
            action_url: action_url || null,
            read: false,
        }));

        const { error: insertError } = await supabaseAdmin
            .from('notifications')
            .insert(notifications);

        if (insertError) {
            console.error('Error creating notifications:', insertError);
            return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Notification sent to ${students.length} students`,
            count: students.length,
        });
    } catch (error) {
        console.error('Send notification error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Get notification history
export async function GET() {
    try {
        const supabase = await createAnonClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const supabaseAdmin = createAdminClient();

        // Get user profile with college
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, college_id')
            .eq('id', user.id)
            .single();

        if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get recent unique notifications sent by this college (group by title/description)
        const { data: notifications, error } = await supabaseAdmin
            .from('notifications')
            .select(`
                title,
                description,
                type,
                created_at,
                user:profiles!inner(college_id)
            `)
            .eq('user.college_id', profile.college_id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching notifications:', error);
            return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
        }

        // Group by unique notifications
        const uniqueNotifications: Record<string, { title: string; description: string; type: string; created_at: string; count: number }> = {};

        notifications?.forEach(n => {
            const key = `${n.title}-${n.description}-${n.created_at.slice(0, 16)}`;
            if (!uniqueNotifications[key]) {
                uniqueNotifications[key] = {
                    title: n.title,
                    description: n.description || '',
                    type: n.type,
                    created_at: n.created_at,
                    count: 1,
                };
            } else {
                uniqueNotifications[key].count++;
            }
        });

        return NextResponse.json({
            notifications: Object.values(uniqueNotifications).slice(0, 10),
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
