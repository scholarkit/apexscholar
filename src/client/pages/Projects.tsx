import { memo, useCallback, useRef, useState } from 'react';
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  FolderGit,
  FolderOpen,
  FolderSearch,
  LayoutDashboard,
  Lightbulb,
  PenTool,
  Plus,
  Settings,
  SquareKanban,
  Users,
  X,
} from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { useMemory } from '../hooks/useMemory';
import { createProjectSchema } from '../lib/schemas';

const MODULES = [
  {
    id: 'explore',
    name: 'Explore Papers',
    description: 'Discover and cite new research',
    icon: <FolderSearch className="w-6 h-6" />,
    color: 'teal',
    path: '/explore',
  },
  {
    id: 'journal',
    name: 'Research Journal',
    description: 'Log progress, notes, and observations',
    icon: <BookOpen className="w-6 h-6" />,
    color: 'blue',
    path: '/journal',
  },
  {
    id: 'resources',
    name: 'Resource Library',
    description: 'Manage papers, datasets, and files',
    icon: <FolderOpen className="w-6 h-6" />,
    color: 'emerald',
    path: '/resources',
  },
  {
    id: 'kanban',
    name: 'Project Board',
    description: 'Task management and workflow',
    icon: <SquareKanban className="w-6 h-6" />,
    color: 'orange',
    path: '/kanban',
  },
  {
    id: 'insights',
    name: 'AI Insights',
    description: 'Synthesized research intelligence',
    icon: <Lightbulb className="w-6 h-6" />,
    color: 'indigo',
    path: '/insights',
  },
  {
    id: 'composr',
    name: 'Composr',
    description: 'LaTeX-powered research writing',
    icon: <PenTool className="w-6 h-6" />,
    color: 'purple',
    path: '/composr',
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; glow: string; glowHover: string }> = {
  teal: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    glow: 'bg-teal-500/5',
    glowHover: 'bg-teal-500/10',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    glow: 'bg-blue-500/5',
    glowHover: 'bg-blue-500/10',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    glow: 'bg-emerald-500/5',
    glowHover: 'bg-emerald-500/10',
  },
  orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    glow: 'bg-orange-500/5',
    glowHover: 'bg-orange-500/10',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    glow: 'bg-indigo-500/5',
    glowHover: 'bg-indigo-500/10',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    glow: 'bg-purple-500/5',
    glowHover: 'bg-purple-500/10',
  },
};

const ModuleCard = memo(function ModuleCard({
  module,
  onClick,
}: {
  module: (typeof MODULES)[0];
  onClick: (path: string) => void;
}) {
  const colors = COLOR_MAP[module.color] || COLOR_MAP.indigo;
  const handleClick = useCallback(() => onClick(module.path), [onClick, module.path]);

  return (
    <button
      onClick={handleClick}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--bg-surface-2)] shadow-sm group p-3 sm:p-6 hover:bg-[var(--color-surface-hover)] hover:border-indigo-500/30 transition-all text-left relative overflow-hidden"
    >
      <div
        className={`absolute top-0 right-0 w-24 h-24 ${colors.glow} blur-2xl rounded-full -mr-8 -mt-8 pointer-events-none will-change-transform`}
        style={{ contain: 'strict' }}
      />
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div
          className={`p-3 ${colors.bg} rounded-xl group-hover:scale-110 transition-transform duration-300`}
        >
          <div className={colors.text}>{module.icon}</div>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
      </div>
      <h3 className="text-lg font-semibold mb-2 relative z-10">{module.name}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed relative z-10">{module.description}</p>
    </button>
  );
});

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description: string;
    tags: string[];
    startDate: string;
  }) => Promise<void>;
}

function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = createProjectSchema.safeParse({ name, description, tags, startDate });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field) fieldErrors[String(field)] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim(), tags, startDate });

      // Reset form after successful creation
      setName('');
      setDescription('');
      setTags([]);
      setStartDate('');
      setTagInput('');

      // Close modal after successful creation
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
      // Keep modal open on error so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (!tags.includes(tag)) {
        setTags([...tags, tag]);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Create New Project</h3>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Project Name <span className="text-indigo-400">*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((prev) => { const { name: _, ...rest } = prev; return rest; }); }}
              className={`w-full bg-[var(--color-surface)] border ${errors.name ? 'border-red-500/50' : 'border-[var(--color-border)]'} rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50`}
              placeholder="e.g., Quantum Computing Foundations"
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-20 resize-none"
              placeholder="A brief one-liner on the research scope..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Tags</label>
            <div className="flex flex-wrap items-center gap-2 w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500/50 min-h-[44px]">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 text-xs font-medium border border-indigo-500/20"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="flex-1 min-w-[120px] bg-transparent text-sm focus:outline-none placeholder:text-zinc-600"
                placeholder={tags.length === 0 ? 'Type and press Enter…' : ''}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Start Date</label>
            <div className="relative w-full">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-8 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
            >
              {isSubmitting ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const { projects, activeProject, setActiveProject, createProject, loading } = useProject();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const memoryRef = useRef(useMemory());

  const handleNavigate = useCallback((path: string) => navigate(path), [navigate]);

  const handleCreateProject = useCallback(
    async (data: { name: string; description: string; tags: string[]; startDate: string }) => {
      try {
        const newProject = await createProject({
          name: data.name,
          description: data.description || undefined,
          tags: data.tags.length > 0 ? data.tags : undefined,
          startDate: data.startDate || null,
        });

        // Track project creation in memory
        memoryRef.current.trackEvent('project', 'create', {
          projectName: data.name,
          projectDescription: data.description,
          projectTags: data.tags,
          startDate: data.startDate,
        });

        // Set the newly created project as active
        if (newProject) {
          setActiveProject(newProject);
        }
      } catch (error) {
        console.error('Failed to create project:', error);
        throw error;
      }
    },
    [createProject, setActiveProject]
  );

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-zinc-500 font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32 lg:pb-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none will-change-transform" style={{ contain: 'strict' }} />
        <div>
          <h1 className="text-2xl font-semibold mb-2">Research Projects</h1>
          <p className="text-base text-zinc-400">Organize and manage your research workspaces.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="w-full sm:w-fit flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors  "
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </header>

      {/* Main Content Area */}
      {projects.length > 0 ? (
        <div className="space-y-4 sm:space-y-8">
          {/* Active Project Card & Switcher */}
          <div className="border border-[var(--color-border)] rounded-xl relative overflow-hidden group/card bg-[var(--bg-surface-2)]">
            {/* Shared Banner */}
            {activeProject?._shared && (
              <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-4 sm:px-8 py-2.5 flex items-center gap-3 group-hover/card:bg-indigo-500/15 transition-colors">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping pointer-events-none" />
                  <Users className="w-4 h-4 text-indigo-400 relative z-10" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                    Collaborative Workspace
                  </span>
                  <span className="hidden sm:block w-1 h-1 rounded-full bg-zinc-700" />
                  <span className="text-[10px] text-zinc-500 font-medium">
                    Shared with you as <span className="text-zinc-300 font-bold capitalize">{activeProject._role}</span>
                  </span>
                </div>
              </div>
            )}

            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none -mr-32 -mt-32 will-change-transform" style={{ contain: 'strict' }} />

            <div className="p-3 sm:p-6 sm:p-8">

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30 shadow-inner">
                    <FolderGit className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      {activeProject?.name}
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                      <p className="text-sm text-zinc-500 flex items-center gap-2 font-medium">
                        <span
                          className={`w-2 h-2 rounded-full ${activeProject?.status === 'draft' ? 'bg-zinc-400' : 'bg-emerald-500'}`}
                        ></span>
                        {activeProject?.status === 'draft' ? 'Draft Workspace' : 'Active Workspace'}
                      </p>
                      {activeProject?._shared && (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                          activeProject._role === 'editor'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5'
                        }`}>
                          <Users className="w-3 h-3" />
                          {activeProject._role}
                        </span>
                      )}
                      {activeProject?.start_date && (
                        <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          Started: {new Date(activeProject.start_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {activeProject?.description && (
                  <p className="text-zinc-500 text-base leading-relaxed max-w-2xl border-l-2 border-indigo-500/30 pl-4 py-1">
                    {activeProject.description}
                  </p>
                )}
                {activeProject?.tags && activeProject.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {activeProject.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[var(--color-surface)] text-[var(--color-accent)] text-xs font-medium border border-indigo-500/15"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0 p-2.5 rounded-xl border border-white/5 backdrop-blur-md">
                <div className="relative flex-1 sm:w-64">
                  <label className="absolute -top-2.5 left-3 px-1.5 bg-[var(--color-surface)] text-[10px] uppercase font-bold text-zinc-400 tracking-wider rounded">
                    Switch Project
                  </label>
                  <select
                    value={activeProject?.id || ''}
                    onChange={(e) => {
                      const p = projects.find((proj) => proj.id === e.target.value);
                      if (p) setActiveProject(p);
                    }}
                    className="w-full appearance-none pl-4 pr-10 py-3 bg-[var(--bg-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors shadow-inner"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p._shared ? `${p.name} (${p._role})` : p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>

                {/* Show settings button only for owners and editors */}
                {activeProject?._role !== 'viewer' && (
                  <>
                    <div className="w-px h-10 bg-white/10 hidden sm:block mx-1" />
                    <button
                      onClick={() => navigate('/projects/settings')}
                      className="flex flex-row items-center justify-center p-3 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all border border-transparent hover:border-indigo-500/20 group"
                      title="Project Settings"
                    >
                      <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
                      <span className="sm:hidden font-medium ml-2">Project Settings</span>
                    </button>
                  </>
                )}
              </div>


            </div>
          </div>
        </div>

          {activeProject ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-4">
                <LayoutDashboard className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-semibold">Project Modules</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MODULES.map((module) => (
                  <ModuleCard key={module.id} module={module} onClick={handleNavigate} />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center bg-[var(--color-surface)]/20 border border-dashed border-[var(--color-border)] rounded-xl">
              <LayoutDashboard className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Workspace Locked</h3>
              <p className="text-zinc-500 max-w-sm mx-auto">
                Select a project above to unlock its modules and insights.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-[var(--color-surface)]/20 border border-dashed border-[var(--color-border)] rounded-xl animate-in fade-in duration-700">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-8">
            <FolderGit className="w-10 h-10 text-indigo-500" />
          </div>
          <h2 className="text-lg sm:text-3xl font-bold mb-3 tracking-tight">
            Begin Your Research Journey
          </h2>
          <p className="text-zinc-500 mb-10 max-w-md leading-relaxed text-sm sm:text-base">
            Create your first research project area to start documenting discoveries, managing
            resources, and generating AI-powered insights.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-[var(--color-border)] rounded-xl font-medium transition-colors"
          >
            <Plus className="w-6 h-6" />
            Initialize Project
          </button>
        </div>
      )}

      {/* Modal */}
      {isCreating && (
        <CreateProjectModal
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}
