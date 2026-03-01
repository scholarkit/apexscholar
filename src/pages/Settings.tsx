import { useRef, useState, useEffect } from 'react';
import { Download, Upload, Activity, Loader2 } from 'lucide-react';
import { puterService } from '../lib/puter';

export default function Settings() {
    const restoreInputRef = useRef<HTMLInputElement>(null);
    const [usage, setUsage] = useState<any>(null);
    const [detailedUsage, setDetailedUsage] = useState<any>(null);
    const [loadingUsage, setLoadingUsage] = useState(true);

    useEffect(() => {
        puterService.getMonthlyUsage().then(async data => {
            setUsage(data);
            if (data?.appTotals) {
                const appId = Object.keys(data.appTotals).find(k => k !== 'others');
                if (appId) {
                    try {
                        const detailed = await puterService.getDetailedAppUsage(appId);
                        setDetailedUsage(detailed);
                    } catch (e) {
                        console.error('Failed to fetch detailed usage', e);
                    }
                }
            }
            setLoadingUsage(false);
        }).catch(err => {
            console.error('Failed to fetch usage', err);
            setLoadingUsage(false);
        });
    }, []);

    const handleBackup = async () => {
        try {
            const [entries, resources, insights, knowledgebase, kanban] = await Promise.all([
                puterService.kvGet('research_entries'),
                puterService.kvGet('research_resources'),
                puterService.kvGet('research_insights'),
                puterService.kvGet('research_knowledgebase'),
                puterService.kvGet('research_kanban'),
            ]);
            const backup = {
                entries: entries || [],
                resources: resources || [],
                insights: insights || [],
                knowledgebase: knowledgebase || [],
                kanban: kanban || [],
                exportedAt: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `apex-scholar-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Backup failed', err);
            alert('Failed to create backup.');
        }
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm('Restore this backup? This will overwrite your current data.')) {
            e.target.value = '';
            return;
        }
        try {
            const text = await file.text();
            const backup = JSON.parse(text);
            await Promise.all([
                backup.entries && puterService.kvSet('research_entries', backup.entries),
                backup.resources && puterService.kvSet('research_resources', backup.resources),
                backup.insights && puterService.kvSet('research_insights', backup.insights),
                backup.knowledgebase && puterService.kvSet('research_knowledgebase', backup.knowledgebase),
                backup.kanban && puterService.kvSet('research_kanban', backup.kanban),
            ]);
            alert('Backup restored! Reloading...');
            window.location.reload();
        } catch (err) {
            console.error('Restore failed', err);
            alert('Failed to restore backup. Make sure the file is a valid Apex Scholar backup.');
        } finally {
            e.target.value = '';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white">Settings</h1>
                </div>
                <p className="text-xs sm:text-base text-zinc-400">Manage your Apex Scholar data and preferences.</p>
            </header>

            <div className="space-y-6">
                <section className="bg-zinc-900/40 border border-white/5 rounded-2xl p-3 sm:p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Data Management</h2>
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                            <div>
                                <h3 className="text-sm font-medium text-white mb-1">Export Backup</h3>
                                <p className="text-xs text-zinc-400">Download a JSON file containing all your entries, resources, insights, kanban, and knowledgebase.</p>
                            </div>
                            <button
                                onClick={handleBackup}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors flex-shrink-0"
                            >
                                <Download className="w-4 h-4" />
                                Export Backup
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                            <div>
                                <h3 className="text-sm font-medium text-white mb-1">Import Backup</h3>
                                <p className="text-xs text-zinc-400">Restore your data from a previously exported JSON backup file. This will overwrite current data.</p>
                            </div>
                            <input
                                ref={restoreInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleRestore}
                                className="hidden"
                            />
                            <button
                                onClick={() => restoreInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                            >
                                <Upload className="w-4 h-4" />
                                Import Backup
                            </button>
                        </div>
                    </div>
                </section>

                <section className="bg-zinc-900/40 border border-white/5 rounded-2xl p-3 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-xl font-semibold text-white">Monthly Usage</h2>
                    </div>
                    {loadingUsage ? (
                        <div className="flex items-center gap-2 text-zinc-400 py-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Loading usage data...</span>
                        </div>
                    ) : usage ? (
                        <div className="space-y-6">
                            {/* Apex Scholar Specific Usage */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {usage.appTotals && Object.entries(usage.appTotals).map(([id, data]: [string, any]) => {
                                    const isApex = id !== 'others';
                                    if (!isApex) return null;
                                    return (
                                        <div key={id} className={`p-4 rounded-xl border bg-indigo-500/10 border-indigo-500/20 flex flex-col gap-1`}>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                                                Apex Scholar Usage
                                            </span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-bold text-white">{data?.total?.toLocaleString() || 0}</span>
                                                <span className="text-xs text-zinc-400">Total Credits</span>
                                            </div>
                                            <span className="text-xs text-zinc-500">{data?.count?.toLocaleString() || 0} total requests</span>
                                        </div>
                                    );
                                })}

                                {/* Allowance Info */}
                                {usage.allowanceInfo && (
                                    <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/20 flex flex-col gap-3">
                                        <div className="flex justify-between items-end">
                                            <h3 className="text-sm font-medium text-white">Monthly Resource Allowance</h3>
                                            <span className="text-xs text-zinc-400">
                                                {Math.round(((usage.allowanceInfo.monthUsageAllowance - usage.allowanceInfo.remaining) / usage.allowanceInfo.monthUsageAllowance) * 100)}% Consumed
                                            </span>
                                        </div>
                                        <div className="w-full bg-zinc-800 rounded-full h-2">
                                            <div
                                                className="bg-indigo-500 h-2 rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${Math.min(100, Math.max(0, ((usage.allowanceInfo.monthUsageAllowance - usage.allowanceInfo.remaining) / usage.allowanceInfo.monthUsageAllowance) * 100))}%`
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-zinc-500">
                                            <span>Total Used: {(usage.allowanceInfo.monthUsageAllowance - usage.allowanceInfo.remaining).toLocaleString()} units</span>
                                            <span>Monthly Limit: {usage.allowanceInfo.monthUsageAllowance.toLocaleString()} units</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500 py-4">Usage data not available.</p>
                    )}
                </section>
            </div>
        </div>
    );
}
