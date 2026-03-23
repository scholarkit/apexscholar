import { useState, useEffect } from 'react';
import { X, Library, Folder, CheckCircle2, Download, Loader2, AlertTriangle } from 'lucide-react';
import { storage } from '../lib/storage';
import { type Resource } from '../lib/resources';
import { zoteroService, ZoteroCredentials } from '../lib/zotero';
import { useProject } from '../contexts/ProjectContext';
import { kv } from '../lib/kv';
import { useNavigate } from 'react-router-dom';
import { resourcesService } from '../lib/resources';

const UPLOADS_DIR = 'resources/uploads';


interface ZoteroImportModalProps {
  onClose: () => void;
  onImport: () => void;
}

export default function ZoteroImportModal({ onClose, onImport }: ZoteroImportModalProps) {
  const { activeProject } = useProject();
  const [selectedCollection, setSelectedCollection] = useState<string | null>('library');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);

  const [credentials, setCredentials] = useState<ZoteroCredentials | null>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadZoteroData();
  }, []);

  const loadZoteroData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const creds = await kv.get('zotero_credentials');
      if (!creds || !creds.apiKey || !creds.userId) {
        setError('Please connect your Zotero account in Settings > Integrations.');
        setIsLoading(false);
        return;
      }
      setCredentials(creds);
      const colls = await zoteroService.getCollections(creds);
      setCollections(colls);
    } catch (err: any) {
      console.error('Failed to load Zotero collections', err);
      setError(err.message || 'Failed to load collections from Zotero.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!credentials || !selectedCollection || !activeProject) return;

    setIsImporting(true);
    setError(null);
    setImportProgress('Starting import...');

    try {
      let allItems: any[] = [];
      let start = 0;
      const limit = 100;
      let hasMore = true;

      const syncVersions = await kv.get('zotero_sync_versions') || {};
      const lastVersion = syncVersions[selectedCollection] || null;

      while (hasMore) {
        setImportProgress(`Fetching items (${allItems.length} loaded)...`);
        const batch = await zoteroService.getItems(credentials, selectedCollection, start, limit, lastVersion);

        if (!batch || batch.length === 0) {
          hasMore = false;
        } else {
          allItems = [...allItems, ...batch];
          start += limit;
          if (batch.length < limit) {
            hasMore = false;
          }
        }
      }

      if (allItems.length === 0) {
        alert(`No new items to sync from Zotero since your last import!`);
        onImport();
        onClose();
        return;
      }

      setImportProgress(`Mapping ${allItems.length} new items to Apex Scholar resources...`);
      let maxVersion = lastVersion || 0;

      const resolveTitle = (data) =>
        data.name || data.title || data.shortTitle || data.subject || data.filename || `${data.itemType} — ${data.dateAdded?.substring(0, 10)}`;

      const SKIP_TYPES = ['attachment', 'note', 'annotation'];

      const mapZoteroItem = (item: any): Partial<Resource> | null => {
        const d = item.data;
        if (SKIP_TYPES.includes(d.itemType)) return null;
        if (item.version > maxVersion) maxVersion = item.version;

        const filename = `${Date.now()}-${resolveTitle(d)}`;
        const path = `${UPLOADS_DIR}/${filename}`;

        return {
          project_id: activeProject.id,
          name: resolveTitle(d),
          source: 'zotero',
          path,
          source_id: item.key,
          created_at: new Date().toISOString(),
          abstract: d.abstractNote || null,
          doi: d.DOI || null,
          url: d.url || null,
          year: d.date ? new Date(d.date).getFullYear() : null,
          journal: d.publicationTitle || d.bookTitle || null,
          authors: (d.creators || []).filter(c => c.creatorType === 'author').map(c => `${c.firstName || ''} ${c.lastName || ''}`.trim()),
          type: d.itemType,
          zotero_version: item.version,
          zotero_meta: d,
        };
      };

      const mappedResources: Partial<Resource>[] = allItems.map(mapZoteroItem).filter(Boolean);
      setImportProgress('Saving resources to storage...');

      for (const res of mappedResources) {
        const content = (res as any)._rawContent;
        delete (res as any)._rawContent;
        await storage.write(res.path, content);
        await resourcesService.create(res);
      }

      syncVersions[selectedCollection] = maxVersion;
      await kv.set('zotero_sync_versions', syncVersions);

      alert(`Successfully imported ${mappedResources.length} new items from Zotero!`);
      onImport();
      onClose();
    } catch (err: any) {
      console.error('Import failed', err);
      setError(err.message || 'Failed to import items');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold">Import from Zotero</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-zinc-400">
            Select a collection to import into this workspace.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                Select Collection
              </label>
              <div className="p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl space-y-1 max-h-[240px] overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-6 text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <span className="text-sm">Loading your collections...</span>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-6 text-rose-400">
                    <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm px-4 text-center">{error}</span>
                    <button onClick={() => navigate('/settings')} className="text-indigo-400 hover:text-indigo-300 hover:cursor-pointer">Go to Settings</button>
                  </div>
                ) : (
                  <>
                    {/* Library Root */}
                    <div
                      className={`flex items-center gap-3 text-sm p-2.5 rounded-lg cursor-pointer transition-colors ${selectedCollection === 'library'
                        ? 'bg-indigo-500/10 text-indigo-400'
                        : 'text-[var(--color-text-faint)] hover:bg-white/5'
                        }`}
                      onClick={() => setSelectedCollection('library')}
                    >
                      <Library className="w-4 h-4 shrink-0" />
                      <span className="flex-1 font-medium">My entire Zotero Library</span>
                      {selectedCollection === 'library' && <CheckCircle2 className="w-4 h-4" />}
                    </div>

                    {/* Dynamic Collections */}
                    {collections.map((col: any) => {
                      // Extract collection data
                      const id = col.data.key;
                      const name = col.data.name;
                      const isSelected = selectedCollection === id;

                      return (
                        <div
                          key={id}
                          className={`flex items-center gap-3 text-sm pl-8 p-2.5 rounded-lg cursor-pointer transition-colors ${isSelected
                            ? 'bg-indigo-500/10 text-indigo-400'
                            : 'text-[var(--color-text-faint)] hover:bg-white/5'
                            }`}
                          onClick={() => setSelectedCollection(id)}
                        >
                          <Folder className="w-4 h-4 shrink-0" />
                          <span className="flex-1 truncate">{name}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            {/* <p className="text-xs text-zinc-500">
              Imported resources will preserve the Zotero data model (Tags, Authors, Abstract, etc.)
            </p> */}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]/50">
          <div className="text-xs text-indigo-400 font-medium">
            {importProgress}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedCollection || isImporting || isLoading || !!error}
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {isImporting ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
