import { Router } from 'express';
import { requireAuth } from './middleware.ts';
import { supabaseAdmin } from './supabase.ts';

export const documentsRouter = Router();

documentsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ error: 'Missing project_id' });

    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

documentsRouter.post('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { project_id, title, type } = req.body;
    if (!project_id || !title)
      return res.status(400).json({ error: 'Missing project_id or title' });

    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({ project_id, user_id: user.id, title, type: type || 'thesis' })
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

documentsRouter.put('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { title, type } = req.body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (type !== undefined) updates.type = type;

    const { data, error } = await supabaseAdmin
      .from('documents')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

documentsRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Document deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
