import type express from 'express';
import { supabaseAdmin } from './supabase.ts';

export const requireAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return res.status(401).json({ error: 'Unauthorized access' });
  (req as any).user = userData.user;
  next();
};

export function errorHandler(
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
}

/**
 * Middleware that validates the current user has access to the project
 * identified by `project_id` in the request body, query, or route params.
 *
 * Usage:
 *   router.post('/', requireAuth, requireProjectAccess(), handler);          // any role
 *   router.put('/:id', requireAuth, requireProjectAccess('editor'), handler); // editor+ only
 *
 * Sets `(req as any).projectRole` to 'owner' | 'editor' | 'viewer'.
 */
export const requireProjectAccess = (requiredRole?: 'editor') => {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const projectId =
      req.body?.project_id ||
      req.query?.project_id ||
      req.params?.projectId;

    // If no project context, skip the check (some endpoints are global)
    if (!projectId) return next();

    // Check ownership
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (project?.owner_id === user.id) {
      (req as any).projectRole = 'owner';
      return next();
    }

    // Check collaboration
    const { data: collab } = await supabaseAdmin
      .from('project_collaborators')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!collab) {
      return res.status(403).json({ error: 'You do not have access to this project' });
    }

    if (requiredRole === 'editor' && collab.role === 'viewer') {
      return res
        .status(403)
        .json({ error: 'Viewer access does not allow this action' });
    }

    (req as any).projectRole = collab.role;
    next();
  };
};

