import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = createAdminClient();

        // Fetch all colleges - no status filter to ensure they appear
        // You can add .eq('status', 'active') back once colleges have status set
        const { data: colleges, error } = await supabase
            .from('colleges')
            .select('*')
            .order('name');

        if (error) {
            console.error('Supabase colleges error:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        console.log('Fetched colleges:', colleges?.length || 0);
        return NextResponse.json({ colleges: colleges || [] });
    } catch (error) {
        console.error('Get colleges error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
