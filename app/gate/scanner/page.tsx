"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, Zap, Check, X, Keyboard } from 'lucide-react';

interface ScanRecord {
  id: string;
  participant: any;
  timestamp: string;
  success: boolean;
  error?: string;
}

export default function GateScannerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(true);
  const [verified, setVerified] = useState(false);
  const [participant, setParticipant] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    checkAuth();
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateTime = () => {
    const now = new Date();
    setCurrentTime(now.toISOString().split('T')[1].split('.')[0] + ' UTC');
  };

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/auth/login');
        return;
      }

      const data = await response.json();
      if (data.user?.profile?.role !== 'gate_volunteer') {
        router.push('/dashboard');
        return;
      }

      setUser(data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (qrData: string) => {
    if (!qrData.trim()) return;

    setScanning(true);
    setVerified(false);
    setError(null);
    setParticipant(null);
    setShowManualEntry(false);

    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const response = await fetch('/api/gate/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: qrData.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        setParticipant(data.participant);
        setVerified(true);
        setScanning(false);
        
        // Add to recent scans
        addToRecentScans({
          id: Date.now().toString(),
          participant: data.participant,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          success: true,
        });
      } else {
        setError(data.error || 'Verification failed');
        setScanning(false);
        
        // Add failed scan to recent scans
        addToRecentScans({
          id: Date.now().toString(),
          participant: null,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          success: false,
          error: data.error || 'Invalid Signature',
        });
      }
    } catch (error) {
      console.error('QR scan error:', error);
      setError('Connection error');
      setScanning(false);
      
      addToRecentScans({
        id: Date.now().toString(),
        participant: null,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        success: false,
        error: 'Connection error',
      });
    }
  };

  const addToRecentScans = (scan: ScanRecord) => {
    setRecentScans(prev => [scan, ...prev].slice(0, 10)); // Keep last 10 scans
  };

  const resetScanner = () => {
    setScanning(true);
    setVerified(false);
    setParticipant(null);
    setError(null);
    setShowManualEntry(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary flex items-center justify-center">
              <div className="text-black text-xs font-bold">OF</div>
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">ONLYFOUNDERS</h1>
              <p className="tech-text text-gray-500 text-sm">GATE ACCESS CONTROL</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="tech-text text-white text-lg">| GATE1</span>
            <Zap className="text-primary" size={24} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Scanning State */}
        {scanning && !verified && !error && (
          <div className="max-w-2xl mx-auto">
            {/* Scanner Frame */}
            <div className="relative aspect-4/3 mb-6">
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-32 h-32 border-t-4 border-l-4 border-primary"></div>
              <div className="absolute top-0 right-0 w-32 h-32 border-t-4 border-r-4 border-primary"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 border-b-4 border-l-4 border-primary"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 border-b-4 border-r-4 border-primary"></div>
              
              {/* Scanning Line Animation */}
              <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse"></div>
              
              {/* Center Crosshair */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-12 h-12">
                  <div className="absolute w-12 h-0.5 bg-primary/50 top-1/2 left-0"></div>
                  <div className="absolute w-0.5 h-12 bg-primary/50 left-1/2 top-0"></div>
                </div>
              </div>

              {/* Instruction Text */}
              <div className="absolute bottom-8 left-0 right-0 text-center">
                <p className="text-gray-400 text-sm">Align QR code within frame</p>
              </div>
            </div>

            {/* Manual Entry Button */}
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="w-full bg-gray-800/50 hover:bg-gray-700/50 text-white py-4 rounded-lg flex items-center justify-center gap-2 mb-6 transition-colors"
            >
              <Keyboard size={20} />
              <span>Enter Code Manually</span>
            </button>

            {/* Manual Input Modal */}
            {showManualEntry && (
              <div className="bg-[#1A1A1A] border border-gray-800 p-6 mb-6">
                <p className="tech-text text-gray-500 text-xs mb-3">MANUAL QR CODE ENTRY</p>
                <input
                  type="text"
                  placeholder="Paste or type QR token here..."
                  className="w-full bg-black border border-gray-700 text-white p-4 tech-text text-sm focus:outline-none focus:border-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleScan(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <p className="text-xs text-gray-600 mt-2">Press Enter to verify</p>
              </div>
            )}

            {/* Recent Scans */}
            {recentScans.length > 0 && (
              <div className="border-t border-gray-800 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-white text-lg font-semibold">Recent Scans</h3>
                </div>
                
                <div className="space-y-3">
                  {recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      className={`flex items-center gap-4 p-4 rounded-lg ${
                        scan.success ? 'bg-green-500/5 border border-green-500/20' : 'bg-red-500/5 border border-red-500/20'
                      }`}
                    >
                      {/* Photo/Icon */}
                      <div className="relative shrink-0">
                        {scan.success && scan.participant?.photo_url ? (
                          <img
                            src={scan.participant.photo_url}
                            alt={scan.participant.full_name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            scan.success ? 'bg-gray-700' : 'bg-red-900/30'
                          }`}>
                            {scan.success ? (
                              <span className="text-xl text-gray-400">
                                {scan.participant?.full_name?.[0]?.toUpperCase() || '?'}
                              </span>
                            ) : (
                              <X className="text-red-500" size={24} />
                            )}
                          </div>
                        )}
                        {/* Success/Error Badge */}
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                          scan.success ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {scan.success ? (
                            <Check className="text-black" size={12} />
                          ) : (
                            <X className="text-white" size={12} />
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {scan.success ? (
                          <>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-white">{scan.participant.full_name}</p>
                              <span className="tech-text text-primary text-xs">ACCESS GRANTED</span>
                            </div>
                            <p className="text-sm text-gray-400">
                              {scan.participant.role || 'Participant'} • {scan.participant.cluster ? `Tier ${scan.participant.cluster_tier}` : 'No Tier'}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-white">Unknown Ticket</p>
                            <p className="text-sm text-red-400">{scan.error}</p>
                          </>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-gray-500 text-sm">
                        {scan.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verified State */}
        {verified && participant && (
          <div className="max-w-2xl mx-auto">
            {/* Verified Header */}
            <div className="mb-8">
              <div className="flex items-end justify-between mb-4">
                <h2 className="text-7xl font-bold italic text-primary">VERIFIED</h2>
                <div className="text-right">
                  <p className="tech-text text-gray-500 text-xs mb-1">TIMESTAMP</p>
                  <p className="tech-text text-white text-sm">{currentTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="tech-text text-green-500 text-sm">ACCESS GRANTED</p>
              </div>
            </div>

            {/* Participant Info */}
            <div className="bg-[#0A0A0A] border border-gray-900 p-8 mb-6">
              <div className="flex gap-6 mb-8">
                {/* Photo */}
                <div className="shrink-0">
                  {participant.photo_url ? (
                    <img
                      src={participant.photo_url}
                      alt={participant.full_name}
                      className="w-40 h-40 object-cover border-2 border-gray-700"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
                      <span className="text-5xl text-gray-600">
                        {participant.full_name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1">
                  <p className="tech-text text-gray-500 text-xs mb-2">FULL LEGAL NAME</p>
                  <h3 className="text-4xl font-bold text-white mb-2">
                    {participant.full_name?.toUpperCase() || 'UNKNOWN'}
                  </h3>
                </div>
              </div>

              {/* Team and Cluster */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="tech-text text-gray-500 text-xs mb-2">TEAM NAME</p>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-primary"></div>
                    <p className="text-white text-lg">{participant.team || 'No Team'}</p>
                  </div>
                </div>
                <div>
                  <p className="tech-text text-gray-500 text-xs mb-2">CLUSTER</p>
                  <p className="text-gray-400 text-lg">
                    {participant.cluster_tier && participant.cluster 
                      ? `Tier ${participant.cluster_tier} • ${participant.cluster}`
                      : 'Not Assigned'}
                  </p>
                </div>
              </div>

              {/* Entity ID */}
              <div className="border-t border-gray-800 pt-6">
                <p className="tech-text text-gray-500 text-xs mb-2">ENTITY ID</p>
                <div className="flex items-center justify-between">
                  <p className="tech-text text-white text-2xl tracking-wider">
                    {participant.entity_id || 'N/A'}
                  </p>
                  <Fingerprint className="text-gray-600" size={32} />
                </div>
              </div>
            </div>

            {/* Scan Next Button */}
            <button
              onClick={resetScanner}
              className="w-full bg-black border-2 border-primary text-primary py-4 tech-text text-sm hover:bg-primary hover:text-black transition-colors"
            >
              [ SCAN NEXT ]
            </button>
          </div>
        )}

        {/* Error State */}
        {error && !scanning && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-500/10 border-2 border-red-500 p-8 mb-6">
              <div className="text-center mb-6">
                <h2 className="text-6xl font-bold italic text-red-500 mb-4">DENIED</h2>
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <p className="tech-text text-red-500">ACCESS DENIED</p>
                </div>
              </div>
              <div className="text-center">
                <p className="tech-text text-red-400 text-sm mb-2">ERROR</p>
                <p className="text-white">{error}</p>
              </div>
            </div>

            <button
              onClick={resetScanner}
              className="w-full bg-black border-2 border-primary text-primary py-4 tech-text text-sm hover:bg-primary hover:text-black transition-colors"
            >
              [ SCAN AGAIN ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
