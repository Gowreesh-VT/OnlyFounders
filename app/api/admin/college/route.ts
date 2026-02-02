import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createAnonClient();
        const supabaseAdmin = createAdminClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, college_id')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin' || !profile.college_id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { data: college, error: collegeError } = await supabaseAdmin
            .from('colleges')
            .select('*')
            .eq('id', profile.college_id)
            .single();

        if (collegeError || !college) {
            return NextResponse.json({ error: 'College not found' }, { status: 404 });
        }

        return NextResponse.json({ college });
    } catch (error) {
        console.error('Get college details error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { internalDetails } = body;

        const supabase = await createAnonClient();
        const supabaseAdmin = createAdminClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, college_id')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin' || !profile.college_id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (internalDetails) {
            const { error: updateError } = await supabaseAdmin
                .from('colleges')
                .update({ internal_details: internalDetails, updated_at: new Date().toISOString() })
                .eq('id', profile.college_id);

            if (updateError) {
                console.error('Update college error:', updateError);
                return NextResponse.json({ error: 'Failed to update details' }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update college details error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
