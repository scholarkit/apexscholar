import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';

export const projectsRouter = Router();

// Get all projects for the authenticated user (owned + shared)
projectsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    // 1. Owned projects
    const { data: owned, error: ownedErr } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('owner_id', user.id);
    if (ownedErr) throw ownedErr;

    // 2. Shared projects (accepted collaborations)
    const { data: collabs, error: collabErr } = await supabaseAdmin
      .from('project_collaborators')
      .select('role, project_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted');
    if (collabErr) throw collabErr;

    // 3. Fetch full project data for shared projects
    const sharedProjectIds = (collabs || []).map((c) => c.project_id);
    let sharedProjects: any[] = [];
    if (sharedProjectIds.length > 0) {
      const { data: sharedData, error: sharedErr } = await supabaseAdmin
        .from('projects')
        .select('*')
        .in('id', sharedProjectIds);
      if (sharedErr) throw sharedErr;
      sharedProjects = sharedData || [];
    }

    // 4. Build role lookup
    const roleMap = new Map((collabs || []).map((c) => [c.project_id, c.role]));

    // 5. Merge with role annotation
    const ownedWithRole = (owned || []).map((p: any) => ({ ...p, _role: 'owner' }));
    const sharedWithRole = sharedProjects.map((p: any) => ({
      ...p,
      _role: roleMap.get(p.id) || 'viewer',
      _shared: true,
    }));

    res.json([...ownedWithRole, ...sharedWithRole]);
  } catch (err: any) {
    console.error('Projects fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get project count for the authenticated user
projectsRouter.get('/count', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { count, error } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id);
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err: any) {
    console.error('Projects count error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single project by id, ensuring ownership
projectsRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Project not found' });
    res.json(data);
  } catch (err: any) {
    console.error('Projects fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new project with authenticated user as owner
projectsRouter.post('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    // ignore any owner_id from body; enforce authenticated user
    const { owner_id, ...rest } = req.body;
    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert({ ...rest, owner_id: user.id })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Projects create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a project, only if owned by the user
projectsRouter.put('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    // ignore owner_id in update payload
    const { owner_id, ...patch } = req.body;
    const { data, error } = await supabaseAdmin
      .from('projects')
      .update(patch)
      .eq('id', req.params.id)
      .eq('owner_id', user.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Project not found or access denied' });
    res.json(data);
  } catch (err: any) {
    console.error('Projects update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a project, only if owned by the user
projectsRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', req.params.id)
      .eq('owner_id', user.id)
      .select();
    if (error) throw error;
    // data may be empty if no row matched
    res.json({ success: true, deleted: data && data.length > 0 });
  } catch (err: any) {
    console.error('Projects delete error:', err);
    res.status(500).json({ error: err.message });
  }
});
