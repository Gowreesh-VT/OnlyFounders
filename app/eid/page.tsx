"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import StudentBottomNav from '../components/StudentBottomNav';
import QRCode from 'qrcode';

export default function EIDPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (user?.profile?.qr_token) {
      generateQRCode(user.profile.qr_token);
    }
  }, [user]);

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

  const generateQRCode = async (token: string) => {
    try {
      const url = await QRCode.toDataURL(token, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(url);
    } catch (error) {
      console.error('QR generation error:', error);
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
  const currentDate = new Date();
  const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')} ${currentDate.toLocaleString('en', { month: 'short' }).toUpperCase()} ${currentDate.getFullYear()} // ${currentDate.toISOString().split('T')[1].split('.')[0]} UTC`;

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

      {/* E-ID Content */}
      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Main Card */}
        <div className="border-2 border-primary p-6 bg-black">
          {/* Photo Section */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-40 h-40 bg-[#1A1A1A]">
                {profile?.photo_url ? (
                  <img 
                    src={profile.photo_url} 
                    alt={profile.full_name}
                    className="w-full h-full object-cover grayscale"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
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

          {/* Name and Title */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif mb-2">{profile?.full_name || 'Unknown'}</h2>
            <p className="text-primary text-sm italic font-serif">
              Venture Capital / Tier 1
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 border-8 border-white shadow-lg">
              <div className="bg-teal-700 p-8">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 bg-gray-800 flex items-center justify-center">
                    <span className="tech-text text-gray-600 text-xs">GENERATING...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="space-y-4 border-t border-primary/30 pt-4">
            <div className="flex justify-between items-center">
              <span className="tech-text text-gray-500 text-xs">ENTITY_ID</span>
              <span className="tech-text text-white text-sm">{profile?.entity_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="tech-text text-gray-500 text-xs">ACCESS_LEVEL</span>
              <span className="tech-text text-green-500 text-sm">GRANTED</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="tech-text text-gray-500 text-xs">TIMESTAMP</span>
              <span className="tech-text text-primary text-xs">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="tech-text text-gray-700 text-xs tracking-wider">
            BRIGHTNESS INCREASED FOR SCANNING
          </p>
        </div>
      </div>

      <StudentBottomNav />
    </div>
  );
}
