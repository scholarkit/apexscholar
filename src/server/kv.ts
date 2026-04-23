import { Router } from 'express';
import { requireAuth } from './middleware.ts';
import { supabaseAdmin } from './supabase.ts';
import { checkProjectAccess } from './collaborators.ts';

export const kvRouter = Router();

kvRouter.get('/:key', requireAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const user = (req as any).user;

    // First try the user's own KV entry
    const { data, error } = await supabaseAdmin
      .from('kv_store')
      .select('*')
      .eq('key', key)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (data) return res.json({ value: data.value });

    // If no data found and the key looks project-scoped (contains a UUID),
    // check if the user is a collaborator and try the project owner's data
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = key.match(uuidPattern);
    if (match) {
      const projectId = match[0];
      const { hasAccess } = await checkProjectAccess(projectId, user.id);
      if (hasAccess) {
        // Find the project owner's KV for this key
        const { data: project } = await supabaseAdmin
          .from('projects')
          .select('owner_id')
          .eq('id', projectId)
          .single();

        if (project) {
          const { data: ownerData } = await supabaseAdmin
            .from('kv_store')
            .select('*')
            .eq('key', key)
            .eq('user_id', project.owner_id)
            .maybeSingle();

          if (ownerData) return res.json({ value: ownerData.value });
        }
      }
    }

    res.status(200).json({ value: null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

kvRouter.post('/', requireAuth, async (req, res) => {
  try {
    const { key, value } = req.body;
    const user = (req as any).user;
    if (!key) return res.status(400).json({ error: 'Missing key' });

    let targetUserId = user.id;

    // Check if key is scoped to a project (contains UUID)
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = key.match(uuidPattern);
    if (match) {
      const projectId = match[0];
      const { hasAccess, role } = await checkProjectAccess(projectId, user.id);
      
      if (hasAccess) {
        if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot modify project data' });
        
        // Write to the project owner's KV so it's shared across collaborators
        const { data: project } = await supabaseAdmin
          .from('projects')
          .select('owner_id')
          .eq('id', projectId)
          .single();
        if (project) {
          targetUserId = project.owner_id;
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('kv_store')
      .upsert(
        { key, value, user_id: targetUserId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key' }
      )
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

kvRouter.delete('/:key', requireAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const user = (req as any).user;

    let targetUserId = user.id;

    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = key.match(uuidPattern);
    if (match) {
      const projectId = match[0];
      const { hasAccess, role } = await checkProjectAccess(projectId, user.id);
      
      if (hasAccess) {
        if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot delete project data' });
        
        const { data: project } = await supabaseAdmin
          .from('projects')
          .select('owner_id')
          .eq('id', projectId)
          .single();
        if (project) {
          targetUserId = project.owner_id;
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const { error } = await supabaseAdmin
      .from('kv_store')
      .delete()
      .eq('key', key)
      .eq('user_id', targetUserId);

    if (error) throw error;
    res.json({ success: true, message: 'Key deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
