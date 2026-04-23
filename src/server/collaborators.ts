import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';
import { createNotification } from './notifications.ts';

export const collaboratorsRouter = Router();

// ─── Invite a collaborator (owner only) ──────────────────
collaboratorsRouter.post(
  '/projects/:projectId/collaborators',
  requireAuth,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { projectId } = req.params;
      const { email, role = 'viewer' } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
      }

      if (!['editor', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Role must be "editor" or "viewer"' });
      }

      // 1. Verify caller owns the project
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('id, owner_id, name')
        .eq('id', projectId)
        .single();

      if (!project || project.owner_id !== user.id) {
        return res.status(403).json({ error: 'Only the project owner can invite collaborators' });
      }

      // 2. Resolve email → user_id
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const target = usersData?.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (!target) {
        return res.status(404).json({ error: 'No registered user found with that email' });
      }

      if (target.id === user.id) {
        return res.status(400).json({ error: 'You cannot invite yourself' });
      }

      // 3. Insert collaborator record
      const { data, error } = await supabaseAdmin
        .from('project_collaborators')
        .insert({
          project_id: projectId,
          user_id: target.id,
          role,
          invited_by: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error?.code === '23505') {
        return res
          .status(409)
          .json({ error: 'User is already a collaborator on this project' });
      }
      if (error) throw error;

      // 4. Create notification for the invited user
      const inviterName =
        user.user_metadata?.display_name || user.email?.split('@')[0] || 'Someone';
      await createNotification({
        userId: target.id,
        category: 'collaboration',
        type: 'invite_received',
        title: 'Project Invitation',
        body: `${inviterName} invited you to collaborate on "${project.name}" as ${role}.`,
        data: {
          project_id: projectId,
          project_name: project.name,
          collab_id: data.id,
          role,
          invited_by: user.id,
          inviter_name: inviterName,
        },
      });

      res.json(data);
    } catch (err: any) {
      console.error('Collaborator invite error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── List collaborators for a project ────────────────────
collaboratorsRouter.get(
  '/projects/:projectId/collaborators',
  requireAuth,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { projectId } = req.params;

      // Verify access (owner or accepted collaborator)
      const { hasAccess } = await checkProjectAccess(projectId, user.id);
      if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

      // Fetch collaborators — join with auth.users is not directly possible via
      // supabase-js, so we fetch collaborator records and resolve user info separately
      const { data: collabs, error } = await supabaseAdmin
        .from('project_collaborators')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      // Resolve user display info for each collaborator
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const userMap = new Map(
        usersData?.users.map((u) => [u.id, u]) || []
      );

      const enriched = (collabs || []).map((c) => {
        const u = userMap.get(c.user_id);
        return {
          ...c,
          user_email: u?.email || 'unknown',
          user_name:
            u?.user_metadata?.display_name || u?.email?.split('@')[0] || 'Unknown',
        };
      });

      res.json(enriched);
    } catch (err: any) {
      console.error('Collaborators list error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Accept invite ───────────────────────────────────────
collaboratorsRouter.patch(
  '/collaborators/:id/accept',
  requireAuth,
  async (req, res) => {
    try {
      const user = (req as any).user;

      const { data, error } = await supabaseAdmin
        .from('project_collaborators')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .select()
        .single();

      if (error || !data) {
        return res.status(403).json({ error: 'Invite not found or already processed' });
      }

      // Notify the project owner that the invite was accepted
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id, name')
        .eq('id', data.project_id)
        .single();

      if (project) {
        const acceptorName =
          user.user_metadata?.display_name || user.email?.split('@')[0] || 'Someone';
        await createNotification({
          userId: project.owner_id,
          category: 'collaboration',
          type: 'invite_accepted',
          title: 'Invite Accepted',
          body: `${acceptorName} accepted your invitation to "${project.name}".`,
          data: {
            project_id: data.project_id,
            project_name: project.name,
            collab_id: data.id,
            user_id: user.id,
            user_name: acceptorName,
          },
        });
      }

      res.json(data);
    } catch (err: any) {
      console.error('Accept invite error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Decline invite ──────────────────────────────────────
collaboratorsRouter.patch(
  '/collaborators/:id/decline',
  requireAuth,
  async (req, res) => {
    try {
      const user = (req as any).user;

      const { data, error } = await supabaseAdmin
        .from('project_collaborators')
        .update({ status: 'declined' })
        .eq('id', req.params.id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .select()
        .single();

      if (error || !data) {
        return res.status(403).json({ error: 'Invite not found or already processed' });
      }

      res.json(data);
    } catch (err: any) {
      console.error('Decline invite error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Change role (owner only) ────────────────────────────
collaboratorsRouter.patch(
  '/collaborators/:id/role',
  requireAuth,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { role } = req.body;

      if (!['editor', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Role must be "editor" or "viewer"' });
      }

      // Get the collab record to find the project
      const { data: collab } = await supabaseAdmin
        .from('project_collaborators')
        .select('project_id, user_id')
        .eq('id', req.params.id)
        .single();

      if (!collab) return res.status(404).json({ error: 'Collaborator not found' });

      // Verify caller is the project owner
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', collab.project_id)
        .single();

      if (project?.owner_id !== user.id) {
        return res.status(403).json({ error: 'Only the project owner can change roles' });
      }

      const { data, error } = await supabaseAdmin
        .from('project_collaborators')
        .update({ role })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      console.error('Change role error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Remove collaborator (owner or self) ─────────────────
collaboratorsRouter.delete(
  '/collaborators/:id',
  requireAuth,
  async (req, res) => {
    try {
      const user = (req as any).user;

      const { data: collab } = await supabaseAdmin
        .from('project_collaborators')
        .select('project_id, user_id')
        .eq('id', req.params.id)
        .single();

      if (!collab) return res.status(404).json({ error: 'Collaborator not found' });

      // Allow if: user is the collaborator themselves OR the project owner
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', collab.project_id)
        .single();

      const isOwner = project?.owner_id === user.id;
      const isSelf = collab.user_id === user.id;

      if (!isOwner && !isSelf) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { error } = await supabaseAdmin
        .from('project_collaborators')
        .delete()
        .eq('id', req.params.id);

      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      console.error('Remove collaborator error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── My pending invites ──────────────────────────────────
collaboratorsRouter.get(
  '/collaborators/invites',
  requireAuth,
  async (req, res) => {
    try {
      const user = (req as any).user;

      const { data: invites, error } = await supabaseAdmin
        .from('project_collaborators')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      // Enrich with project info and inviter info
      const projectIds = [...new Set((invites || []).map((i) => i.project_id))];
      const inviterIds = [...new Set((invites || []).map((i) => i.invited_by))];

      const { data: projects } = await supabaseAdmin
        .from('projects')
        .select('id, name, description')
        .in('id', projectIds.length ? projectIds : ['__none__']);

      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const userMap = new Map(
        usersData?.users.map((u) => [u.id, u]) || []
      );

      const projectMap = new Map((projects || []).map((p) => [p.id, p]));

      const enriched = (invites || []).map((inv) => {
        const proj = projectMap.get(inv.project_id);
        const inviter = userMap.get(inv.invited_by);
        return {
          ...inv,
          project_name: proj?.name || 'Unknown Project',
          project_description: proj?.description || '',
          inviter_name:
            inviter?.user_metadata?.display_name ||
            inviter?.email?.split('@')[0] ||
            'Unknown',
          inviter_email: inviter?.email || '',
        };
      });

      res.json(enriched);
    } catch (err: any) {
      console.error('My invites error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Helper: Check project access ────────────────────────
export async function checkProjectAccess(
  projectId: string,
  userId: string
): Promise<{ hasAccess: boolean; role: 'owner' | 'editor' | 'viewer' | null }> {
  // Owner check
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();

  if (project?.owner_id === userId) {
    return { hasAccess: true, role: 'owner' };
  }

  // Collaboration check
  const { data: collab } = await supabaseAdmin
    .from('project_collaborators')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (collab) {
    return { hasAccess: true, role: collab.role as 'editor' | 'viewer' };
  }

  return { hasAccess: false, role: null };
}
