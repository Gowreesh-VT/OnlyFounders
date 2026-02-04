import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create authenticated client
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

export async function GET(request: NextRequest) {
    try {
        // 1. Verify user is authenticated
        const supabase = await createAuthClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Get user profile with team (using admin to bypass RLS)
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("*, team:teams(*)")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        if (!profile.team) {
            return NextResponse.json({ error: "No team assigned" }, { status: 400 });
        }

        const userTeam = profile.team;

        if (!userTeam.cluster_id) {
            return NextResponse.json({ error: "Team not in a cluster" }, { status: 400 });
        }

        // 3. Get cluster data
        const { data: cluster, error: clusterError } = await supabaseAdmin
            .from("clusters")
            .select("*")
            .eq("id", userTeam.cluster_id)
            .single();

        if (clusterError) {
            return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
        }

        // 4. Get all teams in cluster with pitch info
        const { data: teamsData } = await supabaseAdmin
            .from("teams")
            .select(`
        id,
        name,
        domain,
        balance,
        total_invested,
        total_received,
        is_finalized,
        is_qualified
      `)
            .eq("cluster_id", userTeam.cluster_id);

        // 5. Get pitch schedule for these teams
        const teamIds = teamsData?.map(t => t.id) || [];
        const { data: pitchData } = await supabaseAdmin
            .from("pitch_schedule")
            .select("team_id, pitch_title, pitch_abstract")
            .in("team_id", teamIds);

        // Merge pitch info with teams
        const teamsWithPitch = teamsData?.map(team => {
            const pitch = pitchData?.find(p => p.team_id === team.id);
            return {
                ...team,
                pitch_title: pitch?.pitch_title,
                pitch_abstract: pitch?.pitch_abstract
            };
        }) || [];

        // Filter out user's own team
        const targetTeams = teamsWithPitch.filter(t => t.id !== userTeam.id);

        // 6. Get user's existing investments
        const { data: investments } = await supabaseAdmin
            .from("investments")
            .select("target_team_id, amount")
            .eq("investor_team_id", userTeam.id);

        return NextResponse.json({
            profile: {
                id: profile.id,
                email: profile.email,
                full_name: profile.full_name,
                role: profile.role
            },
            myTeam: userTeam,
            cluster,
            targetTeams,
            investments: investments || []
        });

    } catch (error) {
        console.error("Invest API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Commit portfolio investments
export async function POST(request: NextRequest) {
    try {
        // 1. Verify user is authenticated
        const supabase = await createAuthClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Get user profile with team (bypass RLS)
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("*, team:teams(*)")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: "Profile not found", success: false }, { status: 404 });
        }

        if (!profile.team) {
            return NextResponse.json({ error: "No team assigned", success: false }, { status: 400 });
        }

        // 3. Verify user is team lead
        if (profile.role !== 'team_lead') {
            return NextResponse.json({ error: "Only team leads can commit portfolio", success: false }, { status: 403 });
        }

        const userTeam = profile.team;

        // 4. Verify team is not already finalized
        if (userTeam.is_finalized) {
            return NextResponse.json({ error: "Portfolio already locked", success: false }, { status: 400 });
        }

        // 5. Get cluster and verify bidding is open
        const { data: cluster } = await supabaseAdmin
            .from("clusters")
            .select("*")
            .eq("id", userTeam.cluster_id)
            .single();

        if (!cluster || cluster.current_stage !== 'bidding' || !cluster.bidding_open) {
            return NextResponse.json({ error: "Market is not open for trading", success: false }, { status: 400 });
        }

        // 6. Parse investments from body
        const body = await request.json();
        const { investments } = body;

        if (!investments || !Array.isArray(investments) || investments.length === 0) {
            return NextResponse.json({ error: "No investments provided", success: false }, { status: 400 });
        }

        // 7. Validate total doesn't exceed balance
        const totalAmount = investments.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
        if (totalAmount > userTeam.balance) {
            return NextResponse.json({ error: "Total exceeds available balance", success: false }, { status: 400 });
        }

        // 8. Process investments in a transaction-like manner
        for (const inv of investments) {
            if (inv.amount <= 0) continue;

            // Check if investment already exists
            const { data: existing } = await supabaseAdmin
                .from("investments")
                .select("id, amount")
                .eq("investor_team_id", userTeam.id)
                .eq("target_team_id", inv.target_team_id)
                .single();

            if (existing) {
                // Update existing investment
                await supabaseAdmin
                    .from("investments")
                    .update({ amount: inv.amount, updated_at: new Date().toISOString() })
                    .eq("id", existing.id);
            } else {
                // Insert new investment
                await supabaseAdmin
                    .from("investments")
                    .insert({
                        investor_team_id: userTeam.id,
                        target_team_id: inv.target_team_id,
                        amount: inv.amount
                    });
            }

            // Update target team's total_received
            await supabaseAdmin.rpc('update_team_totals', { p_team_id: inv.target_team_id });
        }

        // 9. Update investor team: deduct balance and mark as finalized
        const { error: updateError } = await supabaseAdmin
            .from("teams")
            .update({
                balance: userTeam.balance - totalAmount,
                total_invested: userTeam.total_invested + totalAmount,
                is_finalized: true,
                updated_at: new Date().toISOString()
            })
            .eq("id", userTeam.id);

        if (updateError) {
            console.error("Failed to update team:", updateError);
            return NextResponse.json({ error: "Failed to finalize portfolio", success: false }, { status: 500 });
        }

        // 10. Log the commit action
        await supabaseAdmin.from("audit_logs").insert({
            event_type: "PORTFOLIO_COMMITTED",
            actor_id: user.id,
            target_id: userTeam.id,
            metadata: { investments, total: totalAmount }
        });

        return NextResponse.json({
            success: true,
            message: "Portfolio locked successfully!",
            total_invested: totalAmount
        });

    } catch (error) {
        console.error("Commit API error:", error);
        return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 });
    }
}
