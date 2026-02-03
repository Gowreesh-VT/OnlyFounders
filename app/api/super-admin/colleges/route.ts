/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Cluster definitions
const CLUSTERS = [
  'ALPHA_SECTOR',
  'BETA_SECTOR',
  'GAMMA_SECTOR',
  'DELTA_SECTOR',
  'EPSILON_SECTOR'
];

// ------------------------------------------------------------------
// GET HANDLER: Dashboard Stats
// ------------------------------------------------------------------
export async function GET() {
  try {
    const supabase = await createAnonClient();
    const supabaseAdmin = createAdminClient();

    // 1. Verify user is super admin
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

    // 2. Get Global User Count (Total Users)
    const { count: totalGlobalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 3. Fetch all colleges
    const { data: colleges, error: collegesError } = await supabaseAdmin
      .from('colleges')
      .select('*')
      .order('name');

    if (collegesError) {
      return NextResponse.json({ error: 'Failed to fetch colleges' }, { status: 500 });
    }

    // 4. Get stats for each college
    const collegesWithStats = await Promise.all(
      (colleges || []).map(async (college) => {

        // Count profiles in this college
        const { count: studentCount } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('college_id', college.id);

        // Count teams
        const { count: teamCount } = await supabaseAdmin
          .from('teams')
          .select('*', { count: 'exact', head: true })
          .eq('college_id', college.id);

        return {
          ...college,
          students: studentCount || 0,
          teams: teamCount || 0,
        };
      })
    );

    // 5. Calculate Aggregates
    const totalColleges = collegesWithStats.length;
    const activeColleges = collegesWithStats.filter(
      c => c.status?.toLowerCase() === 'active'
    ).length;

    const totalTeams = collegesWithStats.reduce(
      (sum, c) => sum + c.teams,
      0
    );

    return NextResponse.json({
      colleges: collegesWithStats,
      stats: {
        totalColleges,
        activeColleges,
        totalUsers: totalGlobalUsers || 0,
        totalTeams,
      },
    });

  } catch (error) {
    console.error('Super admin GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


// ------------------------------------------------------------------
// POST HANDLER: Global Actions (Simulation Only)
// ------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const supabase = await createAnonClient();
    const supabaseAdmin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, payload } = body;

    switch (action) {

      case 'SHUFFLE_TEAMS':
        return await handleShuffleSimulation(supabaseAdmin);

      case 'SET_PHASE':
        return await handleSetPhase(supabaseAdmin, payload);

      // ✅ NEW ACTION: FETCH USERS FROM PROFILES
      case 'FETCH_USERS':
        return await handleFetchUsers(supabaseAdmin);
        case "UPDATE_ROLE":
  return await handleUpdateRole(supabaseAdmin, payload);

case "UPDATE_PERMISSION":
  return await handleUpdatePermission(supabaseAdmin, payload);

case "ADD_USER":
  return await handleAddUser(supabaseAdmin, payload);
case "DELETE_USER":
  return await handleDeleteUser(supabaseAdmin, payload);


      default:
        return NextResponse.json({ error: 'Invalid Action' }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
async function handleDeleteUser(supabaseAdmin: any, payload: any) {
  const { id } = payload;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      active: false,
      role: "disabled"
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to disable user" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "User disabled successfully"
  });
}

async function handleUpdateRole(supabaseAdmin: any, payload: any) {
  const { id, role } = payload;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ role })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Role update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
async function handleUpdatePermission(supabaseAdmin: any, payload: any) {
  const { id, key, value } = payload;

  // Fetch current permissions
  const { data: user } = await supabaseAdmin
    .from("profiles")
    .select("permissions")
    .eq("id", id)
    .single();

  const updatedPermissions = {
    ...(user?.permissions || {}),
    [key]: value,
  };

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ permissions: updatedPermissions })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Permission update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
async function handleAddUser(supabaseAdmin: any, payload: any) {
  const { full_name, email, role } = payload;

  const { error } = await supabaseAdmin
    .from("profiles")
    .insert([
      {
        full_name,
        email,
        role,
        permissions: {
          canImportTeams: false,
          canShuffleTeams: false,
          canManageUsers: false,
        },
        active: true,
      },
    ]);

  if (error) {
    return NextResponse.json({ error: "User creation failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ------------------------------------------------------------------
// ✅ Logic 1: Shuffle Teams (SIMULATION ONLY)
// ------------------------------------------------------------------
async function handleShuffleSimulation(supabaseAdmin: any) {

  const { data: teams, error } = await supabaseAdmin
    .from('teams')
    .select('id, name');

  if (error || !teams || teams.length === 0) {
    return NextResponse.json({ error: 'No teams to shuffle' }, { status: 400 });
  }

  // Shuffle (Fisher-Yates)
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const assignments: Record<string, any[]> = {};
  CLUSTERS.forEach(c => assignments[c] = []);

  // ✅ Round-robin distribution
  for (let i = 0; i < shuffled.length; i++) {
    const clusterName = CLUSTERS[i % CLUSTERS.length];

    assignments[clusterName].push({
      id: shuffled[i].id,
      name: shuffled[i].name,
      status: "PREVIEW"
    });
  }

  return NextResponse.json({
    success: true,
    data: assignments,
    message: `Generated preview for ${teams.length} teams.`,
  });
}


// ------------------------------------------------------------------
// ✅ Logic 2: Event Phase
// ------------------------------------------------------------------
async function handleSetPhase(supabaseAdmin: any, payload: any) {

  const { phase } = payload;

  const VALID_PHASES = ['NETWORK', 'PITCH', 'VOTE', 'LOCKED'];

  if (!VALID_PHASES.includes(phase)) {
    return NextResponse.json({ error: 'Invalid Phase' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('system_config')
    .update({ current_phase: phase })
    .eq('id', 1);

  if (error) console.error('Phase update failed:', error);

  return NextResponse.json({ success: true, phase });
}


// ------------------------------------------------------------------
// ✅ Logic 3: Fetch Users From Profiles Table (Super Admin Modal)
// ------------------------------------------------------------------
async function handleFetchUsers(supabaseAdmin: any) {

  const { data: users, error } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      role,
      college_id,
      created_at
    `)
    .in("role", ["admin", "super_admin", "team_lead","gate_volunteer", "event_coordinator"]);

  if (error) {
    console.error("Fetch users failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    users: users || [],
  });
}
