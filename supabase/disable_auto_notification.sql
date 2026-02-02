-- ============================================
-- MIGRATION: Disable Auto-Notification on Status Change
-- Run this in Supabase SQL Editor to disable the auto-notification trigger
-- ============================================

-- Drop the auto-notification trigger
DROP TRIGGER IF EXISTS on_submission_status_change ON submissions;

-- The function can stay in case you want to revert later
-- DROP FUNCTION IF EXISTS notify_submission_status();

-- ============================================
-- Note: Admin can now manually send notifications using the "Send Notification"
-- button in the admin panel after changing status.
-- ============================================
