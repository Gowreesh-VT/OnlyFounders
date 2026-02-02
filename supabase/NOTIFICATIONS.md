# Supabase Notifications Guide for OnlyFounders

## How Notifications Work

### 1. Database Triggers (Automatic)
The SQL schema includes triggers that automatically create notifications when:

- **Submission Status Changes** → Team members get notified
- **New Team Member Joins** → Existing team members get notified

### 2. Manual Notification Functions
Call these Supabase functions to send notifications:

```typescript
// Send to single user
await supabase.rpc('send_notification', {
  p_user_id: 'user-uuid',
  p_title: 'Your Title',
  p_description: 'Your description',
  p_type: 'urgent', // 'urgent' | 'warning' | 'info'
  p_action_url: '/dashboard'
});

// Send to entire team
await supabase.rpc('send_team_notification', {
  p_team_id: 'team-uuid',
  p_title: 'Team Update',
  p_description: 'Important message for your team',
  p_type: 'info'
});

// Send to all students in a college
await supabase.rpc('send_college_notification', {
  p_college_id: 'college-uuid',
  p_title: 'College Announcement',
  p_description: 'Message for all students',
  p_type: 'warning'
});
```

### 3. Realtime Subscriptions
Subscribe to live notification updates in your React components:

```typescript
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Fetch existing notifications
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    };

    fetchNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
```

### 4. Usage in Dashboard

```typescript
import { useNotifications } from '@/hooks/useNotifications';

export default function Dashboard() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div>
      <button>
        <Bell />
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {/* Alert Modal */}
      <div>
        {notifications.map(alert => (
          <div key={alert.id} onClick={() => markAsRead(alert.id)}>
            <h4>{alert.title}</h4>
            <p>{alert.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Setup Steps

1. **Run the SQL Schema**
   - Go to Supabase Dashboard → SQL Editor
   - Paste contents of `supabase/schema.sql`
   - Click "Run"

2. **Enable Realtime**
   - Go to Database → Replication
   - Ensure `notifications` table has realtime enabled

3. **Install Supabase Client**
   ```bash
   npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
   ```

4. **Configure Environment**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## Database Tables Overview

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (extends auth.users) |
| `colleges` | Participating institutions |
| `teams` | Student teams |
| `team_members` | Team-user relationships |
| `submissions` | Pitch submissions |
| `notifications` | User alerts/notifications |
| `college_admins` | Admin assignments |
| `hackathon_settings` | Deadlines, configuration |
| `schedule_events` | Hackathon schedule |
| `tasks` | Pending tasks for teams |
| `team_tasks` | Task completion tracking |
