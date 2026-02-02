import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch admins for a college
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

        // Fetch admins for this college
        const { data: admins, error: adminsError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email, member_id, created_at')
            .eq('college_id', id)
            .eq('role', 'admin')
            .order('created_at', { ascending: false });

        if (adminsError) {
            console.error('Fetch admins error:', adminsError);
            return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
        }

        return NextResponse.json({ admins: admins || [] });
    } catch (error) {
        console.error('Get admins error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create a new admin for a college
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: collegeId } = await params;
        const { email, password, fullName } = await request.json();

        if (!email || !password || !fullName) {
            return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 });
        }

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

        // Get college to generate member ID
        const { data: college } = await supabaseAdmin
            .from('colleges')
            .select('name')
            .eq('id', collegeId)
            .single();

        if (!college) {
            return NextResponse.json({ error: 'College not found' }, { status: 404 });
        }

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError) {
            console.error('Create auth user error:', authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // Generate member ID
        const collegeCode = college.name
            .split(' ')
            .map((w: string) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 4);
        const year = new Date().getFullYear().toString().slice(-2);
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const memberId = `OF-${collegeCode}-${year}-${randomNum}`;

        // Create profile
        const { data: newAdmin, error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                email,
                full_name: fullName,
                role: 'admin',
                college_id: collegeId,
                member_id: memberId,
            })
            .select()
            .single();

        if (profileError) {
            console.error('Create profile error:', profileError);
            // Rollback auth user
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json({ error: 'Failed to create admin profile' }, { status: 500 });
        }

        return NextResponse.json({ admin: newAdmin });
    } catch (error) {
        console.error('Create admin error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
