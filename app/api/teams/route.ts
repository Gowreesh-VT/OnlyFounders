import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create authenticated client (same pattern as invest API)
async function createAuthClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                },
            },
        }
    );
}

// GET /api/teams - Fetch user's team information
export async function GET(request: NextRequest) {
    try {
        // Get current user using auth client
        const supabase = await createAuthClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Get user's profile using admin client (bypass RLS)
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Profile fetch error:', profileError);
            return NextResponse.json(
                { error: 'Failed to fetch profile' },
                { status: 500 }
            );
        }

        if (!profile.team_id) {
            return NextResponse.json({ team: null });
        }

        // Get team info with cluster and college using admin client
        const { data: team, error: teamError } = await supabaseAdmin
            .from('teams')
            .select(`
                *,
                cluster:clusters!teams_cluster_id_fkey(
                    id,
                    name,
                    pitch_order
                ),
                college:colleges(
                    id,
                    name
                )
            `)
            .eq('id', profile.team_id)
            .single();

        if (teamError) {
            console.error('Team fetch error:', teamError);
            return NextResponse.json(
                { error: 'Failed to fetch team information' },
                { status: 500 }
            );
        }

        // Get all team members using admin client
        const { data: members, error: membersError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email, role, entity_id')
            .eq('team_id', profile.team_id);

        if (membersError) {
            console.error('Members fetch error:', membersError);
        }

        return NextResponse.json({
            team: {
                ...team,
                members: members || []
            },
            isLeader: profile.role === 'team_lead'
        });
    } catch (error) {
        console.error('Teams API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
