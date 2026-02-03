"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight, Check, Copy, ChevronDown, Users, KeySquare, Plus, Loader2,
    Crown, LogOut, UserMinus, Shield, GraduationCap, X
} from "lucide-react";
import StudentBottomNav from "../components/StudentBottomNav";
import type { College, Profile, Team } from "@/lib/types/database";

type TabType = "create" | "join";

type TeamMemberWithUser = {
    id: string;
    user_id: string;
    is_leader: boolean;
    user: Profile;
};

type TeamWithMembers = Team & {
    members: TeamMemberWithUser[];
    displayCode: string;
};

export default function TeamPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>("create");

    // User's current team
    const [currentTeam, setCurrentTeam] = useState<TeamWithMembers | null>(null);
    const [isLeader, setIsLeader] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string>("");

    // Create Team State
    const [createForm, setCreateForm] = useState({
        teamName: "",
        collegeId: "",
        size: "4",
        track: "FinTech & Digital Payments",
    });
    const [isCreated, setIsCreated] = useState(false);
    const [generatedCode, setGeneratedCode] = useState("");
    const [copied, setCopied] = useState(false);
    const [showInstitutions, setShowInstitutions] = useState(false);
    const [showSize, setShowSize] = useState(false);
    const [showTrack, setShowTrack] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Join Team State
    const [joinCode, setJoinCode] = useState(["", "", "", "", "", ""]);
    const [isJoining, setIsJoining] = useState(false);

    // Leadership Transfer State
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedNewLeader, setSelectedNewLeader] = useState<string>("");
    const [isTransferring, setIsTransferring] = useState(false);

    // Leave Team State
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    // Data
    const [colleges, setColleges] = useState<College[]>([]);

    const sizes = ["4", "5", "6"];
    const tracks = [
        "FinTech & Digital Payments",
        "AI, Automation & Digital Media",
        "Gaming & Entertainment Tech",
        "Digital Health & Wellness Tech",
        "EdTech & Learning Automation",
    ];

    const fetchUserData = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/me');
            if (!response.ok) {
                router.push('/auth/login');
                return;
            }
            const data = await response.json();
            setCurrentUserId(data.user.id);

            if (data.user.team) {
                setCurrentTeam(data.user.team);
                setIsLeader(data.user.isTeamLeader);
            }
        } catch (err) {
            console.error('Failed to fetch user:', err);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    useEffect(() => {
        async function fetchColleges() {
            try {
                const response = await fetch('/api/colleges');
                const data = await response.json();
                if (data.colleges) {
                    setColleges(data.colleges);
                }
            } catch (err) {
                console.error('Failed to fetch colleges:', err);
            }
        }
        fetchColleges();
    }, []);

    const handleCreateChange = (field: string, value: string) => {
        setCreateForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleCreateSubmit = async () => {
        setError("");

        if (!createForm.teamName || !createForm.collegeId) {
            setError("Please fill in all required fields");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamName: createForm.teamName,
                    collegeId: createForm.collegeId,
                    size: parseInt(createForm.size),
                    track: createForm.track,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to create team');
                return;
            }

            setGeneratedCode(data.team.displayCode);
            setIsCreated(true);

            // Refresh user data to get team info
            await fetchUserData();
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Create team error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        const code = currentTeam?.displayCode || generatedCode;
        navigator.clipboard.writeText(code.replace("-", ""));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleJoinCodeChange = (index: number, value: string) => {
        if (value.length > 1) return;
        const newCode = [...joinCode];
        newCode[index] = value.toUpperCase();
        setJoinCode(newCode);
        if (value && index < 5) {
            const nextInput = document.getElementById(`code-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !joinCode[index] && index > 0) {
            const prevInput = document.getElementById(`code-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleJoinSubmit = async () => {
        const fullCode = joinCode.join("");
        if (fullCode.length !== 6) {
            setError("Please enter a complete 6-character code");
            return;
        }

        setError("");
        setIsJoining(true);

        try {
            const response = await fetch('/api/teams/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: fullCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to join team');
                return;
            }

            // Refresh to show team details
            await fetchUserData();
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Join team error:', err);
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeaveTeam = async () => {
        setIsLeaving(true);
        setError("");

        try {
            const response = await fetch('/api/teams/leave', {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to leave team');
                setShowLeaveModal(false);
                return;
            }

            setCurrentTeam(null);
            setIsLeader(false);
            setShowLeaveModal(false);
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Leave team error:', err);
        } finally {
            setIsLeaving(false);
        }
    };

    const handleTransferLeadership = async () => {
        if (!selectedNewLeader) {
            setError("Please select a new leader");
            return;
        }

        setIsTransferring(true);
        setError("");

        try {
            const response = await fetch('/api/teams/transfer-leadership', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newLeaderId: selectedNewLeader }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to transfer leadership');
                return;
            }

            setShowTransferModal(false);
            setSelectedNewLeader("");
            // Refresh to update leadership status
            await fetchUserData();
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Transfer leadership error:', err);
        } finally {
            setIsTransferring(false);
        }
    };

    const selectedCollege = colleges.find(c => c.id === createForm.collegeId);
    const otherMembers = currentTeam?.members?.filter(m => m.user_id !== currentUserId) || [];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center px-4 pb-28 relative overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-full h-2/3 opacity-10"
                        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=2444&auto=format&fit=crop')" }} />
                </div>
                <div className="w-full max-w-md relative z-20 pt-8">
                    {/* Header Skeleton */}
                    <section className="text-center mb-8">
                        <div className="mx-auto w-16 h-16 rounded-full bg-[#262626] mb-4 animate-pulse" />
                        <div className="h-8 w-40 mx-auto bg-[#262626] rounded mb-2 animate-pulse" />
                        <div className="h-4 w-32 mx-auto bg-[#262626] rounded animate-pulse" />
                    </section>
                    {/* Code Card Skeleton */}
                    <div className="bg-surface-elevated border border-[#262626] rounded-xl p-4 mb-6 animate-pulse">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#262626]" />
                                <div>
                                    <div className="h-3 w-16 bg-[#262626] rounded mb-1" />
                                    <div className="h-5 w-24 bg-[#262626] rounded" />
                                </div>
                            </div>
                            <div className="w-8 h-8 bg-[#262626] rounded" />
                        </div>
                    </div>
                    {/* Stats Skeleton */}
                    <div className="bg-surface-elevated border border-[#262626] rounded-xl p-5 mb-6 animate-pulse">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <div className="h-8 w-12 mx-auto bg-[#262626] rounded mb-1" />
                                <div className="h-3 w-16 mx-auto bg-[#262626] rounded" />
                            </div>
                            <div className="text-center">
                                <div className="h-8 w-12 mx-auto bg-[#262626] rounded mb-1" />
                                <div className="h-3 w-16 mx-auto bg-[#262626] rounded" />
                            </div>
                        </div>
                    </div>
                    {/* Members Skeleton */}
                    <div className="bg-surface-elevated border border-[#262626] rounded-xl overflow-hidden mb-6 animate-pulse">
                        <div className="px-5 py-3 border-b border-[#262626]">
                            <div className="h-4 w-24 bg-[#262626] rounded" />
                        </div>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="px-5 py-4 flex items-center gap-3 border-b border-[#262626] last:border-b-0">
                                <div className="w-10 h-10 rounded-full bg-[#262626]" />
                                <div className="flex-1">
                                    <div className="h-4 w-32 bg-[#262626] rounded mb-1" />
                                    <div className="h-3 w-40 bg-[#262626] rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <StudentBottomNav />
            </div>
        );
    }

    // Show Team Details if user has a team
    if (currentTeam) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center px-4 pb-28 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-full h-2/3 bg-cover bg-center opacity-10 mix-blend-color-dodge"
                        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=2444&auto=format&fit=crop')" }}
                    />
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to from-[#0A0A0A] via-[#0A0A0A] to-transparent z-10" />
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to from-[#0A0A0A]/80 via-transparent to-[#0A0A0A] z-10" />
                    <div className="absolute top-1/4 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                </div>

                <div className="w-full max-w-md relative z-20 pt-8">
                    {/* Header */}
                    <section className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/30 mb-4 shadow-[0_0_30px_rgba(255,215,0,0.15)]">
                            <Users className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="font-serif text-3xl font-bold text-white">
                            {currentTeam.name}
                        </h2>
                        <p className="mt-2 text-gray-400 text-sm flex items-center justify-center gap-2">
                            <GraduationCap className="w-4 h-4" />
                            {currentTeam.college?.name || 'Your College'}
                        </p>
                    </section>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Team Code Card */}
                    <button
                        onClick={handleCopy}
                        className="w-full bg-surface-elevated border border-[#262626] rounded-xl p-4 flex items-center justify-between hover:border-primary/50 transition-all group mb-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <KeySquare className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Team Code</p>
                                <p className="font-mono text-lg text-white tracking-widest">{currentTeam.displayCode}</p>
                            </div>
                        </div>
                        <div className={`p-2 rounded-lg transition-all ${copied ? "bg-green-500/20" : "bg-[#0A0A0A]"}`}>
                            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors" />}
                        </div>
                    </button>

                    {/* Team Info */}
                    <div className="bg-surface-elevated border border-[#262626] rounded-xl p-5 mb-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-white">{currentTeam.members?.length || 1}</p>
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Members</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-primary">{currentTeam.size}</p>
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Max Size</p>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-[#262626]">
                            <p className="text-center">
                                <span className="text-[9px] text-gray-500 uppercase tracking-widest">Track: </span>
                                <span className="text-white font-semibold">{currentTeam.track}</span>
                            </p>
                        </div>
                    </div>

                    {/* Team Members */}
                    <div className="bg-surface-elevated border border-[#262626] rounded-xl overflow-hidden mb-6">
                        <div className="px-5 py-3 border-b border-[#262626]">
                            <h3 className="text-sm font-semibold text-white">Team Members</h3>
                        </div>
                        <div className="divide-y divide-[#262626]">
                            {currentTeam.members?.map((member) => (
                                <div key={member.id} className="px-5 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center text-primary font-serif">
                                            {member.user?.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium flex items-center gap-2">
                                                {member.user?.full_name || 'Unknown'}
                                                {member.is_leader && (
                                                    <Crown className="w-4 h-4 text-primary" />
                                                )}
                                                {member.user_id === currentUserId && (
                                                    <span className="text-[9px] text-gray-500">(You)</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-500">{member.user?.email || ''}</p>
                                        </div>
                                    </div>
                                    {member.is_leader && (
                                        <span className="px-2 py-1 bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-wider rounded">
                                            Leader
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        {isLeader && otherMembers.length > 0 && (
                            <button
                                onClick={() => setShowTransferModal(true)}
                                className="w-full bg-surface-elevated border border-[#262626] rounded-xl p-4 flex items-center justify-between hover:border-primary/50 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-primary" />
                                    <span className="text-white font-medium">Transfer Leadership</span>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors" />
                            </button>
                        )}

                        <button
                            onClick={() => setShowLeaveModal(true)}
                            className="w-full bg-surface-elevated border border-red-500/30 rounded-xl p-4 flex items-center justify-between hover:border-red-500/50 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <LogOut className="w-5 h-5 text-red-500" />
                                <span className="text-red-400 font-medium">
                                    {isLeader && otherMembers.length === 0 ? 'Delete Team' : 'Leave Team'}
                                </span>
                            </div>
                            <UserMinus className="w-5 h-5 text-gray-500 group-hover:text-red-500 transition-colors" />
                        </button>
                    </div>
                </div>

                {/* Transfer Leadership Modal */}
                {showTransferModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                        <div className="bg-surface-elevated border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-[#262626]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                                        <Crown className="w-5 h-5 text-primary" />
                                    </div>
                                    <h2 className="font-serif text-lg font-bold text-white">Transfer Leadership</h2>
                                </div>
                                <button onClick={() => setShowTransferModal(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4">
                                <p className="text-gray-400 text-sm mb-4">Select a team member to become the new leader:</p>
                                <div className="space-y-2 mb-6">
                                    {otherMembers.map((member) => (
                                        <button
                                            key={member.id}
                                            onClick={() => setSelectedNewLeader(member.user_id)}
                                            className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${selectedNewLeader === member.user_id
                                                ? "border-primary bg-primary/10"
                                                : "border-[#262626] hover:border-primary/50"
                                                }`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to from-primary/30 to-primary/10 flex items-center justify-center text-primary font-serif">
                                                {member.user?.full_name?.charAt(0) || '?'}
                                            </div>
                                            <div className="text-left">
                                                <p className="text-white font-medium">{member.user?.full_name}</p>
                                                <p className="text-xs text-gray-500">{member.user?.email}</p>
                                            </div>
                                            {selectedNewLeader === member.user_id && (
                                                <Check className="w-5 h-5 text-primary ml-auto" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={handleTransferLeadership}
                                    disabled={!selectedNewLeader || isTransferring}
                                    className="w-full py-3 bg-primary text-black font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {isTransferring ? <Loader2 className="w-5 h-5 animate-spin" /> : "Transfer Leadership"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Leave Team Modal */}
                {showLeaveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                        <div className="bg-surface-elevated border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-[#262626]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                                        <LogOut className="w-5 h-5 text-red-500" />
                                    </div>
                                    <h2 className="font-serif text-lg font-bold text-white">
                                        {isLeader && otherMembers.length === 0 ? 'Delete Team' : 'Leave Team'}
                                    </h2>
                                </div>
                                <button onClick={() => setShowLeaveModal(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4">
                                <p className="text-gray-400 text-sm mb-6">
                                    {isLeader && otherMembers.length === 0
                                        ? "You are the only member. Leaving will delete the team. Are you sure?"
                                        : isLeader
                                            ? "You must transfer leadership before leaving the team."
                                            : "Are you sure you want to leave this team?"
                                    }
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowLeaveModal(false)}
                                        className="flex-1 py-3 border border-[#262626] text-gray-400 font-semibold rounded-xl hover:border-white hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleLeaveTeam}
                                        disabled={isLeaving || (isLeader && otherMembers.length > 0)}
                                        className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                    >
                                        {isLeaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLeader && otherMembers.length === 0 ? "Delete Team" : "Leave Team")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <StudentBottomNav />
            </div>
        );
    }

    // Show Create/Join options if user has no team
    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center px-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div
                    className="absolute top-0 right-0 w-full h-2/3 bg-cover bg-center opacity-10 mix-blend-color-dodge"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=2444&auto=format&fit=crop')" }}
                />
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to from-[#0A0A0A] via-[#0A0A0A] to-transparent z-10" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to from-[#0A0A0A]/80 via-transparent to-[#0A0A0A] z-10" />
                <div className="absolute top-1/4 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            </div>

            {/* Logo */}
            <section className="mt-14 flex flex-col items-center relative z-20">
                <img src="/only-founders-logo.png" alt="OnlyFounders Logo" className="mx-auto h-20 w-auto" />
            </section>

            {/* Heading */}
            <section className="mt-8 text-center relative z-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/30 mb-4 shadow-[0_0_30px_rgba(255,215,0,0.15)]">
                    <Users className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-serif text-3xl font-bold text-white">
                    Your <span className="text-primary">Team</span>
                </h2>
                <p className="mt-3 text-gray-400 text-sm max-w-sm mx-auto">
                    Create a new team or join an existing one with an access code.
                </p>
            </section>

            {/* Error Message */}
            {error && (
                <div className="w-full max-w-md relative z-20 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm text-center">
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div className="w-full max-w-md relative z-20 mt-8">
                <div className="flex bg-surface-elevated border border-[#262626] rounded-xl p-1 mb-6">
                    <button
                        onClick={() => { setActiveTab("create"); setIsCreated(false); setError(""); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "create"
                            ? "bg-primary text-black"
                            : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <Plus className="w-4 h-4" />
                        Create Team
                    </button>
                    <button
                        onClick={() => { setActiveTab("join"); setError(""); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "join"
                            ? "bg-primary text-black"
                            : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <KeySquare className="w-4 h-4" />
                        Join Team
                    </button>
                </div>

                {/* Create Team Tab */}
                {activeTab === "create" && !isCreated && (
                    <section className="glass-panel border border-[#2A2A2A] rounded-xl animate-fade-in-up">
                        <div className="h-0.5 bg-gradient-to from-transparent via-primary to-transparent" />
                        <div className="p-6">
                            {/* Team Name */}
                            <div className="mb-5">
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                                    Team Name *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Name your squad"
                                    value={createForm.teamName}
                                    onChange={(e) => handleCreateChange("teamName", e.target.value)}
                                    className="w-full bg-[#0A0A0A] border-b-2 border-[#262626] text-white placeholder-gray-600 py-3 px-1 focus:outline-none focus:border-primary transition-colors text-sm"
                                />
                            </div>

                            {/* Institution */}
                            <div className="mb-5 relative">
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                                    Institution *
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { setShowInstitutions(!showInstitutions); setShowSize(false); setShowTrack(false); }}
                                    className="w-full bg-[#0A0A0A] border-b-2 border-[#262626] text-left py-3 px-1 flex items-center justify-between focus:outline-none hover:border-primary/50 transition-colors"
                                >
                                    <span className={selectedCollege ? "text-white text-sm" : "text-gray-600 text-sm"}>
                                        {selectedCollege?.name || "Select your college"}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showInstitutions ? "rotate-180" : ""}`} />
                                </button>
                                {showInstitutions && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1A] border border-[#262626] rounded-lg shadow-xl max-h-48 overflow-y-auto z-60">
                                        {colleges.map((college) => (
                                            <button key={college.id} type="button" onClick={() => { handleCreateChange("collegeId", college.id); setShowInstitutions(false); }}
                                                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-[#262626] hover:text-primary transition-colors">
                                                {college.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Size & Track */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="relative">
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">Size</label>
                                    <button type="button" onClick={() => { setShowSize(!showSize); setShowInstitutions(false); setShowTrack(false); }}
                                        className="w-full bg-[#0A0A0A] border-b-2 border-[#262626] text-left py-3 px-1 flex items-center justify-between focus:outline-none hover:border-primary/50 transition-colors">
                                        <span className="text-white text-sm">{createForm.size} members</span>
                                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showSize ? "rotate-180" : ""}`} />
                                    </button>
                                    {showSize && (
                                        <div className="absolute bottom-full mb-1 left-0 right-0 bg-[#1A1A1A] border border-[#262626] rounded-lg shadow-xl z-60 max-h-60 overflow-y-auto">
                                            {sizes.map((size) => (
                                                <button key={size} type="button" onClick={() => { handleCreateChange("size", size); setShowSize(false); }}
                                                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-[#262626] hover:text-primary transition-colors">
                                                    {size} members
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">Track</label>
                                    <button type="button" onClick={() => { setShowTrack(!showTrack); setShowInstitutions(false); setShowSize(false); }}
                                        className="w-full bg-[#0A0A0A] border-b-2 border-[#262626] text-left py-3 px-1 flex items-center justify-between focus:outline-none hover:border-primary/50 transition-colors">
                                        <span className="text-white text-sm">{createForm.track}</span>
                                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showTrack ? "rotate-180" : ""}`} />
                                    </button>
                                    {showTrack && (
                                        <div className="absolute bottom-full mb-1 left-0 right-0 bg-[#1A1A1A] border border-[#262626] rounded-lg shadow-xl z-60 max-h-60 overflow-y-auto">
                                            {tracks.map((track) => (
                                                <button key={track} type="button" onClick={() => { handleCreateChange("track", track); setShowTrack(false); }}
                                                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-[#262626] hover:text-primary transition-colors">
                                                    {track}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleCreateSubmit}
                                disabled={isLoading}
                                className="group relative w-full overflow-hidden bg-primary hover:bg-primary-hover text-black font-semibold py-4 transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(255,215,0,0.15)] hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
                                <span className="relative z-10 flex items-center justify-center tracking-widest uppercase text-sm">
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Generate Code
                                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>
                    </section>
                )}

                {/* Create Success */}
                {activeTab === "create" && isCreated && (
                    <section className="glass-panel border border-[#2A2A2A] rounded-xl overflow-hidden animate-fade-in-up">
                        <div className="h-0.5 bg-gradient-to from-transparent via-green-500 to-transparent" />
                        <div className="p-8 text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                                <Check className="w-8 h-8 text-green-500" />
                            </div>
                            <h2 className="font-serif text-2xl font-bold text-white mb-2">Squad Formed!</h2>
                            <p className="text-gray-500 text-sm mb-8">Share this access code with your team members.</p>
                            <button onClick={handleCopy}
                                className="w-full border-2 border-primary/30 bg-[#0A0A0A] rounded-lg p-5 mb-4 flex items-center justify-center gap-4 hover:border-primary/50 transition-colors group">
                                <span className="font-mono text-4xl font-bold text-primary tracking-[0.2em]">{generatedCode}</span>
                                {copied ? <Check className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6 text-gray-500 group-hover:text-primary transition-colors" />}
                            </button>
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-8">{copied ? "✓ Copied!" : "Tap to copy code"}</p>
                            <button onClick={() => router.push('/dashboard')}
                                className="w-full border border-[#262626] text-gray-400 font-semibold py-4 rounded-lg hover:border-primary hover:text-primary transition-colors text-sm uppercase tracking-wider">
                                Continue to Dashboard
                            </button>
                        </div>
                    </section>
                )}  

                {/* Join Team Tab */}
                {activeTab === "join" && (
                    <section className="glass-panel border border-[#2A2A2A] rounded-xl overflow-hidden animate-fade-in-up">
                        <div className="h-0.5 bg-gradient-to from-transparent via-primary to-transparent" />
                        <div className="px-6 py-8">
                            <p className="text-center text-gray-400 text-sm mb-6">
                                Enter the 6-character access code from your squad leader.
                            </p>

                            <div className="flex justify-between gap-2 mb-8">
                                {joinCode.map((char, i) => (
                                    <input
                                        key={i}
                                        id={`code-${i}`}
                                        type="text"
                                        maxLength={1}
                                        value={char}
                                        onChange={(e) => handleJoinCodeChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        className="w-12 h-14 bg-[#0A0A0A] border-b-2 border-[#2A2A2A] text-center text-xl font-semibold text-white focus:outline-none focus:border-primary transition-colors"
                                    />
                                ))}
                            </div>

                            <button
                                onClick={handleJoinSubmit}
                                disabled={isJoining}
                                className="group relative w-full overflow-hidden bg-primary hover:bg-primary-hover text-black font-semibold py-4 transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(255,215,0,0.15)] hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
                                <span className="relative z-10 flex items-center justify-center tracking-widest uppercase text-sm">
                                    {isJoining ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Join Team
                                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>
                    </section>
                )}
            </div>

            {/* Footer */}
            <footer className="mt-auto w-full max-w-md pt-10 pb-28 flex items-center gap-3 text-xs text-gray-600 relative z-20">
                <span className="flex-1 border-t border-[#2A2A2A]" />
                <span className="tracking-widest">© 2026 ONLYFOUNDERS</span>
                <span className="flex-1 border-t border-[#2A2A2A]" />
            </footer>

            <StudentBottomNav />
        </div>
    );
}
