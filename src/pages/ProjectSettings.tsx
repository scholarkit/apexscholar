import { useState, useEffect } from 'react';
import {
    Settings,
    Save,
    Trash2,
    ArrowLeft,
    Users,
    Tag,
    Download,
    AlertTriangle,
    CheckCircle2,
    Clock,
    FolderGit,
} from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';

function ComingSoonBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            <Clock className="w-3 h-3" />
            Coming Soon
        </span>
    );
}

function SectionCard({
    title,
    description,
    icon,
    comingSoon,
    children,
    danger,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    comingSoon?: boolean;
    children?: React.ReactNode;
    danger?: boolean;
}) {
    return (
        <div
            className={`rounded-xl border p-6 ${danger
                    ? 'border-red-500/20 bg-red-500/5'
                    : comingSoon
                        ? 'border-neutral-800 bg-neutral-900/50 opacity-60'
                        : 'border-neutral-800 bg-neutral-900'
                }`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className={`p-2 rounded-xl ${danger
                                ? 'bg-red-500/10 text-red-400'
                                : comingSoon
                                    ? 'bg-zinc-800 text-zinc-500'
                                    : 'bg-indigo-500/10 text-indigo-400'
                            }`}
                    >
                        {icon}
                    </div>
                    <div>
                        <h3
                            className={`font-semibold ${danger ? 'text-red-300' : 'text-white'
                                }`}
                        >
                            {title}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
                    </div>
                </div>
                {comingSoon && <ComingSoonBadge />}
            </div>
            {children && !comingSoon && <div>{children}</div>}
            {comingSoon && (
                <div className="h-16 rounded-lg bg-zinc-800/50 border border-dashed border-zinc-700 flex items-center justify-center">
                    <p className="text-xs text-zinc-600">
                        This feature is not available yet — stay tuned.
                    </p>
                </div>
            )}
        </div>
    );
}

export default function ProjectSettings() {
    const { activeProject, updateProject, deleteProject } = useProject();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');

    useEffect(() => {
        if (activeProject) {
            setName(activeProject.name);
            setDescription(activeProject.description || '');
        }
    }, [activeProject]);

    if (!activeProject) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center p-6">
                <FolderGit className="w-12 h-12 text-zinc-700 mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">No Project Selected</h2>
                <p className="text-zinc-500 mb-6 text-sm">
                    Go back to Projects and select a workspace first.
                </p>
                <button
                    onClick={() => navigate('/projects')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Projects
                </button>
            </div>
        );
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            await updateProject(activeProject.id, {
                name: name.trim(),
                description: description.trim(),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleteInput !== activeProject.name) return;
        setDeleting(true);
        try {
            await deleteProject(activeProject.id);
            navigate('/projects');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-32 lg:pb-8">
            {/* Header */}
            <header className="flex items-center gap-4">
                <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
                <button
                    onClick={() => navigate('/projects')}
                    className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    title="Back to Projects"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-400" />
                        <h1 className="text-2xl font-semibold text-white">Project Settings</h1>
                    </div>
                    <p className="text-sm text-zinc-500 ml-7">
                        <span className="text-indigo-300/70 font-medium">{activeProject.name}</span>
                    </p>
                </div>
            </header>

            {/* General */}
            <SectionCard
                title="General"
                description="Update your project name and description."
                icon={<FolderGit className="w-4 h-4" />}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            Project Name
                        </label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
                            placeholder="Project name"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-24 resize-none transition-shadow"
                            placeholder="Briefly describe the research scope..."
                        />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-1">
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        {saved && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400 animate-in fade-in duration-300">
                                <CheckCircle2 className="w-4 h-4" />
                                Saved
                            </span>
                        )}
                    </div>
                </form>
            </SectionCard>

            {/* Coming Soon: Collaboration */}
            <SectionCard
                title="Collaboration"
                description="Invite team members and manage permissions."
                icon={<Users className="w-4 h-4" />}
                comingSoon
            />

            {/* Coming Soon: Keywords & Tags */}
            <SectionCard
                title="Keywords & Tags"
                description="Organize your project with semantic keywords and custom tags."
                icon={<Tag className="w-4 h-4" />}
                comingSoon
            />

            {/* Coming Soon: Export / Backup */}
            <SectionCard
                title="Export & Backup"
                description="Export your research data or create encrypted backups."
                icon={<Download className="w-4 h-4" />}
                comingSoon
            />

            {/* Danger Zone */}
            <SectionCard
                title="Danger Zone"
                description="Irreversible actions that affect your entire project."
                icon={<AlertTriangle className="w-4 h-4" />}
                danger
            >
                {!showDeleteConfirm ? (
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                        <div>
                            <p className="text-sm font-medium text-white">Delete this project</p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                Permanently removes the project and all associated research data.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl text-sm font-medium transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-2 text-sm text-red-300">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>
                                This action <strong>cannot be undone</strong>. Type{' '}
                                <strong className="font-mono text-white">{activeProject.name}</strong>{' '}
                                to confirm deletion.
                            </p>
                        </div>
                        <input
                            autoFocus
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            className="w-full bg-black border border-red-500/30 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 text-sm"
                            placeholder={activeProject.name}
                        />
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteInput('');
                                }}
                                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteInput !== activeProject.name || deleting}
                                className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                {deleting ? 'Deleting…' : 'Delete Project'}
                            </button>
                        </div>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
