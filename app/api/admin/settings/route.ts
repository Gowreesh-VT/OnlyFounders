import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Type for hackathon settings matching database
type HackathonSettings = {
    id?: string;
    college_id?: string;
    hackathon_name: string;
    start_date: string | null;
    end_date: string | null;
    submission_deadline: string | null;
    late_submissions_allowed: boolean;
    penalty_deduction: number;
};

const defaultSettings: Omit<HackathonSettings, 'id' | 'college_id'> = {
    hackathon_name: 'OnlyFounders Hackathon',
    start_date: null,
    end_date: null,
    submission_deadline: null,
    late_submissions_allowed: false,
    penalty_deduction: 10,
};

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

        if (!profile.college_id) {
            return NextResponse.json({ settings: defaultSettings });
        }

        // Get hackathon settings for this college
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('hackathon_settings')
            .select('*')
            .eq('college_id', profile.college_id)
            .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
            console.error('Get settings error:', settingsError);
        }

        // Return settings or defaults
        return NextResponse.json({
            settings: settings || { ...defaultSettings, college_id: profile.college_id }
        });
    } catch (error) {
        console.error('Get settings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
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

        // Check if settings exist for this college
        const { data: existingSettings } = await supabaseAdmin
            .from('hackathon_settings')
            .select('id')
            .eq('college_id', profile.college_id)
            .single();

        const settingsData = {
            college_id: profile.college_id,
            hackathon_name: body.hackathon_name || 'OnlyFounders Hackathon',
            start_date: body.start_date || null,
            end_date: body.end_date || null,
            submission_deadline: body.submission_deadline || null,
            late_submissions_allowed: body.late_submissions_allowed ?? false,
            penalty_deduction: body.penalty_deduction ?? 10,
            updated_at: new Date().toISOString(),
        };

        let result;
        if (existingSettings) {
            // Update existing
            const { data, error } = await supabaseAdmin
                .from('hackathon_settings')
                .update(settingsData)
                .eq('id', existingSettings.id)
                .select()
                .single();

            if (error) {
                console.error('Update settings error:', error);
                return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
            }
            result = data;
        } else {
            // Insert new
            const { data, error } = await supabaseAdmin
                .from('hackathon_settings')
                .insert(settingsData)
                .select()
                .single();

            if (error) {
                console.error('Insert settings error:', error);
                return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
            }
            result = data;
        }

        return NextResponse.json({ settings: result });
    } catch (error) {
        console.error('Update settings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
