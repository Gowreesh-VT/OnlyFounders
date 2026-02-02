import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST - Create a new college (super admin only)
export async function POST(request: NextRequest) {
    try {
        const { name, location, logoUrl, status } = await request.json();

        if (!name) {
            return NextResponse.json({ error: 'College name is required' }, { status: 400 });
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

        // Create college
        const { data: college, error: createError } = await supabaseAdmin
            .from('colleges')
            .insert({
                name,
                location: location || null,
                logo_url: logoUrl || null,
                status: status || 'active',
            })
            .select()
            .single();

        if (createError) {
            console.error('Create college error:', createError);
            return NextResponse.json({ error: 'Failed to create college' }, { status: 500 });
        }

        return NextResponse.json({ college });
    } catch (error) {
        console.error('Create college error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
