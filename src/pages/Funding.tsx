import { useState, useEffect, useMemo } from 'react';
import { puterService } from '../lib/puter';
import {
    Landmark, Plus, Search, Calendar as CalendarIcon, DollarSign,
    FileText, CheckSquare, Clock, AlertCircle, TrendingUp, X,
    ChevronDown, Edit2, Trash2, CheckCircle2, FileUp, ListTodo
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function startOfDay(date: Date | string) {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Requirement {
    id: string;
    description: string;
    completed: boolean;
}

interface Budget {
    requested: number;
    awarded: number;
    spent: number;
    currency: string;
}

export interface Grant {
    id: string;
    title: string;
    funder: string;
    deadline: string; // ISO string
    status: 'planned' | 'drafting' | 'submitted' | 'awarded' | 'rejected';
    requirements: Requirement[];
    budget: Budget;
    documentUrl?: string; // Link to Putnam Drive / Google Docs
    notes?: string;
    createdAt: string;
}

const KV_KEY = 'research_funding';

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Funding() {
    const [grants, setGrants] = useState<Grant[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'budget'>('overview');

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<Grant['status'] | 'all'>('all');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGrant, setEditingGrant] = useState<Grant | null>(null);

    // Initial load
    useEffect(() => {
        puterService.kvGet(KV_KEY).then((data: Grant[] | null) => {
            setGrants(data || []);
            setLoading(false);
        });
    }, []);

    // Auto-save wrapper
    const saveGrants = async (newGrants: Grant[]) => {
        setGrants(newGrants);
        await puterService.kvSet(KV_KEY, newGrants);
    };

    // Derived Metrics
    const metrics = useMemo(() => {
        let totalRequested = 0;
        let totalAwarded = 0;
        let totalSpent = 0;
        let activeProposals = 0;

        const today = startOfDay(new Date());
        const upcomingDeadlines = [] as Grant[];

        grants.forEach(g => {
            totalRequested += Number(g.budget.requested) || 0;
            totalAwarded += Number(g.budget.awarded) || 0;
            totalSpent += Number(g.budget.spent) || 0;

            if (['planned', 'drafting', 'submitted'].includes(g.status)) {
                activeProposals++;
            }

            if (g.deadline && ['planned', 'drafting'].includes(g.status)) {
                const deadlineDay = startOfDay(g.deadline);
                const diffTime = deadlineDay.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (deadlineDay > today && diffDays <= 30) {
                    upcomingDeadlines.push(g);
                }
            }
        });

        upcomingDeadlines.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

        return { totalRequested, totalAwarded, totalSpent, activeProposals, upcomingDeadlines };
    }, [grants]);

    // Filtering
    const filteredGrants = useMemo(() => {
        return grants.filter(g => {
            const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                g.funder.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            // Sort by deadline if available, otherwise by creation date
            if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [grants, searchQuery, statusFilter]);

    // Handlers
    const handleSaveGrant = (grant: Grant) => {
        if (editingGrant) {
            saveGrants(grants.map(g => g.id === grant.id ? grant : g));
        } else {
            saveGrants([grant, ...grants]);
        }
        setIsModalOpen(false);
        setEditingGrant(null);
    };

    const handleDeleteGrant = (id: string) => {
        if (!confirm('Are you sure you want to delete this grant?')) return;
        saveGrants(grants.filter(g => g.id !== id));
    };

    const toggleRequirement = (grantId: string, reqId: string) => {
        saveGrants(grants.map(g => {
            if (g.id !== grantId) return g;
            return {
                ...g,
                requirements: g.requirements.map(r => r.id === reqId ? { ...r, completed: !r.completed } : r)
            };
        }));
    };

    if (loading) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center h-full">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                    <p className="text-zinc-500 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                        Funding & Grants
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                            Tracker
                        </span>
                    </h1>
                    <p className="text-xs sm:text-base text-zinc-400">Manage proposals, observe deadlines, and track your research funding.</p>
                </div>
                <button
                    onClick={() => { setEditingGrant(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-indigo-500 text-white rounded-xl font-medium transition-all  "
                >
                    <Plus className="w-4 h-4" />
                    New Grant
                </button>
            </header>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Active Proposals"
                    value={metrics.activeProposals.toString()}
                    icon={<FileText className="w-5 h-5 text-[#3B82F6]" />}
                    trend="In progress"
                />
                <MetricCard
                    title="Total Awarded"
                    value={`$${metrics.totalAwarded.toLocaleString()}`}
                    icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
                    trend={`of $${metrics.totalRequested.toLocaleString()} requested`}
                />
                <MetricCard
                    title="Budget Spent"
                    value={`$${metrics.totalSpent.toLocaleString()}`}
                    icon={<DollarSign className="w-5 h-5 text-amber-400" />}
                    trend={metrics.totalAwarded > 0 ? `${Math.round((metrics.totalSpent / metrics.totalAwarded) * 100)}% of awarded` : 'No funds awarded yet'}
                />
                <div className="bg-zinc-900/50 border    border-[#1f2937] p-4 rounded-2xl flex flex-col justify-between group hover:border-white/10 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                        <span className="text-sm font-medium text-zinc-400">Approaching Deadlines</span>
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-rose-400" />
                        </div>
                    </div>
                    <div>
                        {metrics.upcomingDeadlines.length > 0 ? (
                            <div className="flex flex-col gap-1">
                                <span className="text-2xl font-bold text-white">{metrics.upcomingDeadlines.length}</span>
                                <span className="text-xs text-rose-400 font-medium truncate">Next: {metrics.upcomingDeadlines[0].funder}</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <span className="text-2xl font-bold text-white">0</span>
                                <span className="text-xs text-zinc-500">No deadlines in next 30 days</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="space-y-6">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 bg-zinc-900/30 p-2 rounded-2xl border    border-[#1f2937]">
                    <div className="flex flex-col sm:flex-row gap-1 p-1 bg-zinc-900/80 rounded-xl">
                        {(['overview', 'requirements', 'budget'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize flex items-center gap-2",
                                    activeTab === tab
                                        ? "bg-white/10 text-white shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                )}
                            >
                                {tab === 'overview' && <Landmark className="w-4 h-4" />}
                                {tab === 'requirements' && <CheckSquare className="w-4 h-4" />}
                                {tab === 'budget' && <DollarSign className="w-4 h-4" />}
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search grants..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50"
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="w-full appearance-none pl-4 pr-10 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 cursor-pointer h-full"
                            >
                                <option value="all">All Statuses</option>
                                <option value="planned">Planned</option>
                                <option value="drafting">Drafting</option>
                                <option value="submitted">Submitted</option>
                                <option value="awarded">Awarded</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Content Views */}
                {filteredGrants.length === 0 ? (
                    <div className="text-center py-10 sm:py-20 bg-zinc-900/20 border border-dashed border-white/10 rounded-2xl">
                        <Landmark className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No grants found</h3>
                        <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                            {grants.length === 0
                                ? "You haven't added any funding applications yet."
                                : "No grants match your current filters."}
                        </p>
                        {grants.length === 0 && (
                            <button
                                onClick={() => { setEditingGrant(null); setIsModalOpen(true); }}
                                className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-[#3B82F6]/10 text-[#3B82F6] hover:bg-[#3B82F6]/20 border border-indigo-500/20 rounded-xl font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Add your first grant
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredGrants.map(grant => (
                            <GrantCard
                                key={grant.id}
                                grant={grant}
                                view={activeTab}
                                onEdit={() => { setEditingGrant(grant); setIsModalOpen(true); }}
                                onDelete={() => handleDeleteGrant(grant.id)}
                                onToggleRequirement={toggleRequirement}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <GrantFormModal
                    grant={editingGrant}
                    onSave={handleSaveGrant}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
    return (
        <div className="bg-zinc-900/50 border    border-[#1f2937] p-4 rounded-2xl flex flex-col justify-between group hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <span className="text-sm font-medium text-zinc-400">{title}</span>
                <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {icon}
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
                <span className="text-xs text-zinc-500">{trend}</span>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: Grant['status'] }) {
    const colors = {
        planned: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
        drafting: 'bg-indigo-500/10 text-[#3B82F6] border-indigo-500/20',
        submitted: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        awarded: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    };

    return (
        <span className={cn("px-2.5 py-1 text-xs font-semibold rounded-full border capitalize", colors[status])}>
            {status}
        </span>
    );
}

function GrantCard({
    grant,
    view,
    onEdit,
    onDelete,
    onToggleRequirement
}: {
    grant: Grant;
    view: 'overview' | 'requirements' | 'budget';
    onEdit: () => void;
    onDelete: () => void;
    onToggleRequirement: (gId: string, rId: string) => void;
}) {
    // Calculate progress for requirements
    const totalReqs = grant.requirements.length;
    const completedReqs = grant.requirements.filter(r => r.completed).length;
    const progress = totalReqs > 0 ? (completedReqs / totalReqs) * 100 : 0;
    const today = startOfDay(new Date());
    const deadlineDay = grant.deadline ? startOfDay(grant.deadline) : null;
    const isOverdue = Boolean(deadlineDay && deadlineDay < today && !['awarded', 'rejected'].includes(grant.status));
    const isDueToday = Boolean(deadlineDay && deadlineDay.getTime() === today.getTime());

    return (
        <div className="bg-zinc-900/40 border    border-[#1f2937] hover:border-white/10 hover:bg-zinc-900/60 transition-all rounded-2xl p-2.5 sm:p-5 flex flex-col gap-4 group relative">
            {/* Context Actions */}
            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={onDelete} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Header Area */}
            <div className="pr-12">
                <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={grant.status} />
                    {isOverdue && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Overdue
                        </span>
                    )}
                </div>
                <h3 className="text-base font-semibold text-white leading-snug line-clamp-2" title={grant.title}>{grant.title}</h3>
                <p className="text-sm text-zinc-400 mt-1 line-clamp-1">{grant.funder}</p>
            </div>

            {/* Conditional Body based on View */}
            <div className="flex-1 mt-2 border-t    border-[#1f2937] pt-4">
                {view === 'overview' && (
                    <div className="space-y-3">
                        {grant.deadline ? (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-500 flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> Deadline</span>
                                <span className={cn(
                                    "font-medium",
                                    isOverdue ? "text-rose-400" : isDueToday ? "text-amber-300" : "text-zinc-300"
                                )}>
                                    {new Date(grant.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        ) : (
                            <div className="text-sm text-zinc-500 italic">No deadline set</div>
                        )}

                        {grant.documentUrl && (
                            <a href={grant.documentUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-[#3B82F6] hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-2 rounded-xl transition-colors w-fit">
                                <FileUp className="w-4 h-4" /> Open Proposal Doc
                            </a>
                        )}

                        <div className="space-y-1.5 pt-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-500">Requirements Check</span>
                                <span className="text-zinc-300 font-medium">{completedReqs} / {totalReqs}</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    </div>
                )}

                {view === 'requirements' && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                            <ListTodo className="w-4 h-4 text-[#3B82F6]" /> Checklist
                        </div>
                        {grant.requirements.length === 0 ? (
                            <p className="text-xs text-zinc-500 italic">No requirements tracked.</p>
                        ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                {grant.requirements.map(req => (
                                    <button
                                        key={req.id}
                                        onClick={() => onToggleRequirement(grant.id, req.id)}
                                        className="w-full flex items-start gap-2 text-left group/req"
                                    >
                                        <div className={cn(
                                            "mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center",
                                            req.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-zinc-600 group-hover/req:border-indigo-400"
                                        )}>
                                            {req.completed && <CheckCircle2 className="w-3 h-3" />}
                                        </div>
                                        <span className={cn(
                                            "text-sm",
                                            req.completed ? "text-zinc-500 line-through" : "text-zinc-300 group-hover/req:text-white transition-colors"
                                        )}>
                                            {req.description}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {view === 'budget' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Requested</span>
                                <span className="font-semibold text-white">${Number(grant.budget.requested).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Awarded</span>
                                <span className="font-semibold text-emerald-400">${Number(grant.budget.awarded).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t    border-[#1f2937]">
                                <span className="text-zinc-500">Spent</span>
                                <span className="font-semibold text-amber-400">${Number(grant.budget.spent).toLocaleString()}</span>
                            </div>
                        </div>

                        {Number(grant.budget.awarded) > 0 && (
                            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-amber-400 transition-all duration-500"
                                    style={{ width: `${Math.min((Number(grant.budget.spent) / Number(grant.budget.awarded)) * 100, 100)}%` }}
                                    title="Spent"
                                />
                                <div
                                    className="h-full bg-emerald-500/20 transition-all duration-500 flex-1"
                                    title="Remaining"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Modal Form ────────────────────────────────────────────────────────────────

function GrantFormModal({ grant, onSave, onClose }: { grant: Grant | null, onSave: (g: Grant) => void, onClose: () => void }) {
    const [formData, setFormData] = useState<Partial<Grant>>(
        grant || {
            title: '', funder: '', deadline: '', status: 'planned',
            documentUrl: '', notes: '',
            budget: { requested: 0, awarded: 0, spent: 0, currency: 'USD' },
            requirements: []
        }
    );

    const [newReq, setNewReq] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.funder) return;

        onSave({
            ...formData,
            id: grant?.id || crypto.randomUUID(),
            createdAt: grant?.createdAt || new Date().toISOString(),
        } as Grant);
    };

    const addReq = () => {
        if (!newReq.trim()) return;
        setFormData(prev => ({
            ...prev,
            requirements: [...(prev.requirements || []), { id: crypto.randomUUID(), description: newReq.trim(), completed: false }]
        }));
        setNewReq('');
    };

    const removeReq = (id: string) => {
        setFormData(prev => ({
            ...prev,
            requirements: (prev.requirements || []).filter(r => r.id !== id)
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-black border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {grant ? 'Edit Grant Proposal' : 'New Grant Proposal'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="grant-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#3B82F6]" /> Basic Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Proposal Title *</label>
                                <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/50" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Funder / Agency *</label>
                                <input required type="text" value={formData.funder} onChange={e => setFormData({ ...formData, funder: e.target.value })}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/50" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Status</label>
                                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/50 appearance-none">
                                    <option value="planned">Planned</option>
                                    <option value="drafting">Drafting</option>
                                    <option value="submitted">Submitted</option>
                                    <option value="awarded">Awarded</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Deadline Date</label>
                                <input type="date" value={formData.deadline ? new Date(formData.deadline).toISOString().split('T')[0] : ''}
                                    onChange={e => setFormData({ ...formData, deadline: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/50" style={{ colorScheme: 'dark' }} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Document Link (e.g. Google Docs)</label>
                                <input type="url" value={formData.documentUrl || ''} onChange={e => setFormData({ ...formData, documentUrl: e.target.value })}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/50 placeholder:text-zinc-600" placeholder="https://..." />
                            </div>
                        </div>
                    </div>

                    <hr className="   border-[#1f2937]" />

                    {/* Budget */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-400" /> Budget Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Requested Amount ($)</label>
                                <input type="number" min="0" value={formData.budget?.requested || ''} onChange={e => setFormData({ ...formData, budget: { ...formData.budget!, requested: Number(e.target.value) } })}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/50" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Awarded Amount ($)</label>
                                <input type="number" min="0" value={formData.budget?.awarded || ''} onChange={e => setFormData({ ...formData, budget: { ...formData.budget!, awarded: Number(e.target.value) } })}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/50" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Spent Amount ($)</label>
                                <input type="number" min="0" value={formData.budget?.spent || ''} onChange={e => setFormData({ ...formData, budget: { ...formData.budget!, spent: Number(e.target.value) } })}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500/50" />
                            </div>
                        </div>
                    </div>

                    <hr className="   border-[#1f2937]" />

                    {/* Requirements */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider flex items-center gap-2">
                            <ListTodo className="w-4 h-4 text-amber-400" /> Requirements Checklist
                        </h3>
                        <div className="p-4 bg-zinc-900/50 border    border-[#1f2937] rounded-xl space-y-3">
                            {formData.requirements?.map((req, i) => (
                                <div key={req.id} className="flex items-center gap-2 p-2 bg-zinc-900 border    border-[#1f2937] rounded-lg">
                                    <CheckSquare className="w-4 h-4 text-zinc-600" />
                                    <span className="text-sm text-zinc-300 flex-1">{req.description}</span>
                                    <button type="button" onClick={() => removeReq(req.id)} className="p-1 hover:text-red-400 text-zinc-500 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <input type="text" value={newReq} onChange={e => setNewReq(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addReq())}
                                    className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 placeholder:text-zinc-600"
                                    placeholder="Add a new requirement (e.g. Budget justification doc)..." />
                                <button type="button" onClick={addReq} disabled={!newReq.trim()}
                                    className="px-3 py-2 bg-[#3B82F6]/20 hover:bg-[#3B82F6]/30 text-[#3B82F6] rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

                <div className="p-5 border-t border-white/10 flex justify-end gap-3 bg-zinc-900/30">
                    <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-sm text-zinc-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button type="submit" form="grant-form" className="px-5 py-2 bg-[#3B82F6] hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors  ">
                        {grant ? 'Save Changes' : 'Create Grant'}
                    </button>
                </div>
            </div>
        </div>
    );
}

