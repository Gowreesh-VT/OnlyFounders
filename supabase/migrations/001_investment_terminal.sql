-- ============================================
-- Investment Terminal Migration
-- ============================================
-- Adds constraints, triggers, and RPC functions for real-time investment engine
-- Run this migration on your Supabase database

-- ============================================
-- 1. IMMUTABILITY CONSTRAINT
-- Block investment operations when team is finalized
-- ============================================

CREATE OR REPLACE FUNCTION prevent_finalized_team_investments()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if investor team is already finalized
    IF EXISTS (SELECT 1 FROM teams WHERE id = NEW.investor_team_id AND is_finalized = TRUE) THEN
        RAISE EXCEPTION 'Investment blocked: Team has already finalized their portfolio. No changes allowed.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS check_team_finalized ON investments;
CREATE TRIGGER check_team_finalized
    BEFORE INSERT OR UPDATE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_finalized_team_investments();

-- ============================================
-- 2. MARKET STAGE VALIDATION
-- Ensure investments only happen during bidding stage
-- ============================================

CREATE OR REPLACE FUNCTION validate_market_stage()
RETURNS TRIGGER AS $$
DECLARE
    cluster_stage event_stage;
BEGIN
    -- Get the cluster stage for the investor team
    SELECT c.current_stage INTO cluster_stage
    FROM teams t
    JOIN clusters c ON c.id = t.cluster_id
    WHERE t.id = NEW.investor_team_id;
    
    IF cluster_stage IS NULL THEN
        RAISE EXCEPTION 'Cannot determine cluster stage for team';
    END IF;
    
    IF cluster_stage != 'bidding' THEN
        RAISE EXCEPTION 'Market is not open for bidding. Current stage: %', cluster_stage;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_market_stage ON investments;
CREATE TRIGGER check_market_stage
    BEFORE INSERT OR UPDATE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION validate_market_stage();

-- ============================================
-- 3. ATOMIC COMMIT PORTFOLIO RPC
-- Bulk insert/upsert investments with full validation
-- ============================================

CREATE OR REPLACE FUNCTION commit_portfolio(
    p_investments JSONB,  -- Array of {target_team_id: uuid, amount: number}
    p_cluster_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_team_id UUID;
    v_role user_role;
    v_cluster_stage event_stage;
    v_is_finalized BOOLEAN;
    v_team_balance DECIMAL(12, 2);
    v_total_amount DECIMAL(12, 2) := 0;
    v_investment JSONB;
    v_target_id UUID;
    v_amount DECIMAL(12, 2);
    v_result JSONB;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Get user's team and role
    SELECT team_id, role INTO v_team_id, v_role
    FROM profiles
    WHERE id = v_user_id;
    
    IF v_team_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User has no team');
    END IF;
    
    -- Verify team lead role
    IF v_role NOT IN ('team_lead', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only team leads can commit portfolio');
    END IF;
    
    -- Check if team is already finalized
    SELECT is_finalized, balance INTO v_is_finalized, v_team_balance
    FROM teams
    WHERE id = v_team_id;
    
    IF v_is_finalized THEN
        RETURN jsonb_build_object('success', false, 'error', 'Portfolio already finalized');
    END IF;
    
    -- Verify cluster stage is bidding
    SELECT current_stage INTO v_cluster_stage
    FROM clusters
    WHERE id = p_cluster_id;
    
    IF v_cluster_stage != 'bidding' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Market is not open for bidding');
    END IF;
    
    -- Calculate total investment amount
    FOR v_investment IN SELECT * FROM jsonb_array_elements(p_investments)
    LOOP
        v_amount := (v_investment->>'amount')::DECIMAL;
        IF v_amount > 0 THEN
            v_total_amount := v_total_amount + v_amount;
        END IF;
    END LOOP;
    
    -- Validate total doesn't exceed balance
    IF v_total_amount > v_team_balance THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Total investments (₹%s) exceed available balance (₹%s)', v_total_amount, v_team_balance)
        );
    END IF;
    
    -- Delete existing investments for this team (we're replacing them)
    DELETE FROM investments WHERE investor_team_id = v_team_id;
    
    -- Insert all new investments
    FOR v_investment IN SELECT * FROM jsonb_array_elements(p_investments)
    LOOP
        v_target_id := (v_investment->>'target_team_id')::UUID;
        v_amount := (v_investment->>'amount')::DECIMAL;
        
        -- Skip zero amounts
        IF v_amount <= 0 THEN
            CONTINUE;
        END IF;
        
        -- Verify not self-investment
        IF v_target_id = v_team_id THEN
            RAISE EXCEPTION 'Cannot invest in your own team';
        END IF;
        
        -- Insert the investment
        INSERT INTO investments (investor_team_id, target_team_id, amount, is_locked)
        VALUES (v_team_id, v_target_id, v_amount, TRUE);
    END LOOP;
    
    -- Mark team as finalized
    UPDATE teams
    SET is_finalized = TRUE,
        total_invested = v_total_amount,
        updated_at = NOW()
    WHERE id = v_team_id;
    
    -- Log the commit action
    INSERT INTO audit_logs (event_type, actor_id, target_id, metadata)
    VALUES (
        'portfolio_committed',
        v_user_id,
        v_team_id,
        jsonb_build_object(
            'total_invested', v_total_amount,
            'investment_count', jsonb_array_length(p_investments),
            'cluster_id', p_cluster_id
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'total_invested', v_total_amount,
        'investments_count', jsonb_array_length(p_investments)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION commit_portfolio(JSONB, UUID) TO authenticated;

-- ============================================
-- 4. OPTIMIZED TEAM FETCH WITH PITCH DATA
-- Single query for all cluster teams with pitch info
-- ============================================

CREATE OR REPLACE FUNCTION get_cluster_teams_with_pitches(p_cluster_id UUID)
RETURNS TABLE (
    team_id UUID,
    team_name VARCHAR,
    domain VARCHAR,
    balance DECIMAL,
    total_invested DECIMAL,
    total_received DECIMAL,
    is_finalized BOOLEAN,
    is_qualified BOOLEAN,
    pitch_title VARCHAR,
    pitch_abstract TEXT,
    social_links JSONB,
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id AS team_id,
        t.name AS team_name,
        t.domain,
        t.balance,
        t.total_invested,
        t.total_received,
        t.is_finalized,
        t.is_qualified,
        ps.pitch_title,
        ps.pitch_abstract,
        t.social_links,
        t.tags
    FROM teams t
    LEFT JOIN LATERAL (
        SELECT pitch_title, pitch_abstract
        FROM pitch_schedule
        WHERE team_id = t.id
        ORDER BY scheduled_start DESC
        LIMIT 1
    ) ps ON TRUE
    WHERE t.cluster_id = p_cluster_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_cluster_teams_with_pitches(UUID) TO authenticated;

-- ============================================
-- 5. GET USER'S EXISTING INVESTMENTS
-- For loading draft state
-- ============================================

CREATE OR REPLACE FUNCTION get_my_investments()
RETURNS TABLE (
    target_team_id UUID,
    amount DECIMAL,
    is_locked BOOLEAN
) AS $$
DECLARE
    v_team_id UUID;
BEGIN
    SELECT team_id INTO v_team_id
    FROM profiles
    WHERE id = auth.uid();
    
    IF v_team_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT i.target_team_id, i.amount, i.is_locked
    FROM investments i
    WHERE i.investor_team_id = v_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_my_investments() TO authenticated;
