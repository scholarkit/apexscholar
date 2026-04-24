import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';
import { checkProjectAccess } from './collaborators.ts';

export const journalRouter = Router();

/** Pick only the columns that exist in the journal_entries table. */
function sanitizeEntry(body: Record<string, unknown>) {
  const allowed = ['project_id', 'date', 'content', 'type'] as const;
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

    // Check project access (owner or collaborator)
    const { hasAccess } = await checkProjectAccess(projectId, user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    // Query by project_id only — collaborators see the owner's entries
    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .select('*')
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

    // Editors can create entries; viewers cannot
    if (req.body.project_id) {
      const { hasAccess, role } = await checkProjectAccess(req.body.project_id, user.id);
      if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
      if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot create entries' });
    }

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

    // Look up the entry to find its project and check access
    const { data: entry } = await supabaseAdmin
      .from('journal_entries')
      .select('project_id')
      .eq('id', req.params.id)
      .single();

    if (entry?.project_id) {
      const { hasAccess, role } = await checkProjectAccess(entry.project_id, user.id);
      if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
      if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot edit entries' });
    }

    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .update(sanitizeEntry(req.body))
      .eq('id', req.params.id)
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

    const { data: entry } = await supabaseAdmin
      .from('journal_entries')
      .select('project_id')
      .eq('id', req.params.id)
      .single();

    if (entry?.project_id) {
      const { hasAccess, role } = await checkProjectAccess(entry.project_id, user.id);
      if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
      if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot delete entries' });
    }

    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .delete()
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Journal delete error:', err);
    res.status(500).json({ error: err.message });
  }
});
