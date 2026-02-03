"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import StudentBottomNav from "../components/StudentBottomNav";

type TeamMember = {
    id: string;
    full_name: string;
    email: string;
    role: string;
    entity_id?: string;
};

type Team = {
    id: string;
    name: string;
    code: string;
    members?: TeamMember[];
    cluster?: {
        id: string;
        name: string;
        pitch_order: number;
    };
    college?: {
        id: string;
        name: string;
    };
};

export default function TeamPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [team, setTeam] = useState<Team | null>(null);
    const [isLeader, setIsLeader] = useState(false);

    const fetchTeamData = useCallback(async () => {
        try {
            const response = await fetch('/api/teams');
            if (!response.ok) {
                if (response.status === 401) {
                    router.push('/auth/login');
                    return;
                }
                throw new Error('Failed to fetch team');
            }
            const data = await response.json();
            setTeam(data.team);
            setIsLeader(data.isLeader);
        } catch (err) {
            console.error('Failed to fetch team:', err);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchTeamData();
    }, [fetchTeamData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#3a3a2e] text-white pb-24">
                {/* Header */}
                <div className="bg-[#2a2a20] border-b border-primary/20 px-4 py-4 sticky top-0 z-40">
                    <div className="max-w-lg mx-auto flex items-center justify-center">
                        <h1 className="tech-text text-white tracking-widest text-sm">ONLYFOUNDERS</h1>
                    </div>
                </div>

                <div className="max-w-lg mx-auto px-6 py-8">
                    {/* Loading Card */}
                    <div className="border-4 border-primary p-6 bg-black animate-pulse">
                        <div className="h-4 bg-gray-800 rounded mb-4 w-1/3 mx-auto"></div>
                        <div className="h-8 bg-gray-800 rounded mb-2 w-2/3 mx-auto"></div>
                        <div className="h-3 bg-gray-800 rounded w-1/4 mx-auto mb-8"></div>
                        
                        <div className="space-y-3">
                            <div className="h-20 bg-gray-800 rounded"></div>
                            <div className="h-32 bg-gray-800 rounded"></div>
                        </div>
                    </div>
                </div>
                <StudentBottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#3a3a2e] text-white pb-24">
            {/* Header */}
            <div className="bg-[#2a2a20] border-b border-primary/20 px-4 py-4 sticky top-0 z-40">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-300">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="tech-text text-white tracking-widest text-sm">ONLYFOUNDERS</h1>
                    <div className="w-6"></div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-6 py-8">
                {/* Main Card with Golden Border */}
                <div className="border-4 border-primary p-0 bg-black">
                    {/* Online Status Indicator */}
                    <div className="flex justify-end px-6 pt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="tech-text text-green-500 text-xs">ONLINE</span>
                        </div>
                    </div>

                    {/* Team Name Section */}
                    <div className="text-center px-6 pt-2 pb-6">
                        <p className="tech-text text-primary text-xs tracking-widest mb-4">SYNDICATE UNIT</p>
                        <h2 className="text-4xl font-serif mb-4 text-white">{team?.name || 'The Gilded Vanguard'}</h2>
                        <div className="inline-block border border-primary px-4 py-1">
                            <span className="tech-text text-primary text-xs tracking-wider">RANK: TIER 1</span>
                        </div>
                    </div>

                    {/* Current Status Section */}
                    <div className="px-6 pb-8">
                        <div className="border-2 border-primary/30">
                            <div className="flex justify-between items-center px-4 py-2 border-b border-primary/30">
                                <span className="tech-text text-gray-500 text-xs tracking-wider">CURRENT STATUS</span>
                                <span className="tech-text text-primary text-xs tracking-wider">LIVE_FEED</span>
                            </div>
                            
                            <div className="px-4 py-4">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <span className="tech-text text-gray-500 text-xs block">PITCH_SLOT_ID</span>
                                        <span className="tech-text text-white text-lg tracking-wider">A-204</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="tech-text text-gray-500 text-xs block">TIME_REMAINING</span>
                                        <span className="tech-text text-primary text-lg">12:45</span>
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="relative">
                                    <div className="h-2 bg-gray-800">
                                        <div className="h-full bg-primary" style={{ width: '75%' }}></div>
                                    </div>
                                    <span className="tech-text text-primary text-xs mt-2 block text-right">75% COMPLETE</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Roster Section */}
                    <div className="px-6 pb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="tech-text text-gray-500 text-sm tracking-wider">ROSTER</h3>
                            <div className="flex gap-1">
                                <div className="w-6 h-0.5 bg-primary"></div>
                                <div className="w-6 h-0.5 bg-primary"></div>
                                <div className="w-6 h-0.5 bg-primary"></div>
                            </div>
                        </div>

                        {/* Team Members */}
                        <div className="space-y-4">
                            {team?.members && team.members.length > 0 ? (
                                team.members.map((member, index) => (
                                    <div key={member.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {/* Avatar Placeholder */}
                                            <div className="w-12 h-12 bg-gray-700 flex items-center justify-center">
                                                <span className="text-gray-400 text-lg font-serif">
                                                    {member.full_name?.charAt(0) || '?'}
                                                </span>
                                            </div>
                                            
                                            <div>
                                                <p className="text-white font-serif text-lg">
                                                    {member.full_name || 'Unknown'}
                                                </p>
                                                <p className="tech-text text-gray-500 text-xs tracking-wider">
                                                    ID: {member.entity_id || `${index + 1}X-${Math.floor(Math.random() * 1000)}`}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Role Badge */}
                                        <div className="border border-primary px-3 py-1">
                                            <span className="tech-text text-primary text-xs tracking-wider">
                                                {member.role === 'team_lead' ? 'LEAD' : index === 1 ? 'ANALYST' : 'STRATEGY'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    <p className="tech-text text-xs">NO TEAM MEMBERS</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Info */}
                    <div className="px-6 pb-6 flex items-center justify-between border-t border-gray-800 pt-4">
                        <span className="tech-text text-gray-600 text-xs tracking-wider">
                            SYNC_ID: {team?.code?.replace('-', '') || '99421A'}
                        </span>
                        <span className="tech-text text-green-500 text-xs tracking-wider">CONNECTED</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="tech-text text-gray-600 text-xs tracking-wider">
                        AUTHORIZED PERSONNEL ONLY
                    </p>
                </div>
            </div>

            <StudentBottomNav />
        </div>
    );
}
