import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Layers,
  ChevronDown,
  Check,
  Plus,
  Sparkles,
  AlertTriangle,
  FolderGit,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';

interface WorkspaceSwitcherProps {
  className?: string;
  isMobileDrawer?: boolean;
}

export default function WorkspaceSwitcher({
  className = '',
  isMobileDrawer = false,
}: WorkspaceSwitcherProps) {
  const {
    activeProject,
    projects,
    setActiveProject,
    createStarterProject,
    loading,
  } = useProject();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingStarter, setIsCreatingStarter] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdown on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleQuickCreate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreatingStarter(true);
    try {
      await createStarterProject();
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to create starter workspace:', err);
      navigate('/projects');
    } finally {
      setIsCreatingStarter(false);
    }
  };

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] ${className}`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        <span className="hidden sm:inline">Loading...</span>
      </div>
    );
  }

  // If user has 0 projects, render a quick starter creation button
  if (projects.length === 0) {
    return (
      <button
        onClick={handleQuickCreate}
        disabled={isCreatingStarter}
        title="Create initial workspace to unlock all research modules"
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50 ${className}`}
      >
        {isCreatingStarter ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
        )}
        <span>+ Starter Workspace</span>
      </button>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-medium border transition-all shadow-xs active:scale-98 ${
          activeProject
            ? 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border-[var(--color-border)] text-[var(--color-text)]'
            : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 animate-pulse'
        } ${isMobileDrawer ? 'w-full justify-between' : ''}`}
        title={activeProject ? `Active: ${activeProject.name}` : 'No active workspace selected'}
      >
        <div className="flex items-center gap-2 min-w-0">
          {activeProject ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          )}

          <span className="truncate max-w-[120px] sm:max-w-[160px] text-left">
            {activeProject ? activeProject.name : 'Select Project'}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 card-elevated rounded-2xl border border-[var(--color-border)] p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
            isMobileDrawer
              ? 'left-0 right-0 top-full w-full'
              : 'right-0 sm:right-auto sm:left-0 top-full w-72'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
              Active Workspace
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>

          {/* Project List */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1">
            {projects.map((proj) => {
              const isActive = activeProject?.id === proj.id;
              return (
                <button
                  key={proj.id}
                  onClick={() => {
                    setActiveProject(proj);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors group ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <Layers
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive
                          ? 'text-white'
                          : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="truncate">{proj.name}</div>
                      {proj.description && (
                        <div
                          className={`text-[10px] truncate max-w-[180px] ${
                            isActive ? 'text-indigo-100 opacity-80' : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          {proj.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {isActive && <Check className="w-4 h-4 flex-shrink-0 text-white" />}
                </button>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="mt-2 pt-2 border-t border-[var(--color-border)] space-y-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/projects');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Create New Workspace</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/projects');
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <span>Manage all workspaces</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
