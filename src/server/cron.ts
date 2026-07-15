import cron from 'node-cron';
import webpush from 'web-push';
import { supabaseAdmin } from './supabase.ts';

export function initCronJobs() {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily timetable push notification cron...');
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const today = todayStr as string;

      // 1. Find users with overdue or today's scheduled blocks that are 'planned'
      const { data: blocks, error } = await supabaseAdmin
        .from('scheduled_blocks')
        .select(`
          user_id,
          date,
          kanban_cards (content, projects (name))
        `)
        .eq('status', 'planned')
        .lte('date', today);

      if (error) throw error;
      if (!blocks || blocks.length === 0) return;

      // Group by user
      const userTasks: Record<string, any[]> = {};
      blocks.forEach(b => {
        if (!userTasks[b.user_id]) {
          userTasks[b.user_id] = [];
        }
        userTasks[b.user_id]!.push(b);
      });

      // 2. Fetch subscriptions for those users
      const userIds = Object.keys(userTasks);
      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .in('user_id', userIds);

      if (!subs) return;

      // 3. Send notifications
      for (const sub of subs) {
        const tasks = userTasks[sub.user_id] || [];
        if (tasks.length === 0) continue;

        const overdueCount = tasks.filter(t => t.date < today).length;
        const todayCount = tasks.filter(t => t.date === today).length;

        let body = '';
        if (overdueCount > 0) body += `${overdueCount} task(s) overdue. `;
        if (todayCount > 0) body += `${todayCount} task(s) scheduled for today.`;

        const payload = JSON.stringify({
          title: `You have ${tasks.length} pending tasks`,
          body,
          url: '/timetable'
        });

        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth
          }
        };

        try {
          await webpush.sendNotification(subscription, payload);
        } catch (pushErr: any) {
          console.error(`Failed to send push to user ${sub.user_id}:`, pushErr);
          // If subscription is invalid/expired, we might delete it here
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      }

    } catch (err) {
      console.error('Cron job error:', err);
    }
  });
}
