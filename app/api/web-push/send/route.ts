import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

// Admin only route to send notifications
export async function POST(request: Request) {
    try {
        const { userId, title, message } = await request.json();

        if (!userId || !title || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = await createClient();

        // Check if requester is admin/super_admin (optional, but good practice)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Fetch user's subscriptions
        const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId);

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ message: 'No subscriptions found for user' });
        }

        // Configure Web Push
        webpush.setVapidDetails(
            'mailto:admin@onlyfounders.example.com',
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
            process.env.VAPID_PRIVATE_KEY!
        );

        // Send to all subscriptions for this user
        const notifications = subscriptions.map(sub => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            const payload = JSON.stringify({
                title,
                body: message,
                icon: '/icons/icon-192x192.png',
                url: '/dashboard'
            });

            return webpush.sendNotification(pushSubscription, payload)
                .catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Subscription has expired or is no longer valid
                        console.log('Subscription expired, deleting from DB:', sub.id);
                        return supabase.from('push_subscriptions').delete().eq('id', sub.id);
                    }
                    console.error('Error sending push:', err);
                    return null;
                });
        });

        await Promise.all(notifications);

        return NextResponse.json({ success: true, count: subscriptions.length });
    } catch (err) {
        console.error('Send error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
