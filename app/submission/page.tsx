"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Link as LinkIcon, Check, AlertCircle, Loader2, FileText, Users, GraduationCap, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import StudentBottomNav from "../components/StudentBottomNav";
import type { Profile, Team, Submission } from "@/lib/types/database";

type SubmissionStatus = "not_viewed" | "waiting" | "selected" | "not_selected";

const statusConfig: Record<SubmissionStatus, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
    not_viewed: { label: "Pending Review", color: "text-gray-400", bgColor: "bg-gray-500/20 border-gray-500/30", icon: Clock },
    waiting: { label: "Under Review", color: "text-yellow-400", bgColor: "bg-yellow-500/20 border-yellow-500/30", icon: Eye },
    selected: { label: "Selected!", color: "text-green-400", bgColor: "bg-green-500/20 border-green-500/30", icon: CheckCircle },
    not_selected: { label: "Not Selected", color: "text-red-400", bgColor: "bg-red-500/20 border-red-500/30", icon: XCircle },
};

export default function SubmissionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<{ profile: Profile; team: Team } | null>(null);
    const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
    const [isTeamLeader, setIsTeamLeader] = useState(false);

    const [formData, setFormData] = useState({
        projectTitle: "",
        idea: "",
        driveLink: "",
        publicAccess: false,
    });
    const [linkStatus, setLinkStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
    const [linkError, setLinkError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState("");

    const fetchUserData = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/me');
            if (!response.ok) {
                router.push('/auth/login');
                return;
            }
            const data = await response.json();
            if (!data.user?.team) {
                router.push('/team');
                return;
            }
            setUserData(data.user);

            // Check if user is team leader
            const isLeader = data.user.team.leader_id === data.user.profile.id;
            setIsTeamLeader(isLeader);

            // Fetch existing submission for the team
            if (data.user.team?.id) {
                const subRes = await fetch(`/api/submissions/team/${data.user.team.id}`);
                if (subRes.ok) {
                    const subData = await subRes.json();
                    if (subData.submission) {
                        setExistingSubmission(subData.submission);
                        // Pre-fill form with existing data
                        setFormData({
                            projectTitle: subData.submission.project_title || "",
                            idea: subData.submission.idea || "",
                            driveLink: subData.submission.drive_link || "",
                            publicAccess: subData.submission.public_access_confirmed || false,
                        });
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch user:', err);
            router.push('/auth/login');
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (field === "driveLink" && typeof value === "string") {
            validateDriveLink(value);
        }
    };

    const validateDriveLink = (url: string) => {
        if (!url) {
            setLinkStatus("idle");
            setLinkError("");
            return;
        }

        setLinkStatus("checking");
        setLinkError("");

        setTimeout(() => {
            const drivePatterns = [
                /^https:\/\/drive\.google\.com\//,
                /^https:\/\/docs\.google\.com\//,
                /^https:\/\/sheets\.google\.com\//,
                /^https:\/\/slides\.google\.com\//,
            ];

            const isValidDriveUrl = drivePatterns.some(pattern => pattern.test(url));

            if (!isValidDriveUrl) {
                setLinkStatus("invalid");
                setLinkError("Please enter a valid Google Drive link");
                return;
            }

            const publicIndicators = [/sharing/i, /usp=sharing/, /\/view/, /\/edit/, /\/preview/, /open\?id=/, /\/folders\//, /\/d\//];
            const appearsPublic = publicIndicators.some(pattern => pattern.test(url));

            if (appearsPublic) {
                setLinkStatus("valid");
                setLinkError("");
            } else {
                setLinkStatus("invalid");
                setLinkError("Ensure link is set to 'Anyone with the link'");
            }
        }, 800);
    };

    const wordCount = formData.idea.trim().split(/\s+/).filter(Boolean).length;

    const handleSubmit = async () => {
        setError("");

        if (!formData.projectTitle || !formData.idea || !formData.driveLink) {
            setError("Please fill in all required fields");
            return;
        }
        if (linkStatus !== "valid") {
            setError("Please provide a valid public Google Drive link");
            return;
        }
        if (!formData.publicAccess) {
            setError("Please confirm public access");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectTitle: formData.projectTitle,
                    idea: formData.idea,
                    driveLink: formData.driveLink,
                    publicAccessConfirmed: formData.publicAccess,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to submit');
                return;
            }

            setIsSubmitted(true);
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Submit error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </main>
        );
    }

    const teamCode = userData?.team?.code
        ? userData.team.code.slice(0, 3) + '-' + userData.team.code.slice(3)
        : '';

    // Success screen after submission
    if (isSubmitted) {
        return (
            <main className="min-h-screen bg-[#0A0A0A] px-4 py-6 pb-28 relative overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-full h-2/3 bg-cover bg-center opacity-10 mix-blend-color-dodge"
                        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=2444&auto=format&fit=crop')" }} />
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent z-10" />
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#0A0A0A]/80 via-transparent to-[#0A0A0A] z-10" />
                    <div className="absolute bottom-1/3 left-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 max-w-md mx-auto flex flex-col items-center justify-center min-h-[80vh] text-center">
                    <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(34,197,94,0.2)]">
                        <Check className="w-10 h-10 text-green-500" />
                    </div>
                    <h1 className="text-3xl font-serif font-bold text-white mb-3">
                        Submitted <span className="text-primary italic">Successfully</span>
                    </h1>
                    <p className="text-gray-400 text-sm mb-8 max-w-xs">
                        Your application has been received. We&apos;ll notify you about the next steps.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-8 py-3 border border-[#262626] text-gray-400 font-semibold rounded-xl hover:border-primary hover:text-primary transition-colors text-sm uppercase tracking-wider"
                    >
                        Back to Dashboard
                    </button>
                </div>
                <StudentBottomNav />
            </main>
        );
    }

    // If there's an existing submission - show status view
    if (existingSubmission) {
        const status = existingSubmission.status as SubmissionStatus;
        const statusInfo = statusConfig[status];
        const StatusIcon = statusInfo.icon;

        return (
            <main className="min-h-screen bg-[#0A0A0A] px-4 py-6 pb-28 relative overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-full h-2/3 bg-cover bg-center opacity-10 mix-blend-color-dodge"
                        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=2444&auto=format&fit=crop')" }} />
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent z-10" />
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#0A0A0A]/80 via-transparent to-[#0A0A0A] z-10" />
                    <div className="absolute top-1/4 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 max-w-md mx-auto">
                    {/* Header */}
                    <header className="mb-6">
                        <p className="text-[10px] tracking-[0.3em] uppercase text-primary font-bold">
                            Submission Status
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.1)]">
                                <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-serif font-bold text-white">
                                    Team <span className="italic text-gray-300">Submission</span>
                                </h1>
                                <p className="text-sm text-gray-500">OnlyFounders Hackathon</p>
                            </div>
                        </div>
                    </header>

                    {/* Status Card */}
                    <div className={`rounded-xl p-6 mb-6 border ${statusInfo.bgColor}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${statusInfo.bgColor}`}>
                                <StatusIcon className={`w-7 h-7 ${statusInfo.color}`} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Application Status</p>
                                <h2 className={`text-2xl font-bold ${statusInfo.color}`}>{statusInfo.label}</h2>
                            </div>
                        </div>
                    </div>

                    {/* Team Info Card */}
                    <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-white font-semibold">{userData?.team?.name || 'Your Team'}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <GraduationCap className="w-3 h-3" />
                                        {userData?.profile?.college?.name || 'Your College'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-gray-600 uppercase tracking-widest">Team Code</p>
                                <p className="font-mono text-sm text-primary">{teamCode}</p>
                            </div>
                        </div>
                    </div>

                    {/* Submission Details - View Only */}
                    <div className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden mb-6">
                        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

                        <div className="p-5 space-y-5">
                            {/* Project Title */}
                            <div>
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Project Title</p>
                                <p className="text-white font-semibold">{existingSubmission.project_title}</p>
                            </div>

                            {/* The Big Idea */}
                            <div>
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2 font-bold">The Big Idea</p>
                                <p className="text-gray-300 text-sm leading-relaxed">{existingSubmission.idea}</p>
                            </div>

                            {/* Pitch Deck Link */}
                            <div>
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Pitch Deck</p>
                                <a
                                    href={existingSubmission.drive_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary text-sm hover:underline flex items-center gap-2"
                                >
                                    <LinkIcon className="w-4 h-4" />
                                    View Pitch Deck
                                </a>
                            </div>

                            {/* Submitted At */}
                            <div>
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Submitted</p>
                                <p className="text-gray-400 text-sm">
                                    {new Date(existingSubmission.submitted_at).toLocaleString('en-IN', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Back Button */}
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full py-4 border border-[#262626] text-gray-400 font-semibold rounded-xl hover:border-primary hover:text-primary transition-colors text-sm uppercase tracking-wider"
                    >
                        Back to Dashboard
                    </button>

                    {/* Footer */}
                    <footer className="mt-10 text-center">
                        <div className="flex items-center justify-center gap-3 text-[10px] text-gray-600 tracking-widest">
                            <span className="w-12 h-px bg-[#262626]" />
                            <span>© 2026 ONLYFOUNDERS</span>
                            <span className="w-12 h-px bg-[#262626]" />
                        </div>
                    </footer>
                </div>

                <StudentBottomNav />
            </main>
        );
    }

    // Non-leader view - cannot submit
    if (!isTeamLeader) {
        return (
            <main className="min-h-screen bg-[#0A0A0A] px-4 py-6 pb-28 relative overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-full h-2/3 bg-cover bg-center opacity-10 mix-blend-color-dodge"
                        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=2444&auto=format&fit=crop')" }} />
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent z-10" />
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#0A0A0A]/80 via-transparent to-[#0A0A0A] z-10" />
                    <div className="absolute top-1/4 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 max-w-md mx-auto flex flex-col items-center justify-center min-h-[80vh] text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-500/20 border border-gray-500/30 flex items-center justify-center mb-6">
                        <Users className="w-10 h-10 text-gray-400" />
                    </div>
                    <h1 className="text-2xl font-serif font-bold text-white mb-3">
                        Team Leader <span className="text-primary italic">Required</span>
                    </h1>
                    <p className="text-gray-400 text-sm mb-2 max-w-xs">
                        Only the team leader can submit the application.
                    </p>
                    <p className="text-gray-500 text-xs mb-8 max-w-xs">
                        Please ask your team leader to submit on behalf of your team.
                    </p>

                    {/* Team Info */}
                    <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 mb-8 w-full max-w-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="text-white font-semibold text-sm">{userData?.team?.name}</p>
                                <p className="text-xs text-gray-500">Code: {teamCode}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-8 py-3 border border-[#262626] text-gray-400 font-semibold rounded-xl hover:border-primary hover:text-primary transition-colors text-sm uppercase tracking-wider"
                    >
                        Back to Dashboard
                    </button>
                </div>
                <StudentBottomNav />
            </main>
        );
    }

    // Team leader - can submit (original form)
    return (
        <main className="min-h-screen bg-[#0A0A0A] px-4 py-6 pb-28 relative overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-full h-2/3 bg-cover bg-center opacity-10 mix-blend-color-dodge"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=2444&auto=format&fit=crop')" }} />
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent z-10" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#0A0A0A]/80 via-transparent to-[#0A0A0A] z-10" />
                <div className="absolute top-1/4 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-md mx-auto">
                {/* Header */}
                <header className="mb-6">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-primary font-bold">Submit Application</p>
                    <div className="mt-2 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.1)]">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-serif font-bold text-white">
                                Pitch <span className="italic text-gray-300">Submission</span>
                            </h1>
                            <p className="text-sm text-gray-500">OnlyFounders Hackathon</p>
                        </div>
                    </div>
                </header>

                {/* Team Info Card */}
                <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-white font-semibold">{userData?.team?.name || 'Your Team'}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <GraduationCap className="w-3 h-3" />
                                    {userData?.profile?.college?.name || 'Your College'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-gray-600 uppercase tracking-widest">Team Leader</p>
                            <p className="font-mono text-xs text-green-400">✓ You</p>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Form Card */}
                <div className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

                    <div className="p-5 space-y-6">
                        {/* Project Title */}
                        <div>
                            <label className="block text-[9px] text-gray-500 uppercase tracking-widest mb-2 font-bold">
                                Project Title *
                            </label>
                            <input
                                type="text"
                                value={formData.projectTitle}
                                onChange={(e) => handleChange("projectTitle", e.target.value)}
                                placeholder="Name your startup"
                                className="w-full py-3 px-4 bg-[#0A0A0A] border border-[#262626] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>

                        {/* The Big Idea */}
                        <div>
                            <label className="block text-[9px] text-gray-500 uppercase tracking-widest mb-2 font-bold">
                                The Big Idea *
                            </label>
                            <textarea
                                value={formData.idea}
                                onChange={(e) => handleChange("idea", e.target.value)}
                                placeholder="Describe your innovative solution..."
                                rows={4}
                                className="w-full py-3 px-4 bg-[#0A0A0A] border border-[#262626] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-primary transition-colors resize-none"
                            />
                            <p className={`mt-1 text-[9px] text-right uppercase tracking-widest ${wordCount > 150 ? "text-red-500" : "text-gray-600"}`}>
                                {wordCount}/150 words
                            </p>
                        </div>

                        {/* Pitch Deck Link */}
                        <div>
                            <label className="block text-[9px] text-gray-500 uppercase tracking-widest mb-2 font-bold">
                                Pitch Deck (Drive Link) *
                            </label>
                            <div className="relative">
                                <input
                                    type="url"
                                    value={formData.driveLink}
                                    onChange={(e) => handleChange("driveLink", e.target.value)}
                                    placeholder="https://drive.google.com/..."
                                    className="w-full py-3 px-4 pr-10 bg-[#0A0A0A] border border-[#262626] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-primary transition-colors"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {linkStatus === "idle" && <LinkIcon className="w-4 h-4 text-gray-500" />}
                                    {linkStatus === "checking" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                                    {linkStatus === "valid" && <Check className="w-4 h-4 text-green-500" />}
                                    {linkStatus === "invalid" && <AlertCircle className="w-4 h-4 text-red-500" />}
                                </div>
                            </div>
                            {linkError && <p className="text-xs text-red-400 mt-2">{linkError}</p>}
                            {linkStatus === "valid" && <p className="text-xs text-green-400 mt-2">✓ Valid public link</p>}
                        </div>

                        {/* Public Access */}
                        <div className="p-4 rounded-xl border border-[#262626] bg-[#0A0A0A] hover:border-primary/30 transition-all">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.publicAccess}
                                    onChange={(e) => handleChange("publicAccess", e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-transparent checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 accent-primary cursor-pointer"
                                />
                                <div>
                                    <span className="block text-sm font-semibold text-white">I confirm public access</span>
                                    <span className="text-xs text-gray-500 mt-1 block leading-relaxed">
                                        The Drive link is accessible to anyone with the link for judging purposes.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="group w-full mt-6 py-4 bg-primary hover:bg-primary-hover text-black font-bold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(255,215,0,0.15)] hover:shadow-[0_0_30px_rgba(255,215,0,0.25)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <span className="uppercase tracking-widest text-sm">Submit Application</span>
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>

                {/* Footer */}
                <footer className="mt-10 text-center">
                    <div className="flex items-center justify-center gap-3 text-[10px] text-gray-600 tracking-widest">
                        <span className="w-12 h-px bg-[#262626]" />
                        <span>© 2026 ONLYFOUNDERS</span>
                        <span className="w-12 h-px bg-[#262626]" />
                    </div>
                </footer>
            </div>

            <StudentBottomNav />
        </main>
    );
}
