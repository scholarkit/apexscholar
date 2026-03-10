import { useRef, useState, useEffect } from 'react';
import { Download, Upload, Activity, Loader2, HardDrive, FolderOpen, Trash2, AlertTriangle, Lock, Shield, Key, Eye, EyeOff, Unlock, LockOpen, Link2, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { puterService, initE2EE, enableE2EE, unlockE2EE, disableE2EE, isE2EEEnabled, getE2EEConfig, migrateDataToE2EE, changeE2EEPassphrase } from '../lib/puter';
import { zoteroService } from '../lib/zotero';

interface FolderStat { name: string; size: number; }

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function sumDir(path: string): Promise<number> {
    try {
        const puter = (window as any).puter;
        const items: any[] = await puter.fs.readdir(path);
        let total = 0;
        await Promise.all(
            items.map(async (item: any) => {
                if (item.is_dir) {
                    total += await sumDir(`${path}/${item.name}`);
                } else {
                    try {
                        const stat = await puter.fs.stat(`${path}/${item.name}`);
                        total += stat?.size ?? item.size ?? 0;
                    } catch {
                        total += item.size ?? 0;
                    }
                }
            })
        );
        return total;
    } catch {
        return 0;
    }
}

export default function Settings() {
    const restoreInputRef = useRef<HTMLInputElement>(null);
    const [resetConfirm, setResetConfirm] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [usage, setUsage] = useState<any>(null);
    const [detailedUsage, setDetailedUsage] = useState<any>(null);
    const [loadingUsage, setLoadingUsage] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();

    // Storage usage
    const [storageTotal, setStorageTotal] = useState<number | null>(null);
    const [storageFolders, setStorageFolders] = useState<FolderStat[]>([]);
    const [loadingStorage, setLoadingStorage] = useState(true);
    const [storageError, setStorageError] = useState<string | null>(null);

    // E2EE State
    const [e2eeStatus, setE2EEStatus] = useState<'initializing' | 'enabled' | 'disabled'>('initializing');
    const [e2eeUnlocked, setE2eeUnlocked] = useState(false);
    const [e2eePassphrase, setE2eePassphrase] = useState('');
    const [e2eeConfirm, setE2eeConfirm] = useState('');
    const [e2eeError, setE2EEError] = useState<string | null>(null);
    const [e2eeMigrating, setE2eeMigrating] = useState(false);
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [changePass, setChangePass] = useState<{ old: string, new: string } | null>(null);

    // Zotero State
    const [zoteroConnected, setZoteroConnected] = useState(false);
    const [zoteroConnecting, setZoteroConnecting] = useState(false);
    const [zoteroError, setZoteroError] = useState<string | null>(null);

    // Initialize E2EE on mount
    useEffect(() => {
        const setupE2EE = async () => {
            try {
                await initE2EE();
                const config = getE2EEConfig();
                if (config.enabled) {
                    setE2EEStatus('enabled');
                    // Check if we have the key in memory (unlocked)
                    if (isE2EEEnabled()) {
                        setE2eeUnlocked(true);
                    } else {
                        setE2eeUnlocked(false);
                    }
                } else {
                    setE2EEStatus('disabled');
                }
            } catch (err) {
                console.error('E2EE init failed', err);
                setE2EEError('Failed to initialize encryption');
            }
        };
        setupE2EE();
    }, []);

    // Also check if Zotero is already connected
    useEffect(() => {
        puterService.kvGet('zotero_credentials').then(creds => {
            if (creds && creds.apiKey && creds.userId) {
                setZoteroConnected(true);
            }
        });
    }, []);

    // Handle OAuth Callback
    useEffect(() => {
        const oauthToken = searchParams.get('oauth_token');
        const oauthVerifier = searchParams.get('oauth_verifier');

        if (oauthToken && oauthVerifier) {
            handleZoteroCallback(oauthToken, oauthVerifier);
        }
    }, [searchParams]);

    // Puter free tier is 1 GB
    const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024;

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

    useEffect(() => {
        (async () => {
            try {
                const puter = (window as any).puter;
                // List top-level dirs in root
                const rootItems: any[] = await puter.fs.readdir('research-dashboard/uploads');
                const topFiles = rootItems.filter((i: any) => !i.is_dir);
                let rootFilesSize = 0;
                for (const f of topFiles) {
                    try {
                        rootFilesSize += f.size ?? 0;
                    } catch {
                        rootFilesSize += f.size ?? 0;
                    }
                }
                setStorageTotal(rootFilesSize);
            } catch (err: any) {
                console.error('Storage scan failed', err);
                setStorageError('Could not read storage. Check Puter FS permissions.');
            } finally {
                setLoadingStorage(false);
            }
        })();
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

    const handleReset = async () => {
        setResetting(true);
        try {
            const ALL_KEYS = [
                'research_entries',
                'research_resources',
                'research_insights',
                'research_knowledgebase',
                'research_kanban',
                'research_funding',
                'research_projects',
            ];
            await Promise.all(ALL_KEYS.map(key => puterService.kvSet(key, [])));
            window.location.reload();
        } catch (err) {
            console.error('Reset failed', err);
            setResetting(false);
            setResetConfirm(false);
        }
    };

    // ── E2EE Handlers ─────────────────────────────────────
    const handleEnableE2EE = async () => {
        setE2EEError(null);
        if (e2eePassphrase.length < 8) {
            setE2EEError('Passphrase must be at least 8 characters');
            return;
        }
        if (e2eePassphrase !== e2eeConfirm) {
            setE2EEError('Passphrases do not match');
            return;
        }
        try {
            const ok = await enableE2EE(e2eePassphrase);
            if (!ok) throw new Error('Failed to enable E2EE');
            // Migrate existing data to encrypted format
            setE2eeMigrating(true);
            const result = await migrateDataToE2EE();
            console.log('E2EE migration complete:', result);
            setE2eeMigrating(false);
            setE2EEStatus('enabled');
            setE2eeUnlocked(true);
            setE2eePassphrase('');
            setE2eeConfirm('');
            alert(`Encryption enabled! ${result.success} items secured.`);
        } catch (err: any) {
            setE2EEError(err.message || 'Failed to enable encryption');
            setE2eeMigrating(false);
        }
    };

    const handleUnlockE2EE = async () => {
        setE2EEError(null);
        if (!e2eePassphrase) {
            setE2EEError('Enter your passphrase');
            return;
        }
        try {
            const ok = await unlockE2EE(e2eePassphrase);
            if (!ok) throw new Error('Incorrect passphrase');
            setE2eeUnlocked(true);
            setE2eePassphrase('');
        } catch (err: any) {
            setE2EEError(err.message || 'Failed to unlock');
        }
    };

    const handleDisableE2EE = async () => {
        if (!confirm('Disabling encryption will leave your data unprotected. Are you sure?')) return;
        try {
            // Note: Disabling E2EE does NOT decrypt existing data automatically.
            // User should first decrypt data by re-enabling with same key, then disable.
            // For simplicity, we'll just disable the flag - data will remain unreadable.
            // Better UX: Suggest user to export backup, disable, then re-import (which will store unencrypted).
            alert('Note: Disabling E2EE will not automatically decrypt your stored data. To recover data, re-enable with the same passphrase, then export and re-import as unencrypted.');
            disableE2EE();
            setE2EEStatus('disabled');
            setE2eeUnlocked(false);
        } catch (err) {
            console.error('Disable failed', err);
        }
    };

    const handleChangePassphrase = async () => {
        if (!changePass) return;
        if (changePass.new.length < 8) {
            alert('New passphrase must be at least 8 characters');
            return;
        }
        try {
            const ok = await changeE2EEPassphrase(changePass.old, changePass.new);
            if (!ok) throw new Error('Failed to change passphrase');
            setChangePass(null);
            alert('Passphrase changed successfully');
        } catch (err: any) {
            alert('Failed: ' + err.message);
        }
    };

    // ── Zotero Handlers ─────────────────────────────────────
    const handleConnectZotero = async () => {
        setZoteroConnecting(true);
        setZoteroError(null);
        try {
            // Get the current URL to return to after authorization
            const callbackUrl = window.location.origin + window.location.pathname;

            // Get request token
            const { token, secret, url } = await zoteroService.getRequestToken(callbackUrl);

            // Store token secret temporarily in localStorage for the callback phase
            localStorage.setItem('zotero_oauth_secret', secret);

            // Redirect user to Zotero authorization page
            window.location.href = url;

        } catch (err: any) {
            console.error('Failed to initiate Zotero connection:', err);
            setZoteroError('Failed to connect to Zotero. Check API credentials.');
            setZoteroConnecting(false);
        }
    };

    const handleZoteroCallback = async (oauthToken: string, oauthVerifier: string) => {
        setZoteroConnecting(true);
        setZoteroError(null);
        try {
            const secret = localStorage.getItem('zotero_oauth_secret');
            if (!secret) {
                throw new Error('OAuth secret not found in local storage. Please try connecting again.');
            }

            // Exchange for access token
            const credentials = await zoteroService.getAccessToken(oauthToken, secret, oauthVerifier);

            // Save securely
            await puterService.kvSet('zotero_credentials', credentials);

            // Clean up
            localStorage.removeItem('zotero_oauth_secret');

            // Clear search params from URL safely without causing full reload
            setSearchParams(new URLSearchParams());

            setZoteroConnected(true);
        } catch (err: any) {
            console.error('Zotero callback error:', err);
            setZoteroError(err.message || 'Failed to complete Zotero authorization.');
        } finally {
            setZoteroConnecting(false);
        }
    };

    const handleDisconnectZotero = async () => {
        if (!confirm('Are you sure you want to disconnect your Zotero account? Your synced items will remain in Apex Scholar.')) return;

        try {
            await puterService.kvDelete('zotero_credentials');
            setZoteroConnected(false);
        } catch (err) {
            console.error('Failed to disconnect Zotero:', err);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white">Settings</h1>
                </div>
                <p className="text-sm sm:text-base text-zinc-400">Manage your Apex Scholar data and preferences.</p>
            </header>

            <div className="space-y-6">
                {/* ── End-to-End Encryption ───────────────────────────── */}
                <section className="bg-zinc-900/40 border border-indigo-500/20 rounded-xl p-3 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-xl font-semibold text-white">End-to-End Encryption</h2>
                    </div>

                    {e2eeStatus === 'initializing' ? (
                        <div className="flex items-center gap-2 text-indigo-300 py-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Initializing encryption system...</span>
                        </div>
                    ) : e2eeStatus === 'disabled' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-zinc-300">
                                Protect your research data with client-side encryption. Only you can access it, even from this app's server.
                            </p>
                            <div className="space-y-3 max-w-md">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">New Passphrase</label>
                                    <div className="relative">
                                        <input
                                            type={showPassphrase ? "text" : "password"}
                                            value={e2eePassphrase}
                                            onChange={e => setE2eePassphrase(e.target.value)}
                                            placeholder="At least 8 characters"
                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassphrase(!showPassphrase)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                        >
                                            {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">Confirm Passphrase</label>
                                    <input
                                        type={showPassphrase ? "text" : "password"}
                                        value={e2eeConfirm}
                                        onChange={e => setE2eeConfirm(e.target.value)}
                                        placeholder="Re-enter your passphrase"
                                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                {e2eeError && <p className="text-sm text-red-400">{e2eeError}</p>}
                                <button
                                    onClick={handleEnableE2EE}
                                    disabled={e2eeMigrating}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {e2eeMigrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                    {e2eeMigrating ? 'Encrypting Data...' : 'Enable Encryption'}
                                </button>
                                <p className="text-xs text-zinc-500">
                                    Existing data will be automatically encrypted after you set your passphrase. This process may take a moment.
                                </p>
                            </div>
                        </div>
                    ) : e2eeStatus === 'enabled' ? (
                        <div className="space-y-4">
                            {e2eeUnlocked ? (
                                <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                    <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-emerald-300 mb-1">Encryption Active</h3>
                                        <p className="text-xs text-zinc-300 mb-3">
                                            Your data is securely encrypted and only accessible with your passphrase. All new data is automatically encrypted.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => setChangePass({ old: '', new: '' })}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs text-zinc-300 transition-colors"
                                            >
                                                <Key className="w-3.5 h-3.5" />
                                                Change Passphrase
                                            </button>
                                            <button
                                                onClick={handleDisableE2EE}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-medium transition-colors"
                                            >
                                                <LockOpen className="w-3.5 h-3.5" />
                                                Disable Encryption
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 max-w-md">
                                    <div className="flex items-start gap-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                        <Lock className="w-4 h-4 text-indigo-400 mt-0.5" />
                                        <p className="text-xs text-zinc-300">
                                            The vault is locked. Enter your passphrase to access your encrypted data.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1">Passphrase</label>
                                        <div className="relative">
                                            <input
                                                type={showPassphrase ? "text" : "password"}
                                                value={e2eePassphrase}
                                                onChange={e => setE2eePassphrase(e.target.value)}
                                                placeholder="Enter your encryption passphrase"
                                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                onKeyDown={e => e.key === 'Enter' && handleUnlockE2EE()}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassphrase(!showPassphrase)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                            >
                                                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    {e2eeError && <p className="text-sm text-red-400">{e2eeError}</p>}
                                    <button
                                        onClick={handleUnlockE2EE}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-colors"
                                    >
                                        <Unlock className="w-4 h-4" />
                                        Unlock Vault
                                    </button>
                                </div>
                            )}

                            {/* Change Passphrase Modal */}
                            {changePass && (
                                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
                                        <h3 className="text-lg font-semibold text-white mb-4">Change Passphrase</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-400 mb-1">Current Passphrase</label>
                                                <input
                                                    type="password"
                                                    value={changePass.old}
                                                    onChange={e => setChangePass({ ...changePass, old: e.target.value })}
                                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-400 mb-1">New Passphrase</label>
                                                <input
                                                    type="password"
                                                    value={changePass.new}
                                                    onChange={e => setChangePass({ ...changePass, new: e.target.value })}
                                                    placeholder="At least 8 characters"
                                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setChangePass(null)}
                                                    className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleChangePassphrase}
                                                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-colors"
                                                >
                                                    Update
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </section>

                {/* ── Integrations ───────────────────────────── */}
                <section className="bg-zinc-900/40 border border-neutral-800 rounded-xl p-3 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Link2 className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-xl font-semibold text-white">Integrations</h2>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-zinc-900/50 rounded-xl border border-neutral-800">
                        <div>
                            <h3 className="text-sm font-medium text-white mb-1">Zotero</h3>
                            <p className="text-xs text-zinc-400">Connect your Zotero account to sync your research libraries and collections.</p>
                            {zoteroError && <p className="text-xs text-red-400 mt-2">{zoteroError}</p>}
                        </div>
                        {zoteroConnected ? (
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Connected
                                </div>
                                <button
                                    onClick={handleDisconnectZotero}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-medium transition-colors"
                                >
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleConnectZotero}
                                disabled={zoteroConnecting}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 rounded-xl text-sm font-medium transition-colors flex-shrink-0 disabled:opacity-50"
                            >
                                {zoteroConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                                {zoteroConnecting ? 'Connecting...' : 'Connect Account'}
                            </button>
                        )}
                    </div>
                </section>

                <section className="bg-zinc-900/40 border    border-neutral-800 rounded-xl p-3 sm:p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Data Management</h2>
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-zinc-900/50 rounded-xl border    border-neutral-800">
                            <div>
                                <h3 className="text-sm font-medium text-white mb-1">Export Backup</h3>
                                <p className="text-xs text-zinc-400">Download a JSON file containing all your entries, resources, insights, kanban, and knowledgebase.</p>
                            </div>
                            <button
                                onClick={handleBackup}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition-colors flex-shrink-0"
                            >
                                <Download className="w-4 h-4" />
                                Export Backup
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-zinc-900/50 rounded-xl border    border-neutral-800">
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
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-500 hover:text-indigo-300 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
                            >
                                <Upload className="w-4 h-4" />
                                Import Backup
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── Storage Usage ──────────────────────────────── */}
                <section className="bg-zinc-900/40 border    border-neutral-800 rounded-xl p-3 sm:p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <HardDrive className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-xl font-semibold text-white">Storage Usage</h2>
                    </div>

                    {loadingStorage ? (
                        <div className="flex items-center gap-2 text-zinc-400 py-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Scanning your Puter storage…</span>
                        </div>
                    ) : storageError ? (
                        <p className="text-sm text-red-400 py-2">{storageError}</p>
                    ) : (
                        <div className="space-y-5">
                            {/* Summary bar */}
                            <div className="space-y-2">
                                <div className="flex items-end justify-between">
                                    <span className="text-2xl font-bold text-white">
                                        {formatBytes(storageTotal ?? 0)}
                                    </span>
                                    <span className="text-xs text-zinc-500">
                                        of {formatBytes(STORAGE_LIMIT_BYTES)} used
                                    </span>
                                </div>
                                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-600 to-emerald-400"
                                        style={{ width: `${Math.min(100, ((storageTotal ?? 0) / STORAGE_LIMIT_BYTES) * 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-zinc-600">
                                    {(((storageTotal ?? 0) / STORAGE_LIMIT_BYTES) * 100).toFixed(2)}% of your free-tier quota
                                </p>
                            </div>

                            {/* Per-folder breakdown */}
                            {storageFolders.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Breakdown by folder</p>
                                    {storageFolders.map(f => {
                                        const pct = storageTotal! > 0 ? (f.size / storageTotal!) * 100 : 0;
                                        return (
                                            <div key={f.name} className="flex items-center gap-3">
                                                <FolderOpen className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-zinc-400 truncate max-w-[60%]">/{f.name}</span>
                                                        <span className="text-xs text-zinc-300 font-medium">{formatBytes(f.size)}</span>
                                                    </div>
                                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500/60 rounded-full"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-zinc-600 w-8 text-right flex-shrink-0">{pct.toFixed(0)}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* ── Monthly Usage ──────────────────────────────── */}
                <section className="bg-zinc-900/40 border    border-neutral-800 rounded-xl p-3 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-indigo-500" />
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
                                    <div className="p-4 rounded-xl border    border-neutral-800 bg-zinc-900/20 flex flex-col gap-3">
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

                {/* ── Danger Zone ──────────────────────────────── */}
                <section className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                        <h2 className="text-xl font-semibold text-rose-400">Danger Zone</h2>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-rose-500/5 rounded-xl border border-rose-500/15">
                        <div>
                            <h3 className="text-sm font-medium text-white mb-1">Reset All Data</h3>
                            <p className="text-xs text-zinc-400">Permanently delete all entries, resources, projects, funding, kanban, insights, and knowledgebase. This cannot be undone.</p>
                        </div>

                        {!resetConfirm ? (
                            <button
                                onClick={() => setResetConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
                            >
                                <Trash2 className="w-4 h-4" />
                                Reset All Data
                            </button>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                                <p className="text-xs text-rose-300 font-medium sm:max-w-[160px] text-center">Are you absolutely sure? This is irreversible.</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setResetConfirm(false)}
                                        disabled={resetting}
                                        className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        disabled={resetting}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                                    >
                                        {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        {resetting ? 'Resetting…' : 'Yes, Reset'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
