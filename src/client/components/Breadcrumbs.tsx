import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';

export default function Breadcrumbs() {
  const location = useLocation();
  const { activeProject } = useProject();

  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Map path segments to human-readable names
  const getPageName = (segment: string) => {
    const names: Record<string, string> = {
      journal: 'Journal',
      resources: 'Resources',
      kanban: 'Project Board',
      todos: 'Todos',
      timetable: 'Timetable',
      explore: 'Explore Literature',
      insights: 'AI Insights',
      projects: 'Projects',
      funding: 'Funding & Grants',
      composr: 'LaTeX Composr',
      'vimeo-downloader': 'Subtitles',
      settings: 'Settings',
      about: 'About',
    };
    return names[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  if (location.pathname === '/') {
    return (
      <div className="flex items-center gap-2.5 animate-in fade-in duration-200">
        <span className="font-semibold text-sm sm:text-base text-[var(--color-text)] tracking-tight">
          Research Workspace
        </span>
        <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-[var(--color-text-faint)]" />
        <span className="hidden sm:inline text-xs text-[var(--color-text-muted)] font-normal">
          Dashboard
        </span>
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-2 text-xs sm:text-sm text-[var(--color-text-muted)] animate-in fade-in duration-200">
      <Link
        to="/"
        className="flex items-center gap-1.5 hover:text-[var(--color-text)] transition-colors p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)]"
        title="Dashboard"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Home</span>
      </Link>

      {activeProject && location.pathname.startsWith('/projects') && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-faint)] flex-shrink-0" />
          <span className="text-[var(--color-text-muted)] font-medium truncate max-w-[140px] sm:max-w-[200px]">
            {activeProject.name}
          </span>
        </>
      )}

      {pathSegments.length > 0 && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-faint)] flex-shrink-0" />
          <span className="font-semibold text-[var(--color-text)] text-sm truncate max-w-[180px] sm:max-w-[260px]">
            {getPageName(pathSegments[0])}
          </span>
        </>
      )}
    </nav>
  );
}

