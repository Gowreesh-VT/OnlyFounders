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

        // Get user's college
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('college_id')
            .eq('id', user.id)
            .single();

        if (!profile?.college_id) {
            return NextResponse.json({ schedule: [] });
        }

        // Get schedule events for user's college
        const { data: schedule, error } = await supabaseAdmin
            .from('schedule_events')
            .select('*')
            .eq('college_id', profile.college_id)
            .gte('event_date', new Date().toISOString().split('T')[0])
            .order('event_date', { ascending: true })
            .order('start_time', { ascending: true })
            .limit(20);

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ schedule: schedule || [] });
    } catch (error) {
        console.error('Get schedule error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
