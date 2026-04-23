import { apiFetch } from './apiFetch';

// ─── Types ───────────────────────────────────────────────

export interface Collaborator {
  id: string;
  project_id: string;
  user_id: string;
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  invited_by: string;
  invited_at: string;
  accepted_at: string | null;
  // Enriched by backend
  user_email?: string;
  user_name?: string;
}

export interface PendingInvite {
  id: string;
  project_id: string;
  user_id: string;
  role: 'editor' | 'viewer';
  status: 'pending';
  invited_by: string;
  invited_at: string;
  // Enriched by backend
  project_name: string;
  project_description: string;
  inviter_name: string;
  inviter_email: string;
}

// ─── Service ─────────────────────────────────────────────

export const collaboratorService = {
  /** Invite a user by email to collaborate on a project */
  async invite(
    projectId: string,
    email: string,
    role: 'editor' | 'viewer' = 'viewer'
  ): Promise<Collaborator> {
    const res = await apiFetch(`/api/projects/${projectId}/collaborators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to invite collaborator');
    }
    return res.json();
  },

  /** List all collaborators for a project */
  async list(projectId: string): Promise<Collaborator[]> {
    const res = await apiFetch(`/api/projects/${projectId}/collaborators`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to list collaborators');
    }
    return res.json();
  },

  /** Accept a pending invite */
  async acceptInvite(collabId: string): Promise<Collaborator> {
    const res = await apiFetch(`/api/collaborators/${collabId}/accept`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to accept invite');
    }
    return res.json();
  },

  /** Decline a pending invite */
  async declineInvite(collabId: string): Promise<Collaborator> {
    const res = await apiFetch(`/api/collaborators/${collabId}/decline`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to decline invite');
    }
    return res.json();
  },

  /** Change a collaborator's role (owner only) */
  async changeRole(
    collabId: string,
    role: 'editor' | 'viewer'
  ): Promise<Collaborator> {
    const res = await apiFetch(`/api/collaborators/${collabId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to change role');
    }
    return res.json();
  },

  /** Remove a collaborator (owner) or leave a project (self) */
  async remove(collabId: string): Promise<void> {
    const res = await apiFetch(`/api/collaborators/${collabId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to remove collaborator');
    }
  },

  /** Get pending invites for the current user */
  async getMyInvites(): Promise<PendingInvite[]> {
    const res = await apiFetch(`/api/collaborators/invites`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch invites');
    }
    return res.json();
  },
};
