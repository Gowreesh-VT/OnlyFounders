import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch single college with details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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

        // Fetch college
        const { data: college, error: collegeError } = await supabaseAdmin
            .from('colleges')
            .select('*')
            .eq('id', id)
            .single();

        if (collegeError || !college) {
            return NextResponse.json({ error: 'College not found' }, { status: 404 });
        }

        // Get stats
        const { count: studentCount } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('college_id', id)
            .eq('role', 'student');

        const { count: teamCount } = await supabaseAdmin
            .from('teams')
            .select('*', { count: 'exact', head: true })
            .eq('college_id', id);

        const { data: admins } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email')
            .eq('college_id', id)
            .eq('role', 'admin');

        return NextResponse.json({
            college: {
                ...college,
                students: studentCount || 0,
                teams: teamCount || 0,
                admins: admins || [],
            },
        });
    } catch (error) {
        console.error('Get college error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH - Update college
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, location, logoUrl, status, internalDetails } = body;

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

        // Update college
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (name) updateData.name = name;
        if (location !== undefined) updateData.location = location;
        if (logoUrl !== undefined) updateData.logo_url = logoUrl;
        if (status) updateData.status = status;
        if (internalDetails !== undefined) updateData.internal_details = internalDetails;

        const { data: college, error: updateError } = await supabaseAdmin
            .from('colleges')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Update college error:', updateError);
            return NextResponse.json({ error: 'Failed to update college' }, { status: 500 });
        }

        return NextResponse.json({ college });
    } catch (error) {
        console.error('Update college error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete college
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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

        // Delete college
        const { error: deleteError } = await supabaseAdmin
            .from('colleges')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Delete college error:', deleteError);
            return NextResponse.json({ error: 'Failed to delete college' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete college error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
