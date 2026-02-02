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

  const hasTeam = !!user?.team;
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
        {/* Top Bar */}
        {hasTeam && (
          <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
            <img src="/only-founders-logo.png" alt="OnlyFounders Logo" className="mx-auto h-20 w-auto left-2" />
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

        {/* No Team State */}
        {!hasTeam && (
          <>
            <section className="flex flex-col items-center text-center mt-14">

              <img src="/only-founders-logo.png" alt="OnlyFounders Logo" className="mx-auto h-40 w-auto left-2" />
              
            </section>

            <p className="mt-10 px-6 text-center text-gray-400 leading-relaxed">
              Your portfolio is empty. Initialize your startup journey.
            </p>

            <section className="mt-10 flex flex-col gap-4">
              <Link
                href="/team/create"
                className="group w-full bg-[#121212] border border-[#262626] rounded-xl p-5 flex items-center justify-between transition-all hover:border-primary hover:shadow-[0_0_30px_rgba(255,215,0,0.1)]"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Create Team</h3>
                    <p className="mt-1 text-sm text-gray-500">Register a new startup idea</p>
                  </div>
                </div>
                <ArrowRight className="text-gray-500 group-hover:text-primary transition-colors" />
              </Link>

              <Link
                href="/team/join"
                className="group w-full bg-[#121212] border border-[#262626] rounded-xl p-5 flex items-center justify-between transition-all hover:border-primary hover:shadow-[0_0_30px_rgba(255,215,0,0.1)]"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                    <KeySquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Join Team</h3>
                    <p className="mt-1 text-sm text-gray-500">Enter access code</p>
                  </div>
                </div>
                <ArrowRight className="text-gray-500 group-hover:text-primary transition-colors" />
              </Link>
            </section>
          </>
        )}

        {/* Has Team State */}
        {hasTeam && (
          <>
            {/* Premium Membership Card */}
            <section className="mt-8 mb-8">
              <div className="relative w-full aspect-[1.586/1] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_40px_rgba(255,215,0,0.05)] transition-all duration-500 group hover:shadow-[0_25px_60px_rgba(0,0,0,0.6),0_0_60px_rgba(255,215,0,0.1)] hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-[#050505]" />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,215,0,0.03)_50%,transparent_100%)] group-hover:animate-pulse" />
                <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")" }} />
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-2xl" />
                <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-2xl" />

                <div className="relative z-10 h-full p-5 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.2)]">
                        <span className="text-primary text-[9px] font-black">OF</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold tracking-[0.3em] text-gray-500 uppercase block">Member</span>
                        <span className="text-[7px] text-gray-600 tracking-widest">SINCE 2024</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="w-11 h-8 bg-gradient-to-tr from-[#b8860b] via-[#ffd700] to-[#daa520] rounded-md shadow-[0_2px_8px_rgba(218,165,32,0.3)]">
                        <div className="absolute inset-0.5 rounded-[4px] bg-gradient-to-br from-[#ffd700] via-[#f0c800] to-[#b8860b]" />
                        <div className="absolute top-[40%] left-0 w-full h-[1px] bg-black/15" />
                        <div className="absolute left-[30%] top-0 w-[1px] h-full bg-black/10" />
                        <div className="absolute right-[30%] top-0 w-[1px] h-full bg-black/10" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="font-mono text-[11px] text-gray-500 tracking-[0.2em]">{user?.profile?.member_id || 'OF-XXX-XX-XXXX'}</p>
                  </div>

                  <div className="mt-auto">
                    <div className="flex justify-between items-end pb-3 border-b border-white/5">
                      <div>
                        <p className="text-[7px] text-gray-600 uppercase tracking-[0.2em] mb-1">Team</p>
                        <h2 className="font-serif text-2xl text-white tracking-wide">
                          {user?.team?.name || 'Your Team'}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(255,215,0,0.8)] animate-pulse" />
                        <span className="text-[8px] font-bold text-primary uppercase tracking-widest">Active</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {((user?.team as { members?: { id: string }[] })?.members || []).slice(0, 4).map((member: { id: string }, i: number) => (
                            <div key={member.id || i} className="w-7 h-7 rounded-full border-2 border-[#0d0d0d] bg-gradient-to-br from-gray-600 to-gray-800 overflow-hidden shadow-md">
                              <div className={`w-full h-full ${i === 0 ? "bg-gradient-to-br from-primary/60 to-yellow-700/60" : ""}`} />
                            </div>
                          ))}
                        </div>
                        {((user?.team as { members?: { id: string }[] })?.members?.length || 0) > 4 && (
                          <span className="text-[9px] text-gray-500 font-medium">+{((user?.team as { members?: { id: string }[] })?.members?.length || 0) - 4}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] text-gray-600 uppercase tracking-widest">Valid Thru</p>
                        <p className="text-[10px] text-gray-400 font-mono tracking-wider">12/26</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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
            </section>

            {/* Countdown */}
            <section className="bg-[#121212] border border-[#262626] rounded-xl p-5 flex justify-between items-center">
              <div>
                <p className="text-[9px] tracking-[0.2em] uppercase text-gray-500 font-bold">Hackathon Ends In</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white font-mono">{String(countdown.days).padStart(2, '0')}</span>
                  <span className="text-xs text-gray-500 mr-2">D</span>
                  <span className="text-3xl font-bold text-white font-mono">{String(countdown.hours).padStart(2, '0')}</span>
                  <span className="text-xs text-gray-500 mr-2">H</span>
                  <span className="text-3xl font-bold text-white font-mono">{String(countdown.minutes).padStart(2, '0')}</span>
                  <span className="text-xs text-gray-500 mr-2">M</span>
                  <span className="text-2xl font-bold text-primary font-mono">{String(countdown.seconds).padStart(2, '0')}</span>
                  <span className="text-xs text-gray-500">S</span>
                </div>
              </div>
              <div className="h-14 w-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.1)]">
                <Hourglass className="text-primary animate-pulse" />
              </div>
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

            {/* Schedule */}
            <section className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Schedule
                </h3>
                <button
                  onClick={() => setShowSchedule(true)}
                  className="text-primary text-[9px] uppercase tracking-[0.2em] font-bold cursor-pointer hover:text-primary-hover transition-colors"
                >
                  View All
                </button>
              </div>

              {scheduleItems.length === 0 ? (
                <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 text-center text-gray-500">
                  No upcoming events
                </div>
              ) : (
                scheduleItems.slice(0, 2).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setShowSchedule(true)}
                    className={`w-full mb-3 bg-[#121212] border rounded-xl p-4 flex justify-between items-center transition-all cursor-pointer text-left ${item.active ? "border-primary/50 shadow-[0_0_15px_rgba(255,215,0,0.05)]" : "border-[#262626] hover:border-primary/30"
                      }`}
                  >
                    <div className="flex gap-4 items-center">
                      <div className={`text-center px-3 py-2 rounded-lg ${item.active ? "bg-primary/20" : "bg-[#0A0A0A]"}`}>
                        <p className={`text-[9px] font-bold tracking-widest ${item.active ? "text-primary" : "text-gray-500"}`}>{item.month}</p>
                        <p className={`text-lg font-bold ${item.active ? "text-primary" : "text-white"}`}>{item.date}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="text-sm text-gray-500 mt-1">{item.time}</p>
                      </div>
                    </div>
                    {item.active && (
                      <span className="px-2 py-1 bg-primary/20 text-primary text-[8px] font-bold uppercase tracking-widest rounded-full">Live</span>
                    )}
                  </button>
                ))
              )}
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
