import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Fetch all clusters with teams
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

        // Fetch all clusters with their teams
        const { data: clusters, error: clustersError } = await supabase
            .from('clusters')
            .select(`
                id,
                name,
                location,
                monitor_id,
                max_teams,
                current_stage,
                bidding_open,
                is_complete,
                winner_team_id,
                created_at
            `)
            .order('name');

        if (clustersError) {
            console.error('Clusters fetch error:', clustersError);
            return NextResponse.json(
                { error: 'Failed to fetch clusters' },
                { status: 500 }
            );
        }

        // Fetch all teams with cluster assignments
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select(`
                id,
                name,
                cluster_id,
                domain,
                balance,
                total_invested,
                total_received,
                is_finalized,
                is_qualified
            `)
            .order('name');

        if (teamsError) {
            console.error('Teams fetch error:', teamsError);
            return NextResponse.json(
                { error: 'Failed to fetch teams' },
                { status: 500 }
            );
        }

        // Get unassigned teams
        const unassignedTeams = teams?.filter(t => !t.cluster_id) || [];

        // Map teams to clusters
        const clustersWithTeams = clusters?.map(cluster => ({
            ...cluster,
            teams: teams?.filter(t => t.cluster_id === cluster.id) || [],
        })) || [];

        // Get statistics
        const stats = {
            totalClusters: clusters?.length || 0,
            totalTeams: teams?.length || 0,
            assignedTeams: teams?.filter(t => t.cluster_id).length || 0,
            unassignedTeams: unassignedTeams.length,
        };

        return NextResponse.json({
            clusters: clustersWithTeams,
            unassignedTeams,
            stats,
        });
    } catch (error) {
        console.error('Clusters fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Create a new cluster
export async function POST(request: NextRequest) {
    try {
        const { name, location, maxTeams } = await request.json();

        if (!name) {
            return NextResponse.json(
                { error: 'Cluster name is required' },
                { status: 400 }
            );
        }

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

        // Create cluster
        const { data: cluster, error: createError } = await supabase
            .from('clusters')
            .insert({
                name,
                location: location || null,
                max_teams: maxTeams || 10,
                current_stage: 'onboarding',
            })
            .select()
            .single();

        if (createError) {
            console.error('Cluster create error:', createError);
            return NextResponse.json(
                { error: 'Failed to create cluster' },
                { status: 500 }
            );
        }

        // Log the action
        await supabase.from('audit_logs').insert({
            event_type: 'cluster_created',
            actor_id: user.id,
            target_id: cluster.id,
            metadata: { cluster_name: name },
        });

        return NextResponse.json({
            success: true,
            cluster,
        });
    } catch (error) {
        console.error('Cluster create error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
