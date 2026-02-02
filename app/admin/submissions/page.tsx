/* Mobile-first submissions admin view with dynamic data from backend. */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, Search, Filter, ChevronDown, Loader2, LogOut, Edit3, X, Users, Mail, Crown, Calendar, FileText, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import AdminBottomNav from "../../components/AdminBottomNav";
import { useCache } from "@/lib/cache/CacheProvider";

type SubmissionStatus = "selected" | "not_selected" | "not_viewed" | "waiting";

type Submission = {
  id: string;
  project_title: string;
  status: SubmissionStatus;
  drive_link?: string | null;
  team?: {
    id: string;
    name: string;
    code: string;
  };
};

type TeamMember = {
  id: string;
  is_leader: boolean;
  joined_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    member_id: string | null;
  };
};

type TeamDetails = {
  id: string;
  name: string;
  code: string;
  track: string;
  status: string;
  created_at: string;
  leader: { id: string; full_name: string; email: string } | null;
  college: { name: string } | null;
  members: TeamMember[];
  submission: {
    id: string;
    project_title: string;
    idea: string;
    drive_link: string;
    status: string;
    submitted_at: string;
    admin_notes: string | null;
  } | null;
};

const statusOptions: { value: SubmissionStatus; label: string }[] = [
  { value: "selected", label: "Select" },
  { value: "not_selected", label: "Not Selected" },
  { value: "not_viewed", label: "Not View" },
  { value: "waiting", label: "Waiting" },
];

const statusColors: Record<SubmissionStatus, string> = {
  "selected": "bg-green-500/20 text-green-400 border-green-500/30",
  "not_selected": "bg-red-500/20 text-red-400 border-red-500/30",
  "not_viewed": "bg-gray-500/20 text-gray-400 border-gray-500/30",
  "waiting": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const statusLabels: Record<SubmissionStatus, string> = {
  "selected": "Select",
  "not_selected": "Not Selected",
  "not_viewed": "Not View",
  "waiting": "Waiting",
};

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const cache = useCache();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [collegeName, setCollegeName] = useState("");
  const [userName, setUserName] = useState("Admin");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">("all");
  const [selectedTeam, setSelectedTeam] = useState<TeamDetails | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

  const fetchData = useCallback(async () => {
    try {
      // Check cache
      const cachedUser = cache.get<{ name: string; college: string }>('admin-user');
      const cachedSubmissions = cache.get<Submission[]>('admin-submissions');

      if (cachedUser && cachedSubmissions) {
        setUserName(cachedUser.name);
        setCollegeName(cachedUser.college);
        setSubmissions(cachedSubmissions);
        setLoading(false);
        return;
      }

      // Auth check
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/auth/login');
        return;
      }
      const userData = await userRes.json();
      if (userData.user?.profile?.role !== 'admin' && userData.user?.profile?.role !== 'super_admin') {
        router.push('/dashboard');
        return;
      }

      const name = userData.user?.profile?.full_name || 'Admin';
      const college = userData.user?.profile?.college?.name || 'Your College';
      setUserName(name);
      setCollegeName(college);
      cache.set('admin-user', { name, college }, 10 * 60 * 1000);

      // Fetch submissions
      const submissionsRes = await fetch('/api/submissions');
      if (submissionsRes.ok) {
        const data = await submissionsRes.json();
        setSubmissions(data.submissions || []);
        cache.set('admin-submissions', data.submissions || []);
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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    cache.invalidateAll();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  const totalTeams = submissions.length;
  const pendingTeams = submissions.filter((s) => s.status === "waiting" || s.status === "not_viewed").length;
  const selectedTeams = submissions.filter((s) => s.status === "selected").length;

  const updateStatus = async (id: string, status: SubmissionStatus) => {
    try {
      const response = await fetch(`/api/submissions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setSubmissions((prev) =>
          prev.map((s) => s.id === id ? { ...s, status } : s)
        );
        cache.invalidate('admin-submissions');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
    setOpenDropdown(null);
  };

  const openTeamDetails = async (teamId: string) => {
    if (!teamId) return;
    setLoadingTeam(true);
    setShowTeamModal(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTeam(data.team);
      }
    } catch (error) {
      console.error('Failed to fetch team:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const filteredSubmissions = submissions.filter(
    (s) => {
      // Status filter
      if (statusFilter !== "all" && s.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        return (
          (s.team?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          (s.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        );
      }
      return true;
    }
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white pb-28 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-2/3 bg-cover bg-center opacity-10 mix-blend-color-dodge"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=2444&auto=format&fit=crop')" }} />
        </div>
        {/* Header Skeleton */}
        <header className="relative z-20 px-6 py-3 flex items-center justify-between border-b border-[#262626] bg-[#0A0A0A]">
          <div className="h-10 w-24 bg-[#262626] rounded animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-[#262626] animate-pulse" />
        </header>
        {/* Content Skeleton */}
        <div className="relative z-10 px-6 py-6">
          {/* Stats Skeleton */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#121212] border border-[#262626] rounded-lg p-4 text-center animate-pulse">
                <div className="h-8 bg-[#262626] rounded w-12 mx-auto mb-2" />
                <div className="h-3 bg-[#262626] rounded w-16 mx-auto" />
              </div>
            ))}
          </div>
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-[#262626] rounded w-32 animate-pulse" />
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-[#262626] rounded animate-pulse" />
              <div className="w-8 h-8 bg-[#262626] rounded animate-pulse" />
            </div>
          </div>
          {/* Table Skeleton */}
          <div className="border border-[#262626] rounded-lg overflow-hidden">
            <div className="bg-[#121212] px-4 py-3 border-b border-[#262626]">
              <div className="h-3 bg-[#262626] rounded w-24 animate-pulse" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 py-4 flex items-center justify-between border-b border-[#262626] last:border-b-0 animate-pulse">
                <div className="flex-1">
                  <div className="h-4 bg-[#262626] rounded w-32 mb-2" />
                  <div className="h-3 bg-[#262626] rounded w-24" />
                </div>
                <div className="w-8 h-8 bg-[#262626] rounded mx-4" />
                <div className="w-20 h-6 bg-[#262626] rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white pb-28 relative overflow-hidden">
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

      {/* Header */}
      <header className="relative z-20 px-6 py-3 flex items-center justify-between border-b border-[#262626] bg-[#0A0A0A]">
        <div className="flex items-center">
          <img
            src="/only-founders-logo.png"
            alt="Logo"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-serif text-sm hover:border-primary/50 transition-colors uppercase"
          >
            {userName.charAt(0)}
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#121212] border border-[#262626] rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-[#262626]">
                  <p className="text-white font-medium text-sm truncate">{userName}</p>
                  <p className="text-[10px] text-primary uppercase tracking-wider">Admin • {collegeName}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setNewName(userName);
                      setShowEditName(true);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-gray-300 hover:bg-[#1A1A1A] transition-colors text-left"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="text-sm">Edit Name</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full px-4 py-3 flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="relative z-10 px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-[#121212] border border-[#262626] rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white mb-1">{totalTeams}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest">Total</p>
          </div>
          <div className="bg-[#121212] border border-primary/30 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-primary mb-1">{pendingTeams}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest">Pending</p>
          </div>
          <div className="bg-[#121212] border border-[#262626] rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white mb-1">{selectedTeams}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest">Selected</p>
          </div>
        </div>

        {/* Executive View Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-bold text-white">Executive View</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 transition-colors ${showSearch ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
            >
              <Search className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={`p-2 transition-colors ${showFilter || statusFilter !== 'all' ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
              >
                <Filter className="w-5 h-5" />
                {statusFilter !== 'all' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>

              {showFilter && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFilter(false)} />
                  <div className="absolute top-full right-0 mt-2 bg-[#1A1A1A] border border-[#262626] rounded-lg shadow-2xl z-50 overflow-hidden min-w-[150px]">
                    <button
                      onClick={() => { setStatusFilter('all'); setShowFilter(false); }}
                      className={`w-full text-left px-4 py-3 text-xs hover:bg-[#262626] transition-colors border-b border-[#262626] ${statusFilter === 'all' ? 'text-primary bg-primary/10' : 'text-gray-300'}`}
                    >
                      All Status
                    </button>
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => { setStatusFilter(option.value); setShowFilter(false); }}
                        className={`w-full text-left px-4 py-3 text-xs hover:bg-[#262626] transition-colors border-b border-[#262626] last:border-b-0 ${statusFilter === option.value ? 'text-primary bg-primary/10' : 'text-gray-300'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by team name or project title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121212] border border-[#262626] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>
        )}

        {/* Active Filters */}
        {(statusFilter !== 'all' || searchQuery) && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            {statusFilter !== 'all' && (
              <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${statusColors[statusFilter]}`}>
                {statusLabels[statusFilter]}
                <button onClick={() => setStatusFilter('all')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}
              className="text-xs text-gray-500 hover:text-primary transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Table Header */}
        <div className="bg-[#121212] border border-[#262626] rounded-t-lg px-4 py-3 flex items-center justify-between">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest flex-1">
            Team / Project
          </span>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest w-12 text-center">
            PPT
          </span>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest w-28 text-right">
            Status
          </span>
        </div>

        {/* Team Rows */}
        <div className="border-x border-b border-[#262626] rounded-b-lg">
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No submissions found matching your search' : 'No submissions yet'}
            </div>
          ) : (
            filteredSubmissions.map((submission, index) => (
              <div
                key={submission.id}
                className={`px-4 py-4 flex items-center justify-between transition-colors ${index !== filteredSubmissions.length - 1 ? "border-b border-[#262626]" : ""
                  } ${!submission.drive_link ? "border-l-2 border-l-red-500 bg-red-500/5" : ""}`}
              >
                <div
                  className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => submission.team?.id && openTeamDetails(submission.team.id)}
                >
                  <h3 className="font-serif text-base font-semibold text-white flex items-center gap-2">
                    {submission.team?.name || 'Unknown Team'}
                    <Users className="w-3 h-3 text-gray-500" />
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500">{submission.project_title}</p>
                    {!submission.drive_link && (
                      <span className="text-[8px] font-bold text-red-500 bg-red-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                        Missing Doc
                      </span>
                    )}
                  </div>
                </div>

                {/* PPT Icon */}
                <div className="w-12 flex justify-center">
                  {submission.drive_link ? (
                    <a
                      href={submission.drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-primary transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </a>
                  ) : (
                    <span className="text-gray-700">—</span>
                  )}
                </div>

                {/* Status Dropdown */}
                <div className="w-28 flex justify-end relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === submission.id ? null : submission.id);
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded border text-[10px] font-semibold uppercase tracking-wider transition-colors ${statusColors[submission.status]}`}
                  >
                    {statusLabels[submission.status]}
                    <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === submission.id ? "rotate-180" : ""}`} />
                  </button>

                  {openDropdown === submission.id && (
                    <>
                      {/* Backdrop to close dropdown */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpenDropdown(null)}
                      />
                      <div className="absolute top-full right-0 mt-1 bg-[#1A1A1A] border border-[#262626] rounded-lg shadow-2xl z-50 overflow-hidden min-w-[130px]">
                        {statusOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(submission.id, option.value);
                            }}
                            className={`w-full text-left px-4 py-3 text-xs hover:bg-[#262626] transition-colors border-b border-[#262626] last:border-b-0 ${submission.status === option.value ? "text-primary bg-primary/10" : "text-gray-300"
                              }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <AdminBottomNav />

      {/* Edit Name Modal */}
      {showEditName && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 w-full max-w-sm relative">
            <button
              onClick={() => setShowEditName(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-serif text-xl font-bold text-white mb-6">Edit Name</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-[#0A0A0A] border border-[#262626] text-white py-3 px-4 focus:outline-none focus:border-primary transition-colors text-sm rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEditName(false)}
                  className="flex-1 border border-[#262626] text-gray-400 font-semibold py-3 rounded-lg hover:border-gray-500 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newName.trim()) return;
                    setIsSavingName(true);
                    try {
                      const res = await fetch('/api/profile/update', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fullName: newName.trim() }),
                      });
                      if (res.ok) {
                        setUserName(newName.trim());
                        cache.set('admin-user', { name: newName.trim(), college: collegeName }, 10 * 60 * 1000);
                        setShowEditName(false);
                      }
                    } catch (err) {
                      console.error('Failed to update name:', err);
                    } finally {
                      setIsSavingName(false);
                    }
                  }}
                  disabled={isSavingName || !newName.trim()}
                  className="flex-1 bg-primary hover:bg-primary-hover text-black font-semibold py-3 rounded-lg transition-colors text-sm flex items-center justify-center disabled:opacity-50"
                >
                  {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#121212] border border-[#262626] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => { setShowTeamModal(false); setSelectedTeam(null); }}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingTeam ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : selectedTeam ? (
              <div className="p-6">
                {/* Team Header */}
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[#262626]">
                  <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-white">{selectedTeam.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 font-mono">{selectedTeam.code}</span>
                      <span className="text-xs text-gray-600">•</span>
                      <span className="text-xs text-gray-500">{selectedTeam.college?.name}</span>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="mb-6">
                  <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3 font-bold flex items-center gap-2">
                    <Users className="w-3 h-3" /> Team Members ({selectedTeam.members.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedTeam.members.map((member) => (
                      <div
                        key={member.id}
                        className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${member.is_leader ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-gray-800 text-gray-400'}`}>
                            {member.user.full_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium flex items-center gap-2">
                              {member.user.full_name}
                              {member.is_leader && <Crown className="w-3 h-3 text-primary" />}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {member.user.email}
                            </p>
                          </div>
                        </div>
                        {member.user.member_id && (
                          <span className="text-[10px] text-gray-600 font-mono">{member.user.member_id}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submission Info */}
                {selectedTeam.submission && (
                  <div>
                    <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3 font-bold flex items-center gap-2">
                      <FileText className="w-3 h-3" /> Submission Details
                    </h3>
                    <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-[9px] text-gray-600 uppercase tracking-widest">Project Title</p>
                        <p className="text-white font-semibold">{selectedTeam.submission.project_title}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-600 uppercase tracking-widest">Idea</p>
                        <p className="text-gray-300 text-sm leading-relaxed">{selectedTeam.submission.idea}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#262626]">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(selectedTeam.submission.submitted_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                        {selectedTeam.submission.drive_link && (
                          <a
                            href={selectedTeam.submission.drive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Pitch Deck
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Send Notification Button */}
                <button
                  onClick={async () => {
                    if (!selectedTeam?.submission) return;
                    const status = selectedTeam.submission.status;
                    const title = status === 'selected' ? "Congratulations! You've been selected!" :
                      status === 'not_selected' ? "Submission Update" :
                        status === 'waiting' ? "Your submission is under review" :
                          "Submission status updated";
                    const description = status === 'selected' ? "Your team has been selected to advance to the next round." :
                      status === 'not_selected' ? "Thank you for participating. Keep building!" :
                        status === 'waiting' ? "Our judges are reviewing your pitch deck." :
                          "Check your submission for updates.";

                    // Send to all team members (in-app + push)
                    for (const member of selectedTeam.members) {
                      // In-app notification
                      await fetch('/api/notifications', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: member.user.id,
                          title,
                          description,
                          type: status === 'not_selected' ? 'warning' : 'info'
                        })
                      });

                      // Web Push (background/closed app)
                      await fetch('/api/web-push/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: member.user.id,
                          title,
                          message: description
                        })
                      });
                    }
                    setToast({ message: 'Notifications sent to team members!', show: true });
                    setTimeout(() => setToast({ message: '', show: false }), 3000);
                  }}
                  className="w-full mt-6 py-3 bg-primary hover:bg-primary-hover text-black font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Send Status Notification
                </button>

                {/* Close Button */}
                <button
                  onClick={() => { setShowTeamModal(false); setSelectedTeam(null); }}
                  className="w-full mt-3 py-3 border border-[#262626] text-gray-400 font-semibold rounded-lg hover:border-primary hover:text-primary transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20 text-gray-500">
                Failed to load team details
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-[#121212] border border-primary/30 rounded-xl px-6 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(255,215,0,0.1)] flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Mail className="w-3 h-3 text-primary" />
            </div>
            <p className="text-white text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </main>
  );
}
