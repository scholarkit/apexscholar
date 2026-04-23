import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';
import { checkProjectAccess } from './collaborators.ts';

export const resourcesRouter = Router();

resourcesRouter.get('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('resources')
      .select('*')
      .eq('user_id', user.id);
    if (error) {
      return res.status(500).json({ error: 'Failed to fetch resources' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

resourcesRouter.get('/count', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { count, error } = await supabaseAdmin
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (error) {
      return res.status(500).json({ error: 'Failed to fetch resource count' });
    }
    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error fetching resource count:', error);
    res.status(500).json({ error: 'Failed to fetch resource count' });
  }
});

resourcesRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const projectId = req.params.id;

    // Check project access (owner or collaborator)
    const { hasAccess } = await checkProjectAccess(projectId, user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    // Query by project_id only — collaborators see the owner's resources
    const { data, error } = await supabaseAdmin
      .from('resources')
      .select('*')
      .eq('project_id', projectId);
    if (error) {
      return res.status(500).json({ error: 'Failed to fetch resources' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

resourcesRouter.post('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    // Editors can add resources; viewers cannot
    if (req.body.project_id) {
      const { hasAccess, role } = await checkProjectAccess(req.body.project_id, user.id);
      if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
      if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot add resources' });
    }

    const { data, error } = await supabaseAdmin
      .from('resources')
      .insert({
        user_id: user.id,
        ...req.body,
      })
      .select('*')
      .single();
    if (error) {
      return res.status(500).json({ error, message: 'Failed to create resource' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error, message: 'Failed to create resource' });
  }
});

resourcesRouter.get('/url', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'url');
    if (error) {
      return res.status(500).json({ error: 'Failed to fetch resources' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

resourcesRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const { data: resource } = await supabaseAdmin
      .from('resources')
      .select('project_id')
      .eq('id', id)
      .single();

    if (resource?.project_id) {
      const { hasAccess, role } = await checkProjectAccess(resource.project_id, user.id);
      if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
      if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot delete resources' });
    }

    const { data, error } = await supabaseAdmin
      .from('resources')
      .delete()
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      return res.status(500).json({ error: 'Failed to delete resource' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});
