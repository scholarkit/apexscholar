import { useState, useEffect } from 'react';
import { Plus, FolderPlus, FolderGit, LayoutDashboard, BookOpen, FolderSearch, SquareKanban, Sparkles, Lightbulb, ChevronRight, AlertCircle, Trash2, FolderOpen, PenTool } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';

const MODULES = [
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
        id: 'explore',
        name: 'Explore Papers',
        description: 'Discover and cite new research',
        icon: <FolderSearch className="w-6 h-6" />,
        color: 'teal',
        path: '/explore'
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
    const { projects, activeProject, setActiveProject, createProject, deleteProject, loading } = useProject();
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
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white mb-1">Research Projects</h1>
                    <p className="text-sm sm:text-base text-zinc-400">Organize and manage your research workspaces.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="w-full sm:w-fit flex items-center justify-center gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors  "
                >
                    <Plus className="w-4 h-4" />
                    New Project
                </button>
            </header>

            {/* Inline Creation Form */}
            {isCreating && (
                <div className="p-6 rounded-2xl bg-zinc-900/50 border    border-[#1f2937] backdrop-blur-sm animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-semibold text-white mb-4">Create New Project</h3>
                    <form onSubmit={handleCreateProject} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Project Name</label>
                            <input
                                autoFocus
                                value={newProject.name}
                                onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                placeholder="e.g., Quantum Computing Foundations"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                            <textarea
                                value={newProject.description}
                                onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-24 resize-none"
                                placeholder="Briefly describe the research scope..."
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-[#3B82F6] hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors  "
                            >
                                Create Workspace
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Main Content Area */}
            {projects.length > 0 ? (
                <div className="space-y-8">
                    {/* Active Project Switcher */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl bg-zinc-900/30 border    border-[#1f2937]">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
                            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1 tracking-wider">Active Workspace</label>
                            <select
                                value={activeProject?.id || ''}
                                onChange={(e) => {
                                    const p = projects.find(proj => proj.id === e.target.value);
                                    if (p) setActiveProject(p);
                                }}
                                className="ml-auto appearance-none pl-4 pr-10 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 cursor-pointer h-full"
                            >
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => {
                                    if (confirm(`Delete project "${activeProject.name}" and all associated research data? This cannot be undone.`)) {
                                        deleteProject(activeProject.id);
                                    }
                                }}
                                className="flex items-center gap-2 text-zinc-500 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-widest"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    </div>

                    {activeProject ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 border-b    border-[#1f2937] pb-4">
                                <LayoutDashboard className="w-5 h-5 text-indigo-400" />
                                <h2 className="text-xl font-semibold text-white">Project Modules</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {MODULES.map((module) => (
                                    <button
                                        key={module.id}
                                        onClick={() => navigate(module.path)}
                                        className="group p-6 rounded-2xl bg-zinc-900/50 border    border-[#1f2937] hover:bg-zinc-900/80 hover:border-indigo-500/30 transition-all text-left backdrop-blur-sm relative overflow-hidden"
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
                        <div className="py-20 text-center bg-zinc-900/20 border border-dashed border-white/10 rounded-3xl">
                            <LayoutDashboard className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Workspace Locked</h3>
                            <p className="text-zinc-500 max-w-sm mx-auto">Select a project above to unlock its modules and insights.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-zinc-900/20 border border-dashed border-white/10 rounded-3xl animate-in fade-in duration-700">
                    <div className="w-20 h-20 bg-[#3B82F6]/10 rounded-3xl flex items-center justify-center mb-8">
                        <FolderGit className="w-10 h-10 text-indigo-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Begin Your Research Journey</h2>
                    <p className="text-zinc-500 mb-10 max-w-md leading-relaxed text-sm sm:text-base">Create your first research project area to start documenting discoveries, managing resources, and generating AI-powered insights.</p>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-[#3B82F6] hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-500/20 hover:-translate-y-1 active:scale-95"
                    >
                        <Plus className="w-6 h-6" />
                        Initialize Project
                    </button>
                </div>
            )}
        </div>
    );
}
