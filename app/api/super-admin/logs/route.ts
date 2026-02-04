import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Fetch audit logs
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if user is super_admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Forbidden - Super Admin access required' },
                { status: 403 }
            );
        }

        // Parse query params
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const eventType = url.searchParams.get('event_type');

        // Build query
        let query = supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (eventType) {
            query = query.eq('event_type', eventType);
        }

        const { data: logs, error: logsError } = await query;

        if (logsError) {
            console.error('Logs fetch error:', logsError);
            return NextResponse.json(
                { error: 'Failed to fetch logs' },
                { status: 500 }
            );
        }

        // Get total count
        const { count } = await supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            logs: logs || [],
            total: count || 0,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Logs fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
