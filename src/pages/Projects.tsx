import { useState } from 'react';
import { Plus, FolderPlus, FolderGit, LayoutDashboard, BookOpen, FolderSearch, SquareKanban, Sparkles, Lightbulb, ChevronRight, AlertCircle, Settings, FolderOpen, PenTool, ChevronDown } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';

const MODULES = [
    {
        id: 'explore',
        name: 'Explore Papers',
        description: 'Discover and cite new research',
        icon: <FolderSearch className="w-6 h-6" />,
        color: 'teal',
        path: '/explore'
    },
    {
        id: 'journal',
        name: 'Research Journal',
        description: 'Log progress, notes, and observations',
        icon: <BookOpen className="w-6 h-6" />,
        color: 'blue',
        path: '/journal'
    },
    {
        id: 'resources',
        name: 'Resource Library',
        description: 'Manage papers, datasets, and files',
        icon: <FolderOpen className="w-6 h-6" />,
        color: 'emerald',
        path: '/resources'
    },
    {
        id: 'kanban',
        name: 'Project Board',
        description: 'Task management and workflow',
        icon: <SquareKanban className="w-6 h-6" />,
        color: 'orange',
        path: '/kanban'
    },
    {
        id: 'insights',
        name: 'AI Insights',
        description: 'Synthesized research intelligence',
        icon: <Lightbulb className="w-6 h-6" />,
        color: 'indigo',
        path: '/insights'
    },
    {
        id: 'composr',
        name: 'Composr',
        description: 'LaTeX-powered research writing',
        icon: <PenTool className="w-6 h-6" />,
        color: 'purple',
        path: '/composr'
    }
];

export default function Projects() {
    const { projects, activeProject, setActiveProject, createProject, loading } = useProject();
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '' });

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProject.name.trim()) return;
        await createProject(newProject.name, newProject.description);
        setNewProject({ name: '', description: '' });
        setIsCreating(false);
    };

    if (loading) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center h-full">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                    <p className="text-zinc-500 font-medium">Loading workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-32 lg:pb-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
                <div>
                    <h1 className="text-2xl font-semibold text-white">Research Projects</h1>
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

            {/* Inline Creation Form */}
            {isCreating && (
                <div className="p-6 rounded-xl bg-zinc-900/50 border border-neutral-800 backdrop-blur-sm animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-semibold text-white mb-4">Create New Project</h3>
                    <form onSubmit={handleCreateProject} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Project Name</label>
                            <input
                                autoFocus
                                value={newProject.name}
                                onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                placeholder="e.g., Quantum Computing Foundations"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                            <textarea
                                value={newProject.description}
                                onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-24 resize-none"
                                placeholder="Briefly describe the research scope..."
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors  "
                            >
                                Create Workspace
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Main Content Area */}
            {projects.length > 0 ? (
                <div className="space-y-4 sm:space-y-8">
                    {/* Active Project Card & Switcher */}
                    <div className="bg-gradient-to-br from-indigo-500/10 via-zinc-900/50 to-zinc-900/30 border border-indigo-500/20 rounded-xl p-3 sm:p-6 sm:p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none -mr-32 -mt-32" />

                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30 shadow-inner">
                                        <FolderGit className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{activeProject?.name}</h2>
                                        <p className="text-sm text-indigo-200/70 mt-1 flex items-center gap-2 font-medium">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Active Workspace
                                        </p>
                                    </div>
                                </div>
                                {activeProject?.description && (
                                    <p className="text-zinc-400 text-base leading-relaxed max-w-2xl border-l-2 border-indigo-500/30 pl-4 py-1">
                                        {activeProject.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0 bg-black/40 p-2.5 rounded-xl border border-white/5 backdrop-blur-md">
                                <div className="relative flex-1 sm:w-64">
                                    <label className="absolute -top-2.5 left-3 px-1.5 bg-[#121214] text-[10px] uppercase font-bold text-zinc-400 tracking-wider rounded">Switch Project</label>
                                    <select
                                        value={activeProject?.id || ''}
                                        onChange={(e) => {
                                            const p = projects.find(proj => proj.id === e.target.value);
                                            if (p) setActiveProject(p);
                                        }}
                                        className="w-full appearance-none pl-4 pr-10 py-3 bg-zinc-900/80 border border-zinc-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 cursor-pointer hover:bg-zinc-800 transition-colors shadow-inner"
                                    >
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                </div>
                                <div className="w-px h-10 bg-white/10 hidden sm:block mx-1" />
                                <button
                                    onClick={() => navigate('/projects/settings')}
                                    className="flex flex-row items-center justify-center p-3 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all border border-transparent hover:border-indigo-500/20 group"
                                    title="Project Settings"
                                >
                                    <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
                                    <span className="sm:hidden font-medium ml-2">Project Settings</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {activeProject ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 border-b    border-neutral-800 pb-4">
                                <LayoutDashboard className="w-5 h-5 text-indigo-400" />
                                <h2 className="text-xl font-semibold text-white">Project Modules</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {MODULES.map((module) => (
                                    <button
                                        key={module.id}
                                        onClick={() => navigate(module.path)}
                                        className="rounded-xl border border-neutral-800 bg-neutral-900 shadow-sm group p-3 sm:p-6 border hover:bg-neutral-800 hover:border-indigo-500/30 transition-all text-left backdrop-blur-sm relative overflow-hidden"
                                    >
                                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${module.color}-500/5 blur-3xl rounded-full -mr-8 -mt-8 group-hover:bg-${module.color}-500/10 transition-colors`} />

                                        <div className="flex items-start justify-between mb-4 relative z-10">
                                            <div className={`p-3 bg-${module.color}-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                                                <div className={
                                                    module.color === 'blue' ? 'text-blue-400' :
                                                        module.color === 'emerald' ? 'text-emerald-400' :
                                                            module.color === 'orange' ? 'text-orange-400' :
                                                                module.color === 'teal' ? 'text-teal-400' :
                                                                    'text-indigo-400'
                                                }>
                                                    {module.icon}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-white mb-2 relative z-10">{module.name}</h3>
                                        <p className="text-sm text-zinc-500 leading-relaxed relative z-10">{module.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-zinc-900/20 border border-dashed border-white/10 rounded-xl">
                            <LayoutDashboard className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Workspace Locked</h3>
                            <p className="text-zinc-500 max-w-sm mx-auto">Select a project above to unlock its modules and insights.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-zinc-900/20 border border-dashed border-white/10 rounded-xl animate-in fade-in duration-700">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-8">
                        <FolderGit className="w-10 h-10 text-indigo-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Begin Your Research Journey</h2>
                    <p className="text-zinc-500 mb-10 max-w-md leading-relaxed text-base">Create your first research project area to start documenting discoveries, managing resources, and generating AI-powered insights.</p>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-colors"
                    >
                        <Plus className="w-6 h-6" />
                        Initialize Project
                    </button>
                </div>
            )}
        </div>
    );
}
