import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';

export const journalRouter = Router();

/** Pick only the columns that exist in the journal_entries table. */
function sanitizeEntry(body: Record<string, unknown>) {
  const allowed = ['project_id', 'date', 'content', 'type', 'start_date', 'end_date'] as const;
  const clean: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) clean[key] = body[key];
  }
  return clean;
}

journalRouter.get('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .select('*')
      .eq('author_id', user.id);
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Journal get error:', err);
    res.status(500).json({ error: err.message });
  }
});

journalRouter.get('/count', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { count, error } = await supabaseAdmin
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id);
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err: any) {
    console.error('Journal count error:', err);
    res.status(500).json({ error: err.message });
  }
});

journalRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const projectId = req.params.id;
    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .select('*')
      .eq('author_id', user.id)
      .eq('project_id', projectId);

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Journal get error:', err);
    res.status(500).json({ error: err.message });
  }
});

journalRouter.post('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .insert({
        author_id: user.id,
        ...sanitizeEntry(req.body),
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Journal post error:', err);
    res.status(500).json({ error: err.message });
  }
});

journalRouter.put('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .update(sanitizeEntry(req.body))
      .eq('id', req.params.id)
      .eq('author_id', user.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Journal put error:', err);
    res.status(500).json({ error: err.message });
  }
});

journalRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .delete()
      .eq('id', req.params.id)
      .eq('author_id', user.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Journal delete error:', err);
    res.status(500).json({ error: err.message });
  }
});
