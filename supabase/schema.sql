-- ============================================
-- OnlyFounders PWA - Supabase Database Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('student', 'admin', 'super_admin');
CREATE TYPE team_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE submission_status AS ENUM ('not_viewed', 'waiting', 'selected', 'not_selected');
CREATE TYPE college_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE alert_type AS ENUM ('urgent', 'warning', 'info');
CREATE TYPE task_status AS ENUM ('pending', 'submitted', 'overdue');

-- ============================================
-- COLLEGES TABLE
-- ============================================

CREATE TABLE colleges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    logo_url TEXT,
    internal_details JSONB DEFAULT '{}',
    status college_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    role user_role DEFAULT 'student',
    college_id UUID REFERENCES colleges(id) ON DELETE SET NULL,
    avatar_url TEXT,
    member_id VARCHAR(50) UNIQUE, -- e.g., OF-IITB-24-8821
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TEAMS TABLE
-- ============================================

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL, -- e.g., QNT-V42
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    size INTEGER DEFAULT 4,
    track VARCHAR(100) DEFAULT 'Open',
    status team_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TEAM MEMBERS TABLE
-- ============================================

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_leader BOOLEAN DEFAULT FALSE,
    UNIQUE(team_id, user_id)
);

-- ============================================
-- SUBMISSIONS TABLE
-- ============================================

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_title VARCHAR(255) NOT NULL,
    idea TEXT NOT NULL,
    drive_link TEXT NOT NULL,
    public_access_confirmed BOOLEAN DEFAULT FALSE,
    status submission_status DEFAULT 'not_viewed',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS/ALERTS TABLE
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type alert_type DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COLLEGE ADMINS TABLE (for super admin management)
-- ============================================

CREATE TABLE college_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE, -- First admin created with college
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id),
    UNIQUE(college_id, user_id)
);

-- ============================================
-- HACKATHON SETTINGS TABLE
-- ============================================

CREATE TABLE hackathon_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    hackathon_name VARCHAR(255) DEFAULT 'OnlyFounders Hackathon',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    submission_deadline TIMESTAMP WITH TIME ZONE,
    late_submissions_allowed BOOLEAN DEFAULT FALSE,
    penalty_deduction INTEGER DEFAULT 10, -- percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SCHEDULE/EVENTS TABLE
-- ============================================

CREATE TABLE schedule_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TASKS TABLE
-- ============================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    is_global BOOLEAN DEFAULT TRUE, -- applies to all teams
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TEAM TASKS (tracking completion per team)
-- ============================================

CREATE TABLE team_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    status task_status DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(team_id, task_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_profiles_college ON profiles(college_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_teams_college ON teams(college_id);
CREATE INDEX idx_teams_code ON teams(code);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_submissions_team ON submissions(team_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_schedule_college ON schedule_events(college_id);
CREATE INDEX idx_schedule_date ON schedule_events(event_date);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_tasks ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Teams: Viewable by same college
CREATE POLICY "Teams viewable by college members" ON teams FOR SELECT 
    USING (college_id IN (SELECT college_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Team leaders can update" ON teams FOR UPDATE 
    USING (leader_id = auth.uid());

-- Notifications: Users see only their own
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT 
    USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE 
    USING (user_id = auth.uid());

-- Colleges: Viewable by all authenticated users
CREATE POLICY "Colleges viewable by authenticated" ON colleges FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Super admin full access
CREATE POLICY "Super admins have full access to colleges" ON colleges FOR ALL 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Schedule: Viewable by college members
CREATE POLICY "Schedule viewable by college" ON schedule_events FOR SELECT 
    USING (college_id IN (SELECT college_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- FUNCTIONS FOR NOTIFICATIONS
-- ============================================

-- Function to send notification to a user
CREATE OR REPLACE FUNCTION send_notification(
    p_user_id UUID,
    p_title VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_type alert_type DEFAULT 'info',
    p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, description, type, action_url)
    VALUES (p_user_id, p_title, p_description, p_type, p_action_url)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send notification to entire team
CREATE OR REPLACE FUNCTION send_team_notification(
    p_team_id UUID,
    p_title VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_type alert_type DEFAULT 'info'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (user_id, title, description, type)
    SELECT user_id, p_title, p_description, p_type
    FROM team_members
    WHERE team_id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send notification to all users in a college
CREATE OR REPLACE FUNCTION send_college_notification(
    p_college_id UUID,
    p_title VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_type alert_type DEFAULT 'info'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (user_id, title, description, type)
    SELECT id, p_title, p_description, p_type
    FROM profiles
    WHERE college_id = p_college_id AND role = 'student';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS FOR AUTOMATIC NOTIFICATIONS
-- ============================================

-- Notify team when submission status changes
CREATE OR REPLACE FUNCTION notify_submission_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        PERFORM send_team_notification(
            NEW.team_id,
            CASE 
                WHEN NEW.status = 'selected' THEN 'Congratulations! You''ve been selected!'
                WHEN NEW.status = 'not_selected' THEN 'Submission Update'
                WHEN NEW.status = 'waiting' THEN 'Your submission is under review'
                ELSE 'Submission status updated'
            END,
            CASE 
                WHEN NEW.status = 'selected' THEN 'Your team has been selected to advance to the next round.'
                WHEN NEW.status = 'not_selected' THEN 'Thank you for participating. Keep building!'
                WHEN NEW.status = 'waiting' THEN 'Our judges are reviewing your pitch deck.'
                ELSE 'Check your submission for updates.'
            END,
            CASE 
                WHEN NEW.status = 'selected' THEN 'info'::alert_type
                WHEN NEW.status = 'not_selected' THEN 'warning'::alert_type
                ELSE 'info'::alert_type
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_submission_status_change
    AFTER UPDATE OF status ON submissions
    FOR EACH ROW
    EXECUTE FUNCTION notify_submission_status();

-- Notify when someone joins team
CREATE OR REPLACE FUNCTION notify_team_join()
RETURNS TRIGGER AS $$
DECLARE
    member_name VARCHAR(255);
    team_name VARCHAR(255);
BEGIN
    SELECT full_name INTO member_name FROM profiles WHERE id = NEW.user_id;
    SELECT name INTO team_name FROM teams WHERE id = NEW.team_id;
    
    -- Notify existing team members
    INSERT INTO notifications (user_id, title, description, type)
    SELECT tm.user_id, 
           'New Team Member',
           member_name || ' has joined ' || team_name,
           'info'::alert_type
    FROM team_members tm
    WHERE tm.team_id = NEW.team_id AND tm.user_id != NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_team_member_join
    AFTER INSERT ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION notify_team_join();

-- ============================================
-- REALTIME SUBSCRIPTIONS SETUP
-- ============================================

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample colleges
INSERT INTO colleges (name, location, status) VALUES
    ('IIT Bombay', 'Mumbai, Maharashtra', 'active'),
    ('IIT Delhi', 'New Delhi', 'active'),
    ('BITS Pilani', 'Pilani, Rajasthan', 'active'),
    ('VIT Vellore', 'Vellore, Tamil Nadu', 'active');

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View for team details with member count
CREATE OR REPLACE VIEW team_details AS
SELECT 
    t.id,
    t.name,
    t.code,
    t.track,
    t.status,
    t.created_at,
    c.name as college_name,
    p.full_name as leader_name,
    (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
FROM teams t
LEFT JOIN colleges c ON t.college_id = c.id
LEFT JOIN profiles p ON t.leader_id = p.id;

-- View for unread notification count per user
CREATE OR REPLACE VIEW unread_notification_count AS
SELECT 
    user_id,
    COUNT(*) as unread_count
FROM notifications
WHERE read = FALSE
GROUP BY user_id;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================
-- PUSH NOTIFICATIONS SUBSCRIPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions" ON push_subscriptions
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

