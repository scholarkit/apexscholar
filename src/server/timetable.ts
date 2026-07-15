import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';

export const timetableRouter = Router();

// Get availability profile
timetableRouter.get('/availability', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('availability_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    // Default if none exists
    res.json(data || { weekday_minutes: 90, weekend_minutes: 300, blocked_slots: [] });
  } catch (err: any) {
    console.error('Availability fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update availability profile
timetableRouter.post('/availability', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { weekday_minutes, weekend_minutes, blocked_slots } = req.body;

    const { data, error } = await supabaseAdmin
      .from('availability_profiles')
      .upsert({
        user_id: user.id,
        weekday_minutes,
        weekend_minutes,
        blocked_slots: blocked_slots || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Availability update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get scheduled blocks
timetableRouter.get('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('scheduled_blocks')
      .select(`
        *,
        kanban_cards (
          id, content, column_id, project_id, projects (name)
        )
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Scheduled blocks fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Regenerate schedule
timetableRouter.post('/regenerate', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    // 1. Fetch availability
    const { data: avail } = await supabaseAdmin
      .from('availability_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const weekdayCapacity = avail?.weekday_minutes ?? 90;
    const weekendCapacity = avail?.weekend_minutes ?? 300;

    // 2. Fetch pending/in_progress kanban cards with duration > 0
    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('kanban_cards')
      .select('*')
      .eq('user_id', user.id)
      .in('column_id', ['pending', 'in_progress'])
      .not('estimated_minutes', 'is', null)
      .gt('estimated_minutes', 0);

    if (cardsError) throw cardsError;

    // Filter out completed ones, just in case
    const tasksToSchedule = (cards || []).sort((a: any, b: any) => {
      // Sort by due date ascending
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return 0; // fallback to stable sort or created_at
    });

    // 3. Simple Greedy Packing Algorithm
    // Clear existing *planned* blocks from today onwards
    const today = new Date();
    today.setHours(0,0,0,0);

    await supabaseAdmin
      .from('scheduled_blocks')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'planned')
      .gte('date', today.toISOString().split('T')[0]);

    const newBlocks = [];
    let currentDate = new Date();
    currentDate.setHours(0,0,0,0);
    
    // We'll keep track of how much time we've used on `currentDate`
    let timeUsedToday = 0;

    for (const task of tasksToSchedule) {
      let remainingDuration = task.estimated_minutes;
      // Add ~20% buffer as requested
      remainingDuration = Math.ceil(remainingDuration * 1.2);

      while (remainingDuration > 0) {
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        const dailyCapacity = isWeekend ? weekendCapacity : weekdayCapacity;
        const availableToday = dailyCapacity - timeUsedToday;

        if (availableToday <= 0) {
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
          timeUsedToday = 0;
          continue;
        }

        const alloc = Math.min(availableToday, remainingDuration);
        newBlocks.push({
          user_id: user.id,
          kanban_card_id: task.id,
          date: currentDate.toISOString().split('T')[0],
          duration_minutes: alloc,
          status: 'planned'
        });

        timeUsedToday += alloc;
        remainingDuration -= alloc;
      }
    }

    if (newBlocks.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('scheduled_blocks')
        .insert(newBlocks);
      if (insertError) throw insertError;
    }

    res.json({ success: true, generatedBlocks: newBlocks.length });
  } catch (err: any) {
    console.error('Timetable regeneration error:', err);
    res.status(500).json({ error: err.message });
  }
});
