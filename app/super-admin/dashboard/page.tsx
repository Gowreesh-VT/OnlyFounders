"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus, ArrowRight, Search, Loader2, LogOut, Edit3, X } from "lucide-react";
import SuperAdminBottomNav from "../../components/SuperAdminBottomNav";
import { useCache } from "@/lib/cache/CacheProvider";

type CollegeWithStats = {
    id: string;
    name: string;
    location: string | null;
    status: string;
    students: number;
    teams: number;
    admins: number;
};

type Stats = {
    totalColleges: number;
    activeColleges: number;
    totalStudents: number;
    totalTeams: number;
};

export default function SuperAdminDashboard() {
    const router = useRouter();
    const cache = useCache();
    const [searchQuery, setSearchQuery] = useState("");
    const [userName, setUserName] = useState("Super Admin");
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [colleges, setColleges] = useState<CollegeWithStats[]>([]);
    const [stats, setStats] = useState<Stats>({
        totalColleges: 0,
        activeColleges: 0,
        totalStudents: 0,
        totalTeams: 0,
    });
    const [showEditName, setShowEditName] = useState(false);
    const [newName, setNewName] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            // Check cache for user info first
            const cachedUser = cache.get<{ name: string }>('super-admin-user');
            if (cachedUser) {
                setUserName(cachedUser.name);
            }

            // Check cache for colleges
            const cached = cache.get<{ colleges: CollegeWithStats[]; stats: Stats }>('super-admin-colleges');
            if (cached && cachedUser) {
                setColleges(cached.colleges);
                setStats(cached.stats);
                setLoading(false);
                return;
            }

            // Verify auth and get user info
            const userRes = await fetch('/api/auth/me');
            if (!userRes.ok) {
                router.push('/auth/login');
                return;
            }
            const userData = await userRes.json();
            const name = userData.user?.profile?.full_name || "Super Admin";
            setUserName(name);
            cache.set('super-admin-user', { name }, 10 * 60 * 1000); // 10 min cache

            if (userData.user?.profile?.role !== 'super_admin') {
                router.push('/dashboard');
                return;
            }

            // Fetch colleges
            const collegesRes = await fetch('/api/super-admin/colleges');
            if (collegesRes.ok) {
                const data = await collegesRes.json();
                setColleges(data.colleges || []);
                setStats(data.stats || { totalColleges: 0, activeColleges: 0, totalStudents: 0, totalTeams: 0 });
                cache.set('super-admin-colleges', { colleges: data.colleges, stats: data.stats });
            } else {
                setError('Failed to fetch data');
            }
        } catch (err) {
            console.error('Failed to fetch:', err);
            setError('Failed to load dashboard');
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

    const filteredColleges = colleges.filter(
        (college) =>
            college.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (college.location?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );

    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'active': return { label: 'Active', class: 'bg-green-500/20 text-green-400 border-green-500/30' };
            case 'pending': return { label: 'Pending', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
            case 'inactive': return { label: 'Inactive', class: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
            default: return { label: status, class: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </main>
        );
    }

    return (
        <div className="min-h-screen pb-28 bg-[#0A0A0A] text-white relative overflow-hidden">
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
            <header className="relative z-10 px-6  flex items-center justify-between border-b border-[#262626]">
                <div className="flex items-center">
                    <div>
                        <img
                            src="/only-founders-logo.png"
                            alt="Logo"
                            className="w-30 h-30 object-contain"
                        />
                    </div>
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
                            <div className="absolute right-0 top-14 w-52 bg-[#121212] border border-[#262626] rounded-xl shadow-2xl overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-[#262626]">
                                    <p className="text-white font-medium text-sm truncate">{userName}</p>
                                    <p className="text-[10px] text-primary uppercase tracking-wider">Super Admin</p>
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

            <div className="relative px-6 py-6 max-w-4xl mx-auto">
                {/* Welcome */}
                <section className="mb-8">
                    <h2 className="text-3xl font-serif font-bold text-white mb-2">
                        Welcome, <span className="text-primary">{userName.split(' ')[0]}</span>
                    </h2>
                    <p className="text-sm text-gray-400">
                        Manage colleges, onboard institutions, and oversee the network.
                    </p>
                </section>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex justify-between items-center">
                        <span>{error}</span>
                        <button onClick={() => { setError(''); fetchData(); }} className="text-primary hover:underline">Retry</button>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    <div className="bg-[#121212] border border-[#262626] rounded-lg p-4 text-center hover:border-primary/30 transition-colors">
                        <p className="text-2xl font-bold text-white mb-1">{stats.totalColleges}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">Colleges</p>
                    </div>
                    <div className="bg-[#121212] border border-primary/30 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-primary mb-1">{stats.activeColleges}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">Active</p>
                    </div>
                    <div className="bg-[#121212] border border-[#262626] rounded-lg p-4 text-center hover:border-primary/30 transition-colors">
                        <p className="text-2xl font-bold text-white mb-1">{stats.totalStudents.toLocaleString()}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">Students</p>
                    </div>
                    <div className="bg-[#121212] border border-[#262626] rounded-lg p-4 text-center hover:border-primary/30 transition-colors">
                        <p className="text-2xl font-bold text-white mb-1">{stats.totalTeams}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">Teams</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <Link
                        href="/super-admin/colleges"
                        className="bg-[#121212] border border-[#262626] rounded-xl p-5 hover:border-primary/50 transition-all group"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-serif font-semibold text-white">Manage Colleges</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">View and edit all institutions</p>
                        <span className="text-primary text-xs uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                            View All <ArrowRight className="w-3 h-3" />
                        </span>
                    </Link>

                    <Link
                        href="/super-admin/colleges/create"
                        className="bg-[#121212] border border-[#262626] rounded-xl p-5 hover:border-green-500/50 transition-all group"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-green-500" />
                            </div>
                            <h3 className="font-serif font-semibold text-white">Onboard College</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Add new institution to network</p>
                        <span className="text-green-500 text-xs uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                            Create New <ArrowRight className="w-3 h-3" />
                        </span>
                    </Link>
                </div>

                {/* Recent Colleges */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-serif text-xl font-bold text-white">Recent Colleges</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-[#121212] border border-[#262626] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-colors w-40"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredColleges.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                {searchQuery ? 'No colleges found matching your search.' : 'No colleges yet. Create one to get started!'}
                            </div>
                        )}

                        {filteredColleges.slice(0, 5).map((college) => {
                            const statusInfo = getStatusDisplay(college.status);
                            return (
                                <Link
                                    key={college.id}
                                    href={`/super-admin/colleges/${college.id}`}
                                    className="block bg-[#121212] border border-[#262626] rounded-xl p-4 hover:border-primary/30 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-serif text-sm">
                                                {college.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{college.name}</p>
                                                <p className="text-xs text-gray-500">{college.location || 'No location'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-white">{college.students}</p>
                                                <p className="text-[9px] text-gray-500 uppercase">Students</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-white">{college.teams}</p>
                                                <p className="text-[9px] text-gray-500 uppercase">Teams</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${statusInfo.class}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {filteredColleges.length > 5 && (
                        <Link
                            href="/super-admin/colleges"
                            className="block mt-4 text-center text-primary text-sm hover:underline"
                        >
                            View all {filteredColleges.length} colleges →
                        </Link>
                    )}
                </section>
            </div>

            {/* Bottom Navigation */}
            <SuperAdminBottomNav />

            {/* Edit Name Modal */}
            {showEditName && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80">
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
                                                cache.set('super-admin-user', { name: newName.trim() }, 10 * 60 * 1000);
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
        </div>
    );
}
