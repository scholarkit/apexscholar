import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';
import webpush from 'web-push';

// Ensure VAPID keys exist
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || '';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    'mailto:support@apexscholar.com',
    publicVapidKey,
    privateVapidKey
  );
}

export const pushRouter = Router();

// Save Push Subscription
pushRouter.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const subscription = req.body;

    // Check if endpoint already exists
    const { data: existing } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .maybeSingle();

    if (existing) {
      res.status(200).json({ success: true, message: 'Already subscribed' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        keys_p256dh: subscription.keys.p256dh,
        keys_auth: subscription.keys.auth
      });

    if (error) throw error;
    res.status(201).json({ success: true });
  } catch (err: any) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ error: err.message });
  }
});
