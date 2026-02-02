"use client";

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useFeedback } from './hooks/use-feedback';
import { createClient } from '@/lib/supabase/client';

export default function NotificationManager() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);
    const { trigger } = useFeedback();
    const supabase = createClient();

    // Show notification functionality
    const showNotification = (title: string, body: string, icon: string = '/icons/icon-192x192.png') => {
        trigger('success'); // Sound + Haptic

        if (permission === 'granted') {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, {
                        body: body,
                        icon: icon,
                        vibrate: [200, 100, 200],
                        tag: 'realtime-notification',
                        // @ts-ignore
                        timestamp: Date.now()
                    } as any);
                });
            } else {
                new Notification(title, {
                    body: body,
                    icon: icon
                });
            }
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setIsSupported(true);
            setPermission(Notification.permission);
        }
    }, []);

    // Realtime Subscription
    useEffect(() => {
        if (permission !== 'granted') return;

        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Listen for personal notifications
            const notificationChannel = supabase
                .channel('public:notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: user ? `user_id=eq.${user.id}` : undefined,
                    },
                    (payload: any) => {
                        const newNotif = payload.new;
                        showNotification(newNotif.title, newNotif.description || 'New notification', '/icons/icon-192x192.png');
                    }
                )
                .subscribe();

            // 2. Listen for "New Founders" (Global demo)
            const profilesChannel = supabase
                .channel('public:profiles')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'profiles',
                    },
                    (payload: any) => {
                        // Don't notify for own signup
                        if (user && payload.new.id === user.id) return;

                        const name = payload.new.full_name || 'Someone';
                        showNotification('New Founder Joined!', `${name} just joined OnlyFounders.`);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(notificationChannel);
                supabase.removeChannel(profilesChannel);
            };
        };

        setupRealtime();
    }, [permission]);

    // Helper to convert VAPID key
    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const subscribeToPush = async (registration: ServiceWorkerRegistration) => {
        try {
            const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!publicVapidKey) {
                console.error('VAPID public key not found');
                return;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            // Send to backend
            await fetch('/api/web-push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription)
            });

            console.log('Push subscription saved');
        } catch (error) {
            console.error('Failed to subscribe to push:', error);
        }
    };

    const requestPermission = async () => {
        if (!isSupported) return;

        trigger('click');
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === 'granted') {
                showNotification('OnlyFounders', 'Notifications enabled! You will receive live updates.');

                // Subscribe to Web Push
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(registration => {
                        subscribeToPush(registration);
                    });
                }
            } else {
                trigger('error');
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
            trigger('error');
        }
    };

    if (!isSupported) return null;

    if (permission === 'granted') {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-w-sm flex flex-col gap-3">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg text-primary border border-primary/30">
                        <Bell size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-white text-sm">Enable Live Notifications</h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Get instant updates about new founders and matches.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={() => setIsSupported(false)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-gray-500 hover:text-white transition-colors rounded-lg border border-[#262626] hover:border-gray-500"
                    >
                        Later
                    </button>
                    <button
                        onClick={requestPermission}
                        className="flex-1 px-3 py-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-black transition-colors rounded-lg shadow-[0_0_15px_rgba(255,215,0,0.2)] active:scale-95"
                    >
                        Enable
                    </button>
                </div>
            </div>
        </div>
    );
}
