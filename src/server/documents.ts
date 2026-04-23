import { Router } from 'express';
import { requireAuth } from './middleware.ts';
import { supabaseAdmin } from './supabase.ts';
import { checkProjectAccess } from './collaborators.ts';

export const documentsRouter = Router();

documentsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ error: 'Missing project_id' });

    // Check project access (owner or collaborator)
    const { hasAccess } = await checkProjectAccess(project_id as string, user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    // Query by project_id only — collaborators see project documents
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('project_id', project_id)
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

    // Editors can create documents; viewers cannot
    const { hasAccess, role } = await checkProjectAccess(project_id, user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
    if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot create documents' });

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

    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('project_id')
      .eq('id', id)
      .single();

    if (doc?.project_id) {
      const { hasAccess, role } = await checkProjectAccess(doc.project_id, user.id);
      if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
      if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot edit documents' });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (type !== undefined) updates.type = type;

    const { data, error } = await supabaseAdmin
      .from('documents')
      .update(updates)
      .eq('id', id)
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

    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('project_id')
      .eq('id', id)
      .single();

    if (doc?.project_id) {
      const { hasAccess, role } = await checkProjectAccess(doc.project_id, user.id);
      if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
      if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot delete documents' });
    }

    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Document deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
