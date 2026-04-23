import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  Crown,
  Loader2,
  Mail,
  Pencil,
  Eye,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  collaboratorService,
  type Collaborator,
} from '../lib/collaborators';

// ─── Types ───────────────────────────────────────────────

interface ShareProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

const ROLE_CONFIG = {
  editor: {
    label: 'Editor',
    description: 'Can view and edit project content',
    icon: Pencil,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  viewer: {
    label: 'Viewer',
    description: 'Can only view project content',
    icon: Eye,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
} as const;

// ─── Component ───────────────────────────────────────────

export default function ShareProjectModal({
  isOpen,
  onClose,
  projectId,
  projectName,
}: ShareProjectModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch collaborators when modal opens
  useEffect(() => {
    if (isOpen && projectId) {
      fetchCollaborators();
    }
  }, [isOpen, projectId]);

  // Clear messages on input change
  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [email, role]);

  const fetchCollaborators = async () => {
    setLoading(true);
    try {
      const data = await collaboratorService.list(projectId);
      setCollaborators(data);
    } catch (err: any) {
      console.error('Failed to fetch collaborators:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      await collaboratorService.invite(projectId, email.trim(), role);
      setSuccess(`Invitation sent to ${email.trim()}`);
      setEmail('');
      fetchCollaborators();
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (
    collabId: string,
    newRole: 'editor' | 'viewer'
  ) => {
    try {
      await collaboratorService.changeRole(collabId, newRole);
      setCollaborators((prev) =>
        prev.map((c) => (c.id === collabId ? { ...c, role: newRole } : c))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to change role');
    }
  };

  const handleRemove = async (collabId: string) => {
    try {
      await collaboratorService.remove(collabId);
      setCollaborators((prev) => prev.filter((c) => c.id !== collabId));
    } catch (err: any) {
      setError(err.message || 'Failed to remove collaborator');
    }
  };

  if (!isOpen) return null;

  const accepted = collaborators.filter((c) => c.status === 'accepted');
  const pending = collaborators.filter((c) => c.status === 'pending');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Share Project</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="px-6 pb-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-zinc-600"
                  required
                />
              </div>
            </div>

            {/* Role selector */}
            <div className="relative">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Role
              </label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as 'editor' | 'viewer')
                  }
                  className="appearance-none pl-3 pr-8 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors [color-scheme:dark]"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={inviting || !email.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {inviting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
              <Check className="w-3.5 h-3.5" />
              {success}
            </div>
          )}
        </form>

        {/* Collaborator List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Collaborators */}
              {accepted.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Active ({accepted.length})
                  </h4>
                  <div className="space-y-1">
                    {accepted.map((collab) => (
                      <CollaboratorRow
                        key={collab.id}
                        collab={collab}
                        onChangeRole={handleChangeRole}
                        onRemove={handleRemove}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Invites */}
              {pending.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Pending ({pending.length})
                  </h4>
                  <div className="space-y-1">
                    {pending.map((collab) => (
                      <CollaboratorRow
                        key={collab.id}
                        collab={collab}
                        onChangeRole={handleChangeRole}
                        onRemove={handleRemove}
                        isPending
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {accepted.length === 0 && pending.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 font-medium">
                    No collaborators yet
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Invite team members using their email address.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Collaborator Row ────────────────────────────────────

function CollaboratorRow({
  collab,
  onChangeRole,
  onRemove,
  isPending,
}: {
  collab: Collaborator;
  onChangeRole: (id: string, role: 'editor' | 'viewer') => void;
  onRemove: (id: string) => void;
  isPending?: boolean;
}) {
  const roleConf = ROLE_CONFIG[collab.role];
  const RoleIcon = roleConf.icon;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors group">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-300 text-xs font-bold shrink-0">
        {(collab.user_name || collab.user_email || '?')
          .slice(0, 2)
          .toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {collab.user_name || collab.user_email || 'Unknown'}
          </p>
          {isPending && (
            <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-[10px] font-semibold rounded-full border border-amber-500/20">
              Pending
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 truncate">
          {collab.user_email || ''}
        </p>
      </div>

      {/* Role badge / selector */}
      <div className="relative">
        <select
          value={collab.role}
          onChange={(e) =>
            onChangeRole(collab.id, e.target.value as 'editor' | 'viewer')
          }
          className={`appearance-none text-xs font-semibold px-2.5 py-1 rounded-lg cursor-pointer border transition-colors ${roleConf.bg} ${roleConf.color} ${roleConf.border} hover:opacity-80 focus:outline-none [color-scheme:dark]`}
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(collab.id)}
        title="Remove collaborator"
        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
