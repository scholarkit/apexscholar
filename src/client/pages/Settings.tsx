import { type JSX, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  HardDrive,
  Key,
  Link2,
  Loader2,
  Lock,
  LockOpen,
  Monitor,
  Moon,
  Palette,
  Shield,
  Sun,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  changeE2EEPassphrase,
  disableE2EE,
  enableE2EE,
  getE2EEConfig,
  initE2EE,
  isE2EEEnabled,
  migrateDataToE2EE,
  unlockE2EE,
} from '../lib/e2ee';
import { zoteroService } from '../lib/zotero';
import { kv } from '../lib/kv';
import { storage } from '../lib/storage';
import { type Theme, useTheme } from '../contexts/ThemeContext';
import { changePassphraseSchema, enableE2EESchema } from '../lib/schemas';
import { journalService } from '../lib/journal';
import { resourcesService } from '../lib/resources';
import { projectService } from '../lib/projects';
import { brainService } from '../lib/brain';

interface FolderStat {
  name: string;
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const MODULES = [
  {
    id: 'appearance',
    name: 'Appearance',
    description: 'Choose light, dark, or system theme',
    icon: <Palette className="w-6 h-6" />,
    color: 'violet',
  },
  {
    id: 'encryption',
    name: 'End-to-End Encryption',
    description: 'Protect your research with client-side encryption',
    icon: <Shield className="w-6 h-6" />,
    color: 'indigo',
  },
  {
    id: 'integrations',
    name: 'Integrations',
    description: 'Connect Zotero and other third-party tools',
    icon: <Link2 className="w-6 h-6" />,
    color: 'blue',
  },
  {
    id: 'data',
    name: 'Data Management',
    description: 'Export and import your research backups',
    icon: <Database className="w-6 h-6" />,
    color: 'emerald',
  },
  {
    id: 'storage',
    name: 'Storage Usage',
    description: 'Monitor your Supabase cloud storage quota',
    icon: <HardDrive className="w-6 h-6" />,
    color: 'teal',
  },

  {
    id: 'danger',
    name: 'Danger Zone',
    description: 'Permanently reset all your data',
    icon: <AlertTriangle className="w-6 h-6" />,
    color: 'rose',
  },
];

export default function Settings() {
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme: currentTheme, setTheme } = useTheme();

  // Storage usage
  const [storageTotal, setStorageTotal] = useState<number | null>(null);
  const [storageFolders, setStorageFolders] = useState<FolderStat[]>([]);
  const [loadingStorage, setLoadingStorage] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  // E2EE State
  const [e2eeStatus, setE2EEStatus] = useState<'initializing' | 'enabled' | 'disabled'>(
    'initializing'
  );
  const [e2eeUnlocked, setE2eeUnlocked] = useState(false);
  const [e2eePassphrase, setE2eePassphrase] = useState('');
  const [e2eeConfirm, setE2eeConfirm] = useState('');
  const [e2eeError, setE2EEError] = useState<string | null>(null);
  const [e2eeMigrating, setE2eeMigrating] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [changePass, setChangePass] = useState<{ old: string; new: string } | null>(null);

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

  // Check if Zotero is already connected
  useEffect(() => {
    kv.get('zotero_credentials').then((creds) => {
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

  const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024;

  useEffect(() => {
    (async () => {
      try {
        const uploadPath = 'uploads';
        const rootItems = await storage.readdir(uploadPath);
        const topFiles = rootItems.filter((i: any) => !i.is_dir);
        let rootFilesSize = 0;
        for (const f of topFiles) {
          rootFilesSize += f.size ?? 0;
        }
        setStorageTotal(rootFilesSize);
      } catch (err: any) {
        console.error('Storage scan failed', err);
        setStorageError('Could not read storage. Check Supabase permissions.');
      } finally {
        setLoadingStorage(false);
      }
    })();
  }, []);

  const handleBackup = async () => {
    try {
      const [entries, resources, projects, insights, kanban, chats] = await Promise.all([
        journalService.getEntries(),
        resourcesService.listAll(),
        projectService.getProjects(),
        kv.get('research_insights'),
        kv.get('research_kanban'),
        brainService.listChats().catch(() => []),
      ]);

      // Fetch messages for each brain chat
      const brainChats = await Promise.all(
        (chats || []).map(async (chat) => {
          try {
            const messages = await brainService.listMessages(chat.id);
            return { ...chat, messages: messages || [] };
          } catch {
            return { ...chat, messages: [] };
          }
        })
      );

      const backup = {
        entries: entries || [],
        resources: resources || [],
        projects: projects || [],
        insights: insights || [],
        kanban: kanban || [],
        brain: brainChats,
        exportedAt: new Date().toISOString(),
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

  const [restoring, setRestoring] = useState(false);

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !confirm(
        'Restore this backup? This will import all data from the backup. Duplicate entries may be created if data already exists.'
      )
    ) {
      e.target.value = '';
      return;
    }
    setRestoring(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const errors: string[] = [];

      // 1. Restore projects first to build old→new ID mapping
      const projectIdMap = new Map<string, string>();
      if (backup.projects?.length) {
        for (const proj of backup.projects) {
          try {
            const { id: oldId, owner_id, created_at, ...rest } = proj;
            const created = await projectService.createProject({
              name: rest.name,
              description: rest.description,
              tags: rest.tags,
              startDate: rest.start_date,
            });
            if (oldId && created.id) {
              projectIdMap.set(oldId, created.id);
            }
          } catch {
            errors.push(`Project: ${proj.name}`);
          }
        }
      }

      // Helper to remap a project_id
      const remap = (oldId?: string) =>
        oldId ? projectIdMap.get(oldId) || oldId : undefined;

      // 2. Restore journal entries with remapped project_ids
      if (backup.entries?.length) {
        for (const entry of backup.entries) {
          try {
            const { id, author_id, created_at, updated_at, ...rest } = entry;
            await journalService.createEntry({
              ...rest,
              project_id: remap(rest.project_id),
            });
          } catch {
            errors.push(`Entry: ${entry.type} - ${(entry.content || '').substring(0, 40)}`);
          }
        }
      }

      // 3. Restore resources with remapped project_ids
      if (backup.resources?.length) {
        for (const resource of backup.resources) {
          try {
            const { id, user_id, created_at, updated_at, ...rest } = resource;
            await resourcesService.create({
              ...rest,
              project_id: remap(rest.project_id),
            });
          } catch {
            errors.push(`Resource: ${resource.name}`);
          }
        }
      }

      // 4. Restore brain conversations
      if (backup.brain?.length) {
        for (const chat of backup.brain) {
          try {
            const created = await brainService.createChat(chat.title);
            if (chat.messages?.length) {
              for (const msg of chat.messages) {
                await brainService.addMessage(created.id, msg.role, msg.content);
              }
            }
          } catch {
            errors.push(`Brain chat: ${chat.title}`);
          }
        }
      }

      // 5. Restore KV-only data (insights + kanban) with project_id remapping
      await Promise.all([
        backup.insights && kv.set('research_insights', backup.insights),
        backup.kanban &&
          kv.set(
            'research_kanban',
            backup.kanban.map((t: any) => ({
              ...t,
              projectId: t.projectId ? projectIdMap.get(t.projectId) || t.projectId : t.projectId,
            }))
          ),
        // Legacy KV keys for backward compatibility with old backups
        backup.knowledgebase && kv.set('research_knowledgebase', backup.knowledgebase),
      ]);

      if (errors.length > 0) {
        alert(
          `Backup restored with ${errors.length} skipped item(s):\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n...and ${errors.length - 10} more` : ''}\n\nReloading...`
        );
      } else {
        alert('Backup restored successfully! Reloading...');
      }
      window.location.reload();
    } catch (err) {
      console.error('Restore failed', err);
      alert('Failed to restore backup. Make sure the file is a valid Apex Scholar backup.');
    } finally {
      e.target.value = '';
      setRestoring(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const token = localStorage.getItem('supabase_token');
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Reset failed');
      }

      const result = await res.json();
      if (result.partial) {
        alert(`Reset completed with some errors. ${result.message}`);
      }

      window.location.reload();
    } catch (err: any) {
      console.error('Reset failed', err);
      alert('Failed to reset data: ' + (err.message || 'Unknown error'));
      setResetting(false);
      setResetConfirm(false);
    }
  };

  // ── E2EE Handlers ─────────────────────────────────────
  const handleEnableE2EE = async () => {
    setE2EEError(null);
    const result = enableE2EESchema.safeParse({ passphrase: e2eePassphrase, confirm: e2eeConfirm });
    if (!result.success) {
      setE2EEError(result.error.issues[0]?.message ?? 'Validation failed');
      return;
    }
    try {
      const ok = await enableE2EE(e2eePassphrase);
      if (!ok) throw new Error('Failed to enable E2EE');
      setE2eeMigrating(true);
      const result = await migrateDataToE2EE();
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
      alert(
        'Note: Disabling E2EE will not automatically decrypt your stored data. To recover data, re-enable with the same passphrase, then export and re-import as unencrypted.'
      );
      disableE2EE();
      setE2EEStatus('disabled');
      setE2eeUnlocked(false);
    } catch (err) {
      console.error('Disable failed', err);
    }
  };

  const handleChangePassphrase = async () => {
    if (!changePass) return;
    const result = changePassphraseSchema.safeParse({ oldPassphrase: changePass.old, newPassphrase: changePass.new });
    if (!result.success) {
      alert(result.error.issues[0]?.message ?? 'Validation failed');
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
      const callbackUrl = window.location.origin + window.location.pathname;
      const { token, secret, url } = await zoteroService.getRequestToken(callbackUrl);
      localStorage.setItem('zotero_oauth_secret', secret);
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
      if (!secret)
        throw new Error('OAuth secret not found in local storage. Please try connecting again.');
      const credentials = await zoteroService.getAccessToken(oauthToken, secret, oauthVerifier);
      await kv.set('zotero_credentials', credentials);
      localStorage.removeItem('zotero_oauth_secret');
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
    if (
      !confirm(
        'Are you sure you want to disconnect your Zotero account? Your synced items will remain in Apex Scholar.'
      )
    )
      return;
    try {
      await kv.delete('zotero_credentials');
      setZoteroConnected(false);
    } catch (err) {
      console.error('Failed to disconnect Zotero:', err);
    }
  };

  // ── Module Content Renderers ───────────────────────────
  const renderAppearance = () => {
    const options: {
      value: Theme;
      label: string;
      icon: JSX.Element;
      description: string;
      preview: { bg: string; sidebar: string; text: string; muted: string };
    }[] = [
      {
        value: 'dark',
        label: 'Dark',
        icon: <Moon className="w-4 h-4" />,
        description: 'A sleek dark interface, easy on the eyes.',
        preview: { bg: '#09090b', sidebar: '#0f0f12', text: '#f4f4f5', muted: '#52525b' },
      },
      {
        value: 'light',
        label: 'Light',
        icon: <Sun className="w-4 h-4" />,
        description: 'Clean, bright interface for well-lit environments.',
        preview: { bg: '#f8f8f9', sidebar: '#ffffff', text: '#18181b', muted: '#71717a' },
      },
      {
        value: 'system',
        label: 'System',
        icon: <Monitor className="w-4 h-4" />,
        description: 'Automatically matches your OS setting.',
        preview: { bg: '#18181b', sidebar: '#27272a', text: '#f4f4f5', muted: '#71717a' },
      },
    ];

    return (
      <div className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Choose your preferred color theme. Changes apply instantly and persist across sessions.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {options.map((opt) => {
            const isActive = currentTheme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                  isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'border-[var(--color-border)] hover:border-indigo-500/50'
                }`}
                style={{ background: 'var(--color-surface-2)' }}
              >
                {/* Mini theme preview */}
                <div
                  className="mb-3 rounded-lg overflow-hidden h-20 flex"
                  style={{ background: opt.preview.bg, border: '1px solid rgba(128,128,128,0.15)' }}
                >
                  {/* Mini sidebar */}
                  <div
                    className="w-8 h-full flex flex-col gap-1 p-1"
                    style={{ background: opt.preview.sidebar }}
                  >
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="rounded w-full h-1.5"
                        style={{
                          background: i === 1 ? '#6366f1' : opt.preview.muted,
                          opacity: i === 1 ? 1 : 0.4,
                        }}
                      />
                    ))}
                  </div>
                  {/* Mini content */}
                  <div className="flex-1 p-2 flex flex-col gap-1.5">
                    <div
                      className="rounded h-2 w-2/3"
                      style={{ background: opt.preview.text, opacity: 0.8 }}
                    />
                    <div
                      className="rounded h-1.5 w-full"
                      style={{ background: opt.preview.muted, opacity: 0.3 }}
                    />
                    <div
                      className="rounded h-1.5 w-4/5"
                      style={{ background: opt.preview.muted, opacity: 0.3 }}
                    />
                    <div
                      className="mt-auto rounded h-5 w-16"
                      style={{ background: '#6366f1', opacity: 0.7 }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    {opt.icon}
                    <span className="text-sm font-semibold">{opt.label}</span>
                  </div>
                  {isActive && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Module Content Renderers ───────────────────────────
  const renderEncryption = () => (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Protect your research data with client-side encryption. Only you can access it.
      </p>
      {e2eeStatus === 'initializing' ? (
        <div className="flex items-center gap-2 text-indigo-300 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Initializing encryption system...</span>
        </div>
      ) : e2eeStatus === 'disabled' ? (
        <div className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">New Passphrase</label>
            <div className="relative">
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={e2eePassphrase}
                onChange={(e) => setE2eePassphrase(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2 bg-[var(--color-surface)] border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Confirm Passphrase
            </label>
            <input
              type={showPassphrase ? 'text' : 'password'}
              value={e2eeConfirm}
              onChange={(e) => setE2eeConfirm(e.target.value)}
              placeholder="Re-enter your passphrase"
              className="w-full px-3 py-2 bg-[var(--color-surface)] border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {e2eeError && <p className="text-sm text-red-400">{e2eeError}</p>}
          <button
            onClick={handleEnableE2EE}
            disabled={e2eeMigrating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {e2eeMigrating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {e2eeMigrating ? 'Encrypting Data...' : 'Enable Encryption'}
          </button>
          <p className="text-xs text-zinc-500">
            Existing data will be automatically encrypted after you set your passphrase.
          </p>
        </div>
      ) : e2eeStatus === 'enabled' ? (
        <div className="space-y-4">
          {e2eeUnlocked ? (
            <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-emerald-300 mb-1">Encryption Active</h3>
                <p className="text-xs text-zinc-300 mb-3">
                  Your data is securely encrypted and only accessible with your passphrase.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setChangePass({ old: '', new: '' })}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs text-zinc-300 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" /> Change Passphrase
                  </button>
                  <button
                    onClick={handleDisableE2EE}
                    className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-medium transition-colors"
                  >
                    <LockOpen className="w-3.5 h-3.5" /> Disable Encryption
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
                    type={showPassphrase ? 'text' : 'password'}
                    value={e2eePassphrase}
                    onChange={(e) => setE2eePassphrase(e.target.value)}
                    placeholder="Enter your encryption passphrase"
                    className="w-full px-3 py-2 bg-[var(--color-surface)] border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlockE2EE()}
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
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Unlock className="w-4 h-4" /> Unlock Vault
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Change Passphrase Modal */}
      {changePass && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] border border-zinc-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Change Passphrase</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Current Passphrase
                </label>
                <input
                  type="password"
                  value={changePass.old}
                  onChange={(e) => setChangePass({ ...changePass, old: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  New Passphrase
                </label>
                <input
                  type="password"
                  value={changePass.new}
                  onChange={(e) => setChangePass({ ...changePass, new: e.target.value })}
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
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Connect Zotero and other research tools to bring your library into Apex Scholar.
      </p>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[var(--color-surface)]/50 rounded-xl border border-[var(--color-border)]">
        <div>
          <h3 className="text-sm font-medium mb-1">Zotero</h3>
          <p className="text-xs text-zinc-400">
            Connect your Zotero account to sync your research libraries and collections.
          </p>
          {zoteroError && <p className="text-xs text-red-400 mt-2">{zoteroError}</p>}
        </div>
        {zoteroConnected ? (
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium">
              <CheckCircle2 className="w-4 h-4" /> Connected
            </div>
            <button
              onClick={handleDisconnectZotero}
              className="px-3 py-1.5 bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-xs font-medium transition-colors hover:cursor-pointer"
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
            {zoteroConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            {zoteroConnecting ? 'Connecting...' : 'Connect Account'}
          </button>
        )}
      </div>
    </div>
  );

  const renderData = () => (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Export your entire workspace as a JSON backup, or restore from a previous backup.
      </p>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[var(--color-surface)]/50 rounded-xl border border-[var(--color-border)]">
        <div>
          <h3 className="text-sm font-medium mb-1">Export Backup</h3>
          <p className="text-xs text-zinc-400">
            Download a JSON file containing all your entries, resources, projects, brain
            conversations, insights, and kanban tasks.
          </p>
        </div>
        <button
          onClick={handleBackup}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-[var(--color-border)] rounded-xl text-sm font-medium transition-colors flex-shrink-0"
        >
          <Download className="w-4 h-4" /> Export Backup
        </button>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[var(--color-surface)]/50 rounded-xl border border-[var(--color-border)]">
        <div>
          <h3 className="text-sm font-medium mb-1">Import Backup</h3>
          <p className="text-xs text-zinc-400">
            Import data from a previously exported JSON backup file. Projects will be re-created
            with entries and resources mapped to them.
          </p>
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
          disabled={restoring}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-500 hover:text-indigo-300 rounded-xl text-sm font-medium transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {restoring ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {restoring ? 'Restoring...' : 'Import Backup'}
        </button>
      </div>
    </div>
  );

  const renderStorage = () => (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Monitor your cloud storage consumption across your uploads.
      </p>
      {loadingStorage ? (
        <div className="flex items-center gap-2 text-zinc-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Scanning your Supabase storage…</span>
        </div>
      ) : storageError ? (
        <p className="text-sm text-red-400 py-2">{storageError}</p>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">{formatBytes(storageTotal ?? 0)}</span>
              <span className="text-xs text-zinc-500">
                of {formatBytes(STORAGE_LIMIT_BYTES)} used
              </span>
            </div>
            <div className="w-full h-2.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-600 to-emerald-400"
                style={{
                  width: `${Math.min(100, ((storageTotal ?? 0) / STORAGE_LIMIT_BYTES) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-zinc-600">
              {(((storageTotal ?? 0) / STORAGE_LIMIT_BYTES) * 100).toFixed(2)}% of your free-tier
              quota
            </p>
          </div>
          {storageFolders.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Breakdown by folder
              </p>
              {storageFolders.map((f) => {
                const pct = storageTotal! > 0 ? (f.size / storageTotal!) * 100 : 0;
                return (
                  <div key={f.name} className="flex items-center gap-3">
                    <FolderOpen className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-400 truncate max-w-[60%]">
                          /{f.name}
                        </span>
                        <span className="text-xs text-zinc-300 font-medium">
                          {formatBytes(f.size)}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500/60 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-600 w-8 text-right flex-shrink-0">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderDanger = () => (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        These actions are irreversible. Please be absolutely certain before proceeding.
      </p>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-rose-500/5 rounded-xl border border-rose-500/15">
        <div>
          <h3 className="text-sm font-medium mb-1">Reset All Data</h3>
          <p className="text-xs text-zinc-400">
            Permanently delete all entries, resources, projects, funding, kanban, insights, and
            knowledgebase.
          </p>
        </div>
        {!resetConfirm ? (
          <button
            onClick={() => setResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" /> Reset All Data
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
            <p className="text-xs text-rose-300 font-medium sm:max-w-[160px] text-center">
              Are you absolutely sure? This is irreversible.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setResetConfirm(false)}
                disabled={resetting}
                className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-[var(--color-border)] text-zinc-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {resetting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {resetting ? 'Resetting…' : 'Yes, Reset'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const moduleContent: Record<string, () => JSX.Element> = {
    appearance: renderAppearance,
    encryption: renderEncryption,
    integrations: renderIntegrations,
    data: renderData,
    storage: renderStorage,
    danger: renderDanger,
  };

  const activeModuleInfo = MODULES.find((m) => m.id === activeModule);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32 lg:pb-8">
      <header className="flex items-center gap-3">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none will-change-transform" style={{ contain: 'strict' }} />
        {activeModule && (
          <button
            onClick={() => setActiveModule(null)}
            className="p-2 text-zinc-400 hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-semibold mb-2">
            {activeModuleInfo ? activeModuleInfo.name : 'Settings'}
          </h1>
          <p className="text-base text-zinc-400">
            {activeModuleInfo
              ? activeModuleInfo.description
              : 'Manage your Apex Scholar data and preferences.'}
          </p>
        </div>
      </header>

      {activeModule ? (
        /* ── Module Detail View ── */
        <div
          className={`bg-[var(--color-surface)]/40 border ${activeModule === 'danger' ? 'border-rose-500/20' : activeModule === 'encryption' ? 'border-indigo-500/20' : 'border-[var(--color-border)]'} rounded-xl p-4 sm:p-6`}
        >
          {moduleContent[activeModule]?.()}
        </div>
      ) : (
        /* ── Module Grid ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODULES.map((module) => (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className={`rounded-xl bg-[var(--color-surface)] border shadow-sm group p-6 transition-all text-left relative overflow-hidden ${module.id === 'danger' ? 'border-rose-500/20 hover:border-rose-500/40' : 'border-[var(--color-border)] hover:border-indigo-500/30'}`}
            >
              <div
                className={`absolute top-0 right-0 w-24 h-24 bg-${module.color}-500/5 blur-2xl rounded-full -mr-8 -mt-8 pointer-events-none will-change-transform`}
                style={{ contain: 'strict' }}
              />
              <div className="flex items-center sm:items-start justify-between gap-2 mb-4 relative z-10">
                <div
                  className={`p-3 bg-${module.color}-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300`}
                >
                  <div
                    className={
                      module.color === 'blue'
                        ? 'text-blue-400'
                        : module.color === 'emerald'
                          ? 'text-emerald-400'
                          : module.color === 'teal'
                            ? 'text-teal-400'
                            : module.color === 'purple'
                              ? 'text-purple-400'
                              : module.color === 'rose'
                                ? 'text-rose-400'
                                : 'text-indigo-400'
                    }
                  >
                    {module.icon}
                  </div>
                </div>
                <h3 className="sm:hidden text-base sm:text-lg font-semibold mb-1 sm:mb-2 relative z-10 mr-auto">
                  {module.name}
                </h3>

                <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
              </div>
              <h3 className="text-base hidden sm:block sm:text-lg font-semibold mb-1 sm:mb-2 relative z-10">
                {module.name}
              </h3>
              <p className="hidden sm:block text-sm text-zinc-500 leading-relaxed relative z-10">
                {module.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
