"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronLeft } from 'lucide-react';
import StudentBottomNav from '../components/StudentBottomNav';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/auth/login');
        return;
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-primary tech-text">LOADING...</div>
      </div>
    );
  }

  const profile = user?.profile;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24">
      {/* Header */}
      <div className="bg-black border-b border-primary/20 px-4 py-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-300">
            <ChevronLeft size={24} />
          </button>
          <h1 className="tech-text text-white tracking-widest text-sm">ONLYFOUNDERS</h1>
          <div className="w-6"></div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Photo Section */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-48 h-48 border-2 border-primary/30 border-dashed p-2">
              {profile?.photo_url ? (
                <img 
                  src={profile.photo_url} 
                  alt={profile.full_name}
                  className="w-full h-full object-cover grayscale"
                />
              ) : (
                <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center">
                  <span className="text-gray-700 text-4xl">{profile?.full_name?.[0] || '?'}</span>
                </div>
              )}
            </div>
            {profile?.photo_url && (
              <div className="absolute -bottom-2 -right-2 bg-primary text-black px-3 py-1 text-xs tech-text">
                ● ACTIVE
              </div>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="border-2 border-primary/30 p-6 mb-6 bg-black/40">
          {/* Full Name */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="tech-text text-primary text-xs">FULL NAME</span>
            </div>
            <p className="text-white text-2xl font-serif ml-4">{profile?.full_name || 'Unknown'}</p>
          </div>

          {/* Email */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="tech-text text-primary text-xs">EMAIL ADDRESS</span>
            </div>
            <p className="text-gray-400 text-sm ml-4">{user?.email || 'N/A'}</p>
          </div>

          {/* Entity ID and Access Level */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="tech-text text-primary text-xs">ENTITY ID</span>
              </div>
              <p className="text-white tech-text text-sm ml-4">{profile?.entity_id || '8X-992-ALPHA'}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="tech-text text-primary text-xs">ACCESS LEVEL</span>
              </div>
              <div className="ml-4">
                <span className="border border-primary/50 text-primary px-3 py-1 text-xs tech-text">
                  {profile?.role?.toUpperCase() || 'PARTICIPANT'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Disconnect Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full border-2 border-primary/30 bg-black hover:bg-primary/10 text-primary py-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center gap-3">
            {loggingOut ? (
              <span className="tech-text text-sm">DISCONNECTING...</span>
            ) : (
              <>
                <LogOut size={18} strokeWidth={1.5} />
                <span className="tech-text text-sm">DISCONNECT SESSION</span>
              </>
            )}
          </div>
        </button>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="tech-text text-gray-700 text-[10px] tracking-wider">
            SYS_VER 4.2 // NODE_ID 09A // ENCRYPTED
          </p>
        </div>
      </div>

      <StudentBottomNav />
    </div>
  );
}
