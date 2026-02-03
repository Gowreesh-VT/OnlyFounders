"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  KeySquare,
  ArrowRight,
  Bell,
  GraduationCap,
  Hourglass,
  ClipboardList,
  Megaphone,
  Copy,
  Check,
  Users,
  Calendar,
  Sparkles,
  X,
  AlertTriangle,
  Clock,
  FileText,
  ChevronRight,
  Loader2,
  LogOut,
  Settings,
  Edit3,
  User,
  Menu,
} from "lucide-react";
import StudentBottomNav from "../components/StudentBottomNav";
import NotificationCenter from "@/components/NotificationCenter";
import { useCache } from "@/lib/cache/CacheProvider";
import type { Notification, ScheduleEvent, Team, Profile } from "@/lib/types/database";

type Alert = {
  id: string;
  title: string;
  description: string;
  type: "urgent" | "warning" | "info";
  time: string;
  read: boolean;
};

type TaskWithStatus = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  teamStatus: "pending" | "submitted" | "overdue";
};

export default function DashboardPage() {
  const router = useRouter();
  const cache = useCache();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState({ days: 2, hours: 14, minutes: 30, seconds: 45 });

  // User data
  const [user, setUser] = useState<{ profile: Profile; team: Team | null } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([]);
  const [tasks, setTasks] = useState<TaskWithStatus[]>([]);

  // Expanded states
  const [showAlerts, setShowAlerts] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  // Profile dropdown states
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const hasTeam = true;
  const unreadAlerts = notifications.filter(n => !n.read).length;

  // Fetch user data
  const fetchData = useCallback(async () => {
    try {
      // Fetch user
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/auth/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData.user);

      // Fetch notifications
      const notifRes = await fetch('/api/notifications');
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
      }

      // Fetch schedule
      const scheduleRes = await fetch('/api/schedule');
      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json();
        setSchedule(scheduleData.schedule || []);
      }

      // Fetch tasks
      const tasksRes = await fetch('/api/tasks');
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [router, cache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        let { days, hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; days--; }
        if (days < 0) { days = 0; hours = 0; minutes = 0; seconds = 0; }
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyCode = () => {
    if (user?.team?.code) {
      const displayCode = user.team.code.slice(0, 3) + '-' + user.team.code.slice(3);
      navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const markAlertRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  };

  const markAllAlertsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    for (const notif of unreadNotifs) {
      await markAlertRead(notif.id);
    }
  };

  const handleEditName = () => {
    setEditNameValue(user?.profile?.full_name || "");
    setShowEditName(true);
    setShowProfileMenu(false);
  };

  const handleSaveName = async () => {
    if (!editNameValue.trim()) return;

    setIsSavingName(true);
    try {
      const response = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: editNameValue.trim() }),
      });

      if (response.ok) {
        setUser(prev => prev ? {
          ...prev,
          profile: { ...prev.profile, full_name: editNameValue.trim() }
        } : null);
        setShowEditName(false);
      }
    } catch (error) {
      console.error('Failed to update name:', error);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowProfileMenu(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  // Convert notifications to alerts format
  const alerts: Alert[] = notifications.map(n => ({
    id: n.id,
    title: n.title,
    description: n.description || '',
    type: n.type,
    time: new Date(n.created_at).toLocaleDateString(),
    read: n.read,
  }));

  // Format schedule items
  const scheduleItems = schedule.map(s => ({
    id: s.id,
    title: s.title,
    description: s.description || '',
    time: `${s.start_time} - ${s.end_time}`,
    date: new Date(s.event_date).getDate().toString(),
    month: new Date(s.event_date).toLocaleDateString('en', { month: 'short' }).toUpperCase(),
    location: s.location || '',
    active: s.is_active,
  }));

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] px-4 py-6 pb-28 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-2/3 opacity-10"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=2444&auto=format&fit=crop')" }} />
        </div>
        <div className="max-w-md mx-auto relative z-10">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#262626] animate-pulse" />
              <div>
                <div className="h-5 w-24 bg-[#262626] rounded mb-1 animate-pulse" />
                <div className="h-3 w-32 bg-[#262626] rounded animate-pulse" />
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#262626] animate-pulse" />
          </div>
          {/* Greeting Skeleton */}
          <div className="mb-6">
            <div className="h-8 w-40 bg-[#262626] rounded mb-2 animate-pulse" />
            <div className="h-4 w-64 bg-[#262626] rounded animate-pulse" />
          </div>
          {/* Countdown Skeleton */}
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 mb-6 animate-pulse">
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-1 text-center">
                  <div className="h-8 w-12 mx-auto bg-[#262626] rounded mb-1" />
                  <div className="h-3 w-10 mx-auto bg-[#262626] rounded" />
                </div>
              ))}
            </div>
          </div>
          {/* Team Card Skeleton */}
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 mb-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#262626]" />
                <div>
                  <div className="h-4 w-24 bg-[#262626] rounded mb-1" />
                  <div className="h-3 w-20 bg-[#262626] rounded" />
                </div>
              </div>
              <div className="h-8 w-16 bg-[#262626] rounded" />
            </div>
          </div>
          {/* Quick Actions Skeleton */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#121212] border border-[#262626] rounded-xl p-4 animate-pulse">
                <div className="w-8 h-8 bg-[#262626] rounded-lg mb-2" />
                <div className="h-4 w-16 bg-[#262626] rounded" />
              </div>
            ))}
          </div>
        </div>
        <StudentBottomNav />
      </main>
    );
  }

  const teamCode = user?.team?.code ? user.team.code.slice(0, 3) + '-' + user.team.code.slice(3) : '';
  const firstName = user?.profile?.full_name?.split(' ')[0] || 'User';

  return (
    <main className="min-h-screen bg-[#0A0A0A] px-4 py-6 pb-28 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-full h-2/3 bg-cover bg-center opacity-10 mix-blend-color-dodge"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=2444&auto=format&fit=crop')" }}
        />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent z-10" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#0A0A0A]/80 via-transparent to-[#0A0A0A] z-10" />
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto">
        {/* Top Status Bar */}
        {hasTeam && (
          <div className="flex items-center justify-between mb-6">
            <Menu className="text-gray-400" />

            <div className="text-center">
              <p className="text-[9px] tracking-[0.3em] text-gray-500 uppercase">
                Event Status
              </p>
              <p className="text-[10px] tracking-widest text-primary font-bold">
                PHASE 02 · HACKING
              </p>
            </div>

            <NotificationCenter />
          </div>
        )}


        {/* Header */}
        <header className="mt-6 flex justify-between items-start">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-primary font-bold">
              Student Dashboard
            </p>
            {hasTeam ? (
              <h1 className="mt-2 text-3xl font-serif font-bold leading-tight text-white">
                Hello, <span className="italic font-medium text-gray-300">{firstName}</span>
              </h1>
            ) : (
              <h1 className="mt-2 text-3xl font-serif font-bold leading-tight text-white">
                {user?.profile?.full_name || 'Welcome'}
              </h1>
            )}
            <p className="mt-2 flex items-center gap-2 text-gray-400 text-sm">
              {hasTeam && <GraduationCap size={16} className="text-primary" />}
              {user?.profile?.college?.name || 'Your College'}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="h-14 w-14 rounded-full border-2 border-primary/30 bg-gradient-to-br from-primary/20 to-[#121212] flex items-center justify-center text-primary font-serif text-xl shadow-[0_0_20px_rgba(255,215,0,0.1)] hover:border-primary/50 transition-colors cursor-pointer"
            >
              {firstName.charAt(0)}
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-16 w-56 bg-[#121212] border border-[#262626] rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-[#262626]">
                  <p className="text-white font-medium truncate">{user?.profile?.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.profile?.email}</p>
                </div>

                <div className="py-2">
                  <button
                    onClick={handleEditName}
                    className="w-full px-4 py-3 flex items-center gap-3 text-gray-300 hover:bg-[#1A1A1A] hover:text-white transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="text-sm">Edit Name</span>
                  </button>
                </div>

                <div className="border-t border-[#262626] py-2">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full px-4 py-3 flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Click outside to close */}
            {showProfileMenu && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
            )}
          </div>
        </header>


        {/* Has Team State */}
        {hasTeam && (
          <>
              {/* Team Code */}
              <button
                onClick={handleCopyCode}
                className="w-full mt-4 bg-[#121212] border border-[#262626] rounded-xl p-4 flex items-center justify-between hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">Team Code</p>
                    <p className="font-mono text-lg text-white tracking-widest">{teamCode}</p>
                  </div>
                </div>
                <div className={`p-2 rounded-lg transition-all ${copied ? "bg-green-500/20" : "bg-[#0A0A0A]"}`}>
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors" />}
                </div>
              </button>

            {/* Main Countdown */}
            <section className="mt-6 text-center">
              <p className="text-[10px] tracking-[0.3em] uppercase text-gray-500">
                Time Remaining
              </p>

              <h1 className="mt-3 text-5xl font-bold font-mono text-white">
                {String(countdown.hours).padStart(2, "0")}:
                {String(countdown.minutes).padStart(2, "0")}:
                {String(countdown.seconds).padStart(2, "0")}
              </h1>

              <div className="mt-4 h-1 w-24 mx-auto bg-primary rounded" />
            </section>

            {/* Next Milestone */}
            <section className="mt-8 bg-[#121212] border border-[#262626] rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[9px] tracking-widest text-gray-500 uppercase">
                  Next Milestone
                </p>
                <span className="text-yellow-400 text-xs font-semibold">LIVE</span>
              </div>

              <p className="text-white font-semibold">
                Code Freeze & Commit
              </p>

              <div className="mt-2 flex justify-between text-xs text-gray-400">
                <span>Until Deadline</span>
                <span className="text-yellow-400">-45m</span>
              </div>

              <div className="mt-2 h-1 bg-gray-700 rounded">
                <div className="h-1 bg-primary w-[85%] rounded" />
              </div>
            </section>

            {/* Live Pitch */}
            <section className="mt-6 border border-primary rounded-xl p-4 bg-black">
              <p className="text-[9px] tracking-widest text-gray-500 uppercase text-center">
                Presenting Now
              </p>

              <h2 className="mt-2 text-center text-2xl font-bold text-primary">
                TEAM TITAN
              </h2>

              <p className="text-center text-xs text-gray-400">
                Category: DeFi Protocol
              </p>

              <div className="mt-4 bg-[#121212] rounded-lg py-3 text-center">
                <p className="text-2xl font-mono text-white">04:59</p>
                <p className="text-[9px] tracking-widest text-primary uppercase">
                  Time to Pitch
                </p>
              </div>
            </section>
            {/* Syndicate Valuation */}
            <section className="mt-8 bg-[#121212] border border-[#262626] rounded-xl p-5">
              <p className="text-[9px] tracking-widest text-gray-500 uppercase mb-2">
                Syndicate Valuation
              </p>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-gray-400">Total Portfolio Value</p>
                  <h2 className="text-3xl font-bold text-primary mt-1">
                    $4,250,000
                  </h2>
                </div>

                <div className="text-right">
                  <p className="text-green-400 text-xs font-semibold">+12.5%</p>
                  <p className="text-[10px] text-gray-500">Since Start</p>
                </div>
              </div>

              {/* Fake graph bar (UI only) */}
              <div className="mt-4 h-10 w-full bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10 rounded" />
            </section>






            {/* Action Cards */}
            <section className="mt-6 grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowTasks(true)}
                className="bg-[#121212] border border-[#262626] rounded-xl p-4 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(255,215,0,0.05)] transition-all group text-left"
              >
                <ClipboardList className="text-primary" />
                <h4 className="mt-4 font-semibold text-white">Pending Tasks</h4>
                <p className="text-sm text-gray-500 mt-1">{tasks.filter(t => t.teamStatus === "pending").length} remaining</p>
                <div className="mt-3 flex items-center gap-1 text-primary text-[9px] uppercase tracking-widest font-bold">
                  <span>View</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => setShowAlerts(true)}
                className="bg-[#121212] border border-[#262626] rounded-xl p-4 relative hover:border-red-500/50 transition-all text-left"
              >
                <Megaphone className="text-red-500" />
                {unreadAlerts > 0 && (
                  <span className="absolute top-3 right-3 h-5 w-5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    {unreadAlerts}
                  </span>
                )}
                <h4 className="mt-4 font-semibold text-white">Alerts</h4>
                <p className="text-sm text-red-400 mt-1 font-medium">{unreadAlerts > 0 ? 'Action Required' : 'All caught up'}</p>
                <p className="mt-3 text-[9px] text-red-400 uppercase tracking-widest font-bold">{unreadAlerts} New</p>
              </button>
            </section>
            {/* Commits & Teams Active */}
            <section className="mt-8 grid grid-cols-2 gap-4">
              {/* Commits */}
              <div className="bg-[#121212] border border-[#262626] rounded-xl p-4">
                <p className="text-[9px] tracking-widest uppercase text-gray-500">
                  Commits
                </p>
                <h3 className="mt-2 text-2xl font-bold text-white">
                  1,248
                </h3>
                <p className="mt-1 text-xs text-green-400 font-semibold">
                  +24/hr
                </p>
              </div>

              {/* Teams Active */}
              <div className="bg-[#121212] border border-[#262626] rounded-xl p-4">
                <p className="text-[9px] tracking-widest uppercase text-gray-500">
                  Teams Active
                </p>
                <h3 className="mt-2 text-2xl font-bold text-white">
                  42
                </h3>
                <p className="mt-1 text-xs text-green-400 font-semibold">
                  100% Online
                </p>
              </div>
            </section>             
          </>
        )}

        <footer className="mt-12 text-center">
          <div className="flex items-center justify-center gap-3 text-[10px] text-gray-600 tracking-widest">
            <span className="w-12 h-px bg-[#262626]" />
            <span>© 2026 ONLYFOUNDERS</span>
            <span className="w-12 h-px bg-[#262626]" />
          </div>
        </footer>
      </div>

      {/* Alerts Modal */}
      {showAlerts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#262626]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-white">Alerts</h2>
                  <p className="text-xs text-gray-500">{unreadAlerts} unread</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadAlerts > 0 && (
                  <button onClick={markAllAlertsRead} className="text-xs text-primary hover:text-primary-hover transition-colors">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setShowAlerts(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No notifications yet</div>
              ) : (
                alerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => markAlertRead(alert.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${!alert.read
                      ? alert.type === "urgent"
                        ? "bg-red-500/10 border-red-500/30"
                        : alert.type === "warning"
                          ? "bg-yellow-500/10 border-yellow-500/30"
                          : "bg-primary/10 border-primary/30"
                      : "bg-[#0A0A0A] border-[#262626]"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${alert.type === "urgent" ? "bg-red-500/20" : alert.type === "warning" ? "bg-yellow-500/20" : "bg-primary/20"
                        }`}>
                        {alert.type === "urgent" ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                          alert.type === "warning" ? <Clock className="w-4 h-4 text-yellow-500" /> :
                            <Bell className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-semibold ${!alert.read ? "text-white" : "text-gray-400"}`}>{alert.title}</p>
                          {!alert.read && <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{alert.description}</p>
                        <p className="text-[10px] text-gray-600 mt-2">{alert.time}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#262626]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-white">Full Schedule</h2>
                  <p className="text-xs text-gray-500">{scheduleItems.length} events</p>
                </div>
              </div>
              <button onClick={() => setShowSchedule(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
              {scheduleItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No upcoming events</div>
              ) : (
                scheduleItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border ${item.active ? "border-primary/50 bg-primary/5" : "border-[#262626] bg-[#0A0A0A]"
                      }`}
                  >
                    <div className="flex gap-4">
                      <div className={`text-center px-3 py-2 rounded-lg flex-shrink-0 ${item.active ? "bg-primary/20" : "bg-[#121212]"}`}>
                        <p className={`text-[9px] font-bold tracking-widest ${item.active ? "text-primary" : "text-gray-500"}`}>{item.month}</p>
                        <p className={`text-xl font-bold ${item.active ? "text-primary" : "text-white"}`}>{item.date}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{item.title}</p>
                          {item.active && (
                            <span className="px-2 py-0.5 bg-primary/20 text-primary text-[8px] font-bold uppercase tracking-widest rounded-full animate-pulse">Live</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.time}
                          </span>
                          <span>{item.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tasks Modal */}
      {showTasks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#262626]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-white">Tasks</h2>
                  <p className="text-xs text-gray-500">{tasks.filter(t => t.teamStatus === "pending").length} pending</p>
                </div>
              </div>
              <button onClick={() => setShowTasks(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No tasks assigned</div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border ${task.teamStatus === "pending"
                      ? "border-yellow-500/30 bg-yellow-500/5"
                      : task.teamStatus === "submitted"
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-red-500/30 bg-red-500/5"
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${task.teamStatus === "pending" ? "bg-yellow-500/20" : task.teamStatus === "submitted" ? "bg-green-500/20" : "bg-red-500/20"
                          }`}>
                          <FileText className={`w-4 h-4 ${task.teamStatus === "pending" ? "text-yellow-500" : task.teamStatus === "submitted" ? "text-green-500" : "text-red-500"
                            }`} />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{task.title}</p>
                          <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                          <p className="text-[10px] text-gray-600 mt-2">Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${task.teamStatus === "pending"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : task.teamStatus === "submitted"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                        }`}>
                        {task.teamStatus}
                      </span>
                    </div>
                    {task.teamStatus === "pending" && (
                      <Link
                        href="/submission"
                        className="mt-4 w-full block text-center py-2 border border-primary/30 text-primary text-sm font-semibold rounded-lg hover:bg-primary/10 transition-colors"
                      >
                        Submit Now
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {showEditName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#262626]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-serif text-lg font-bold text-white">Edit Name</h2>
              </div>
              <button onClick={() => setShowEditName(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-[9px] text-gray-500 uppercase tracking-widest mb-2 font-bold">
                Full Name
              </label>
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                placeholder="Enter your full name"
                className="w-full py-3 px-4 bg-[#0A0A0A] border border-[#262626] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-primary transition-colors mb-6"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditName(false)}
                  className="flex-1 py-3 border border-[#262626] text-gray-400 font-semibold rounded-xl hover:border-white hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveName}
                  disabled={isSavingName || !editNameValue.trim()}
                  className="flex-1 py-3 bg-primary text-black font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSavingName ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <StudentBottomNav />
    </main>
  );
}
