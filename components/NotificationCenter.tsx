"use client";

import { useEffect, useState } from 'react';
import { Bell, X, Trash2, CheckCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFeedback } from './hooks/use-feedback';

interface Notification {
    id: string;
    title: string;
    description: string | null;
    type: 'urgent' | 'warning' | 'info';
    read: boolean;
    created_at: string;
}

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const supabase = createClient();
    const { trigger } = useFeedback();

    // Fetch notifications
    const fetchNotifications = async () => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Realtime subscription
        const channel = supabase
            .channel('notifications-center')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications',
            }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const markAsRead = async (id: string) => {
        trigger('light');
        await supabase.from('notifications').update({ read: true }).eq('id', id);
        fetchNotifications();
    };

    const markAllAsRead = async () => {
        trigger('success');
        await supabase.from('notifications').update({ read: true }).eq('read', false);
        fetchNotifications();
    };

    const deleteNotification = async (id: string) => {
        trigger('click');
        await supabase.from('notifications').delete().eq('id', id);
        fetchNotifications();
    };

    const clearAll = async () => {
        trigger('process');
        await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
        fetchNotifications();
        setIsOpen(false);
    };

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'urgent': return 'border-l-red-500 bg-red-500/5';
            case 'warning': return 'border-l-yellow-500 bg-yellow-500/5';
            default: return 'border-l-blue-500 bg-blue-500/5';
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => { trigger('click'); setIsOpen(!isOpen); }}
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
                <Bell size={22} className="text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-[#121212] border border-[#262626] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-[#262626]">
                            <h3 className="text-white font-semibold">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-primary hover:text-primary-hover flex items-center gap-1"
                                    >
                                        <CheckCheck size={14} /> Read all
                                    </button>
                                )}
                                <button
                                    onClick={clearAll}
                                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                >
                                    <Trash2 size={14} /> Clear
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`p-4 border-b border-[#262626]/50 border-l-4 ${getTypeStyles(notif.type)} ${!notif.read ? 'bg-white/5' : ''} hover:bg-white/5 transition-colors cursor-pointer`}
                                        onClick={() => !notif.read && markAsRead(notif.id)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium ${!notif.read ? 'text-white' : 'text-gray-400'}`}>
                                                    {notif.title}
                                                </p>
                                                {notif.description && (
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                        {notif.description}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-600 mt-2">
                                                    {formatTime(notif.created_at)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                                className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
