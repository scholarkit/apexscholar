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
            'journal': 'Research Journal',
            'resources': 'Resource Library',
            'kanban': 'Project Board',
            'explore': 'Explore Papers',
            'insights': 'AI Insights',
            'projects': 'Projects'
        };
        return names[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    };

    if (location.pathname === '/projects' || location.pathname === '/') {
        return null;
    }

    return (
        <nav className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 mb-6 group animate-in slide-in-from-top-1 duration-300">
            <Link
                to="/projects"
                className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
                <Home className="w-3.5 h-3.5" />
                <span>Projects</span>
            </Link>

            {activeProject && (
                <>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
                    <span className="text-zinc-400 font-medium truncate max-w-[150px] sm:max-w-[200px]">
                        {activeProject.name}
                    </span>
                </>
            )}

            {pathSegments.length > 0 && pathSegments[0] !== 'projects' && (
                <>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
                    <span className="text-white font-semibold">
                        {getPageName(pathSegments[0])}
                    </span>
                </>
            )}
        </nav>
    );
}
