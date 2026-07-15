import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';

export const kanbanRouter = Router();

// Get all kanban cards for the user across projects
kanbanRouter.get('/global', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    
    // Fetch user's cards and join with project name/color
    const { data, error } = await supabaseAdmin
      .from('kanban_cards')
      .select(`
        *,
        projects (
          name
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('Global Kanban fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new kanban card
kanbanRouter.post('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const newCard = { ...req.body, user_id: user.id };

    const { data, error } = await supabaseAdmin
      .from('kanban_cards')
      .insert(newCard)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Kanban card create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a kanban card
kanbanRouter.put('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('kanban_cards')
      .update(req.body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Kanban card update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a kanban card
kanbanRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('kanban_cards')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('Kanban card delete error:', err);
    res.status(500).json({ error: err.message });
  }
});
