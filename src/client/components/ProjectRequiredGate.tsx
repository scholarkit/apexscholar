import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderPlus,
  Sparkles,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Layers,
  FolderOpen,
  Calendar,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';

interface ProjectRequiredGateProps {
  moduleName: string;
  moduleDescription: string;
  icon?: React.ReactNode;
  actionHint?: string;
}

export default function ProjectRequiredGate({
  moduleName,
  moduleDescription,
  icon,
  actionHint,
}: ProjectRequiredGateProps) {
  const {
    projects,
    setActiveProject,
    createProject,
    createStarterProject,
    loading: projectsLoading,
  } = useProject();
  const navigate = useNavigate();

  const [isCreatingStarter, setIsCreatingStarter] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateStarter = async () => {
    setIsCreatingStarter(true);
    setError(null);
    try {
      if (createStarterProject) {
        await createStarterProject();
      } else {
        await createProject({
          name: 'General Research',
          description: 'Default research workspace for literature, notes, writing, and tasks.',
          tags: ['general', 'research'],
          startDate: new Date().toISOString().split('T')[0],
        });
      }
    } catch (err: any) {
      console.error('Failed to create starter project:', err);
      setError(err?.message || 'Failed to create starter workspace. Please try again.');
    } finally {
      setIsCreatingStarter(false);
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    setIsCreatingCustom(true);
    setError(null);
    try {
      await createProject({
        name: customName.trim(),
        description: customDesc.trim() || undefined,
        tags: ['research'],
        startDate: new Date().toISOString().split('T')[0],
      });
    } catch (err: any) {
      console.error('Failed to create custom project:', err);
      setError(err?.message || 'Failed to create project. Please try again.');
    } finally {
      setIsCreatingCustom(false);
    }
  };

  if (projectsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin mb-4" />
        <p className="text-sm text-[var(--color-text-muted)] font-medium">Checking workspace status...</p>
      </div>
    );
  }

  // CASE 1: The user has existing projects, but none is currently selected as active
  if (projects.length > 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
            {icon || <FolderOpen className="w-8 h-8" />}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)] mb-2">
            Select a Project for {moduleName}
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-text-muted)] max-w-md mx-auto">
            {moduleDescription} Choose an existing workspace to activate it for this module:
          </p>
        </div>

        {error && (
          <div className="p-3.5 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => setActiveProject(proj)}
              role="button"
              tabIndex={0}
              className="card-elevated group p-4 sm:p-5 rounded-2xl flex items-center justify-between cursor-pointer border border-[var(--color-border)] hover:border-indigo-500/50 hover:bg-[var(--color-surface-hover)] transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5 min-w-0 pr-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-[var(--color-text)] group-hover:text-indigo-400 transition-colors truncate">
                    {proj.name}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] truncate max-w-sm sm:max-w-md mt-0.5">
                    {proj.description || 'No description provided'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  Open Module
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="sm:hidden p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--color-border)]">
          <button
            onClick={() => navigate('/projects')}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            Manage all projects &rarr;
          </button>

          <button
            onClick={handleCreateStarter}
            disabled={isCreatingStarter}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {isCreatingStarter ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>Create new project instead</span>
          </button>
        </div>
      </div>
    );
  }

  // CASE 2: User has 0 projects (new user or all projects deleted)
  return (
    <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Visual Accent Glow */}
      <div className="relative mb-8 text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/15 blur-[60px] rounded-full pointer-events-none" />

        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 mb-5 shadow-xl shadow-indigo-500/10">
          {icon || <FolderPlus className="w-10 h-10" />}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick Workspace Setup</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text)] mb-2.5">
          {moduleName} Requires a Workspace
        </h2>
        <p className="text-sm sm:text-base text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
          {moduleDescription}
          <span className="block mt-1 text-[var(--color-text-faint)]">
            Apex Scholar organizes research entries, papers, tasks, and drafts within active projects.
          </span>
        </p>
      </div>

      {error && (
        <div className="p-3.5 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Main Action Card */}
      <div className="card-elevated rounded-3xl p-6 sm:p-7 border border-[var(--color-border)] shadow-xl relative overflow-hidden backdrop-blur-xl">
        <div className="space-y-4">
          {/* Option A: 1-Click Starter Project */}
          <button
            onClick={handleCreateStarter}
            disabled={isCreatingStarter || isCreatingCustom}
            className="w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold transition-all shadow-lg shadow-indigo-600/25 active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                {isCreatingStarter ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold">
                  {isCreatingStarter ? 'Creating Workspace...' : 'Create "General Research" Project'}
                </div>
                <div className="text-xs text-indigo-100/80 font-normal">
                  Instant 1-click starter workspace to unlock {moduleName} now
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-2" />
          </button>

          {/* Value Highlights */}
          <div className="grid grid-cols-3 gap-2 py-3 px-2 border-y border-[var(--color-border)]/60 text-center">
            <div className="text-center">
              <span className="block text-xs font-semibold text-[var(--color-text)]">Isolated</span>
              <span className="text-[10px] text-[var(--color-text-faint)]">Clean data boundaries</span>
            </div>
            <div className="text-center border-x border-[var(--color-border)]/60">
              <span className="block text-xs font-semibold text-[var(--color-text)]">Automatic</span>
              <span className="text-[10px] text-[var(--color-text-faint)]">Instant configuration</span>
            </div>
            <div className="text-center">
              <span className="block text-xs font-semibold text-[var(--color-text)]">Private</span>
              <span className="text-[10px] text-[var(--color-text-faint)]">Encrypted vault</span>
            </div>
          </div>

          {/* Option B: Custom Project Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowCustomForm((prev) => !prev)}
              className="w-full py-2.5 px-3 flex items-center justify-center gap-2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors rounded-xl hover:bg-[var(--color-surface-hover)]"
            >
              <span>Want a custom project name instead?</span>
              {showCustomForm ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showCustomForm && (
              <form onSubmit={handleCreateCustom} className="mt-3 space-y-3 pt-3 border-t border-[var(--color-border)] animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">
                    Project Name <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Quantum Computing Thesis"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">
                    Description <span className="text-[var(--color-text-faint)] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of research focus..."
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingCustom || !customName.trim()}
                  className="w-full py-2.5 px-4 bg-[var(--color-surface-hover)] hover:bg-indigo-600 hover:text-white border border-[var(--color-border)] hover:border-indigo-500/50 text-[var(--color-text)] text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCreatingCustom ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Create & Launch {moduleName}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
