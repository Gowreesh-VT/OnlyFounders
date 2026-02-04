import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// POST: Shuffle teams and assign to clusters
export async function POST(request: NextRequest) {
    try {
        const { clearPrevious = true, teamsPerCluster = 10 } = await request.json();

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

        // Fetch all teams
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('id, name')
            .order('name');

        if (teamsError || !teams) {
            return NextResponse.json(
                { error: 'Failed to fetch teams' },
                { status: 500 }
            );
        }

        if (teams.length === 0) {
            return NextResponse.json(
                { error: 'No teams found to shuffle' },
                { status: 400 }
            );
        }

        // Fetch all clusters
        const { data: clusters, error: clustersError } = await supabase
            .from('clusters')
            .select('id, name, max_teams')
            .order('name');

        if (clustersError || !clusters || clusters.length === 0) {
            return NextResponse.json(
                { error: 'No clusters found. Please create clusters first.' },
                { status: 400 }
            );
        }

        // Clear previous assignments if requested
        if (clearPrevious) {
            const { error: clearError } = await supabase
                .from('teams')
                .update({ cluster_id: null })
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

            if (clearError) {
                console.error('Clear assignments error:', clearError);
                return NextResponse.json(
                    { error: 'Failed to clear previous assignments' },
                    { status: 500 }
                );
            }
        }

        // Shuffle teams
        const shuffledTeams = shuffleArray(teams);

        // Distribute teams to clusters
        const assignments: { teamId: string; teamName: string; clusterId: string; clusterName: string }[] = [];
        let clusterIndex = 0;
        const clusterCounts: Record<string, number> = {};

        // Initialize cluster counts
        clusters.forEach(c => {
            clusterCounts[c.id] = 0;
        });

        for (const team of shuffledTeams) {
            // Find next cluster with available space
            let foundCluster = false;
            let attempts = 0;

            while (!foundCluster && attempts < clusters.length) {
                const cluster = clusters[clusterIndex];
                const maxTeams = cluster.max_teams || teamsPerCluster;

                if (clusterCounts[cluster.id] < maxTeams) {
                    // Assign team to cluster
                    const { error: assignError } = await supabase
                        .from('teams')
                        .update({ cluster_id: cluster.id })
                        .eq('id', team.id);

                    if (assignError) {
                        console.error('Assignment error:', assignError);
                    } else {
                        assignments.push({
                            teamId: team.id,
                            teamName: team.name,
                            clusterId: cluster.id,
                            clusterName: cluster.name,
                        });
                        clusterCounts[cluster.id]++;
                        foundCluster = true;
                    }
                }

                clusterIndex = (clusterIndex + 1) % clusters.length;
                attempts++;
            }

            if (!foundCluster) {
                console.warn(`Could not assign team ${team.name} - all clusters full`);
            }
        }

        // Log the shuffle action
        await supabase.from('audit_logs').insert({
            event_type: 'team_shuffle_completed',
            actor_id: user.id,
            metadata: {
                total_teams: teams.length,
                assigned_teams: assignments.length,
                clusters_used: clusters.length,
                teams_per_cluster: teamsPerCluster,
            },
        });

        // Get final cluster stats
        const clusterStats = clusters.map(c => ({
            id: c.id,
            name: c.name,
            teamCount: clusterCounts[c.id],
            maxTeams: c.max_teams || teamsPerCluster,
        }));

        return NextResponse.json({
            success: true,
            message: `Successfully assigned ${assignments.length} teams to ${clusters.length} clusters`,
            stats: {
                totalTeams: teams.length,
                assignedTeams: assignments.length,
                unassignedTeams: teams.length - assignments.length,
            },
            clusterStats,
            assignments,
        });
    } catch (error) {
        console.error('Shuffle error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
