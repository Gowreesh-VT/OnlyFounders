# Safe Test Data Guide for Investment Terminal

This guide helps you populate test data without affecting other team members' work.

## Step 1: Create a Test User in Supabase Auth

1. Go to your Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add User"** → **"Create new user"**
3. Enter:
   - **Email:** `test.investor@demo.com`
   - **Password:** `TestPass123!`
4. **Copy the UUID** that appears after creation (you'll need it below)

---

## Step 2: Run the Test Data SQL

Go to **SQL Editor** in Supabase and run the SQL below.

> ⚠️ **IMPORTANT:** Replace `YOUR_AUTH_USER_UUID_HERE` with the UUID from Step 1!

```sql
-- ============================================
-- SAFE TEST DATA FOR INVESTMENT TERMINAL
-- All test data is prefixed with "TEST-" for easy cleanup
-- ============================================

-- 1. Create Test College
INSERT INTO public.colleges (id, name, location)
VALUES ('aaaaaaaa-test-0001-0001-000000000001', 'TEST-Demo University', 'Test City')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Test Cluster (BIDDING STAGE for testing investments)
INSERT INTO public.clusters (
  id, name, location, current_stage, bidding_open, max_teams, pitch_duration_seconds
)
VALUES (
  'bbbbbbbb-test-0001-0001-000000000001',
  'TEST-Cluster Alpha',
  'Test Auditorium',
  'bidding',   -- This enables the investment UI
  TRUE,
  10,
  180
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Test Teams (5 teams: 1 for investor, 4 as targets)
-- Team 1: The investor's team
INSERT INTO public.teams (id, name, college_id, cluster_id, domain, balance, total_invested, total_received, is_finalized)
VALUES (
  'cccccccc-test-0001-0001-000000000001',
  'TEST-InvestorTeam',
  'aaaaaaaa-test-0001-0001-000000000001',
  'bbbbbbbb-test-0001-0001-000000000001',
  'Fintech',
  1000000.00,
  0.00,
  0.00,
  FALSE
)
ON CONFLICT (id) DO NOTHING;

-- Team 2: Target team
INSERT INTO public.teams (id, name, college_id, cluster_id, domain, balance, total_invested, total_received, is_finalized)
VALUES (
  'cccccccc-test-0002-0002-000000000002',
  'TEST-Apex Robotics',
  'aaaaaaaa-test-0001-0001-000000000001',
  'bbbbbbbb-test-0001-0001-000000000001',
  'AI/Robotics',
  1000000.00,
  0.00,
  50000.00,
  FALSE
)
ON CONFLICT (id) DO NOTHING;

-- Team 3: Target team
INSERT INTO public.teams (id, name, college_id, cluster_id, domain, balance, total_invested, total_received, is_finalized)
VALUES (
  'cccccccc-test-0003-0003-000000000003',
  'TEST-Solaris Energy',
  'aaaaaaaa-test-0001-0001-000000000001',
  'bbbbbbbb-test-0001-0001-000000000001',
  'CleanTech',
  1000000.00,
  0.00,
  75000.00,
  FALSE
)
ON CONFLICT (id) DO NOTHING;

-- Team 4: Target team
INSERT INTO public.teams (id, name, college_id, cluster_id, domain, balance, total_invested, total_received, is_finalized)
VALUES (
  'cccccccc-test-0004-0004-000000000004',
  'TEST-QuantumSecure',
  'aaaaaaaa-test-0001-0001-000000000001',
  'bbbbbbbb-test-0001-0001-000000000001',
  'Cybersecurity',
  1000000.00,
  0.00,
  100000.00,
  FALSE
)
ON CONFLICT (id) DO NOTHING;

-- 4. Create Pitch Schedule for target teams (so they show in the market)
INSERT INTO public.pitch_schedule (id, cluster_id, team_id, pitch_title, pitch_abstract, status, is_completed)
VALUES
  (gen_random_uuid(), 'bbbbbbbb-test-0001-0001-000000000001', 'cccccccc-test-0002-0002-000000000002',
   'Apex Automation Platform', 'Building next-generation industrial robots powered by AI.', 'completed', TRUE),
  (gen_random_uuid(), 'bbbbbbbb-test-0001-0001-000000000001', 'cccccccc-test-0003-0003-000000000003',
   'Solaris Smart Grid', 'Decentralized energy marketplace for solar power.', 'completed', TRUE),
  (gen_random_uuid(), 'bbbbbbbb-test-0001-0001-000000000001', 'cccccccc-test-0004-0004-000000000004',
   'Quantum-Safe Encryption', 'Post-quantum cryptography for enterprise security.', 'completed', TRUE)
ON CONFLICT DO NOTHING;

-- 5. Create Profile for the Test User
-- ⚠️ REPLACE 'YOUR_AUTH_USER_UUID_HERE' with the actual UUID from Step 1!
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  team_id,
  college_id,
  entity_id,
  is_active,
  login_count
)
VALUES (
  'YOUR_AUTH_USER_UUID_HERE',  -- ← REPLACE THIS!
  'test.investor@demo.com',
  'Test Investor',
  'team_lead',  -- This allows committing portfolio
  'cccccccc-test-0001-0001-000000000001',  -- InvestorTeam
  'aaaaaaaa-test-0001-0001-000000000001',
  'OF-TEST-0001',
  TRUE,
  0
)
ON CONFLICT (id) DO UPDATE SET
  team_id = 'cccccccc-test-0001-0001-000000000001',
  role = 'team_lead';

-- Verify the data
SELECT 'Colleges' as table_name, COUNT(*) as count FROM public.colleges WHERE name LIKE 'TEST-%'
UNION ALL
SELECT 'Clusters', COUNT(*) FROM public.clusters WHERE name LIKE 'TEST-%'
UNION ALL
SELECT 'Teams', COUNT(*) FROM public.teams WHERE name LIKE 'TEST-%'
UNION ALL
SELECT 'Profiles', COUNT(*) FROM public.profiles WHERE email = 'test.investor@demo.com';
```

---

## Step 3: Create the RPC Function (if not exists)

The invest page calls `get_cluster_market_data`. Run this in SQL Editor:

```sql
-- RPC to get market data for investment page
CREATE OR REPLACE FUNCTION get_cluster_market_data(p_cluster_id UUID)
RETURNS TABLE (
  team_id UUID,
  team_name VARCHAR,
  domain VARCHAR,
  total_received DECIMAL,
  pitch_title VARCHAR,
  pitch_abstract TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS team_id,
    t.name AS team_name,
    t.domain,
    t.total_received,
    ps.pitch_title,
    ps.pitch_abstract
  FROM public.teams t
  LEFT JOIN LATERAL (
    SELECT pitch_title, pitch_abstract
    FROM public.pitch_schedule
    WHERE team_id = t.id
    ORDER BY created_at DESC
    LIMIT 1
  ) ps ON TRUE
  WHERE t.cluster_id = p_cluster_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_cluster_market_data(UUID) TO authenticated;
```

---

## Step 4: Test in the UI

1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000/auth/login`
3. Login with: `test.investor@demo.com` / `TestPass123!`
4. Navigate to `/invest`
5. You should see 3 teams to invest in!

---

## Cleanup (When Done Testing)

Run this SQL to remove all test data:

```sql
-- DELETE TEST DATA (Safe cleanup)
DELETE FROM public.investments WHERE investor_team_id IN (SELECT id FROM public.teams WHERE name LIKE 'TEST-%');
DELETE FROM public.pitch_schedule WHERE team_id IN (SELECT id FROM public.teams WHERE name LIKE 'TEST-%');
DELETE FROM public.profiles WHERE email = 'test.investor@demo.com';
DELETE FROM public.teams WHERE name LIKE 'TEST-%';
DELETE FROM public.clusters WHERE name LIKE 'TEST-%';
DELETE FROM public.colleges WHERE name LIKE 'TEST-%';

-- Also delete the auth user from Supabase Dashboard → Authentication → Users
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Profile fetch error" | Make sure step 5 (profile insert) used the correct auth user UUID |
| "No teams found" | Check that cluster `current_stage` is `'bidding'` |
| Can't commit portfolio | Verify user role is `'team_lead'` in profiles table |
| RPC error | Run the `get_cluster_market_data` function creation SQL |
