// Database types matching Supabase schema

export type UserRole = 'student' | 'admin' | 'super_admin';
export type TeamStatus = 'pending' | 'approved' | 'rejected';
export type SubmissionStatus = 'not_viewed' | 'waiting' | 'selected' | 'not_selected';
export type CollegeStatus = 'active' | 'inactive' | 'pending';
export type AlertType = 'urgent' | 'warning' | 'info';
export type TaskStatus = 'pending' | 'submitted' | 'overdue';

export interface College {
    id: string;
    name: string;
    location: string | null;
    logo_url: string | null;
    status: CollegeStatus;
    created_at: string;
    updated_at: string;
}

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    college_id: string | null;
    avatar_url: string | null;
    member_id: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    college?: College;
}

export interface Team {
    id: string;
    name: string;
    code: string;
    college_id: string | null;
    leader_id: string | null;
    size: number;
    track: string;
    status: TeamStatus;
    created_at: string;
    updated_at: string;
    // Joined data
    college?: College;
    leader?: Profile;
    members?: TeamMember[];
}

export interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    joined_at: string;
    is_leader: boolean;
    // Joined data
    user?: Profile;
}

export interface Submission {
    id: string;
    team_id: string;
    project_title: string;
    idea: string;
    drive_link: string;
    public_access_confirmed: boolean;
    status: SubmissionStatus;
    admin_notes: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    submitted_at: string;
    updated_at: string;
    // Joined data
    team?: Team;
    reviewer?: Profile;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    type: AlertType;
    read: boolean;
    action_url: string | null;
    created_at: string;
}

export interface CollegeAdmin {
    id: string;
    college_id: string;
    user_id: string;
    is_primary: boolean;
    assigned_at: string;
    assigned_by: string | null;
    // Joined data
    college?: College;
    user?: Profile;
}

export interface HackathonSettings {
    id: string;
    college_id: string;
    hackathon_name: string;
    start_date: string | null;
    end_date: string | null;
    submission_deadline: string | null;
    late_submissions_allowed: boolean;
    penalty_deduction: number;
    created_at: string;
    updated_at: string;
}

export interface ScheduleEvent {
    id: string;
    college_id: string;
    title: string;
    description: string | null;
    event_date: string;
    start_time: string;
    end_time: string;
    location: string | null;
    is_active: boolean;
    created_at: string;
}

export interface Task {
    id: string;
    college_id: string;
    title: string;
    description: string | null;
    deadline: string | null;
    is_global: boolean;
    created_at: string;
}

export interface TeamTask {
    id: string;
    team_id: string;
    task_id: string;
    status: TaskStatus;
    completed_at: string | null;
    // Joined data
    task?: Task;
}

// API Response types
export interface ApiResponse<T> {
    data?: T;
    error?: string;
}

export interface AuthUser {
    id: string;
    email: string;
    profile: Profile;
    team?: Team;
}
