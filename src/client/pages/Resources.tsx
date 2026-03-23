import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, File, Trash2, Search, FolderOpen, Quote, MessagesSquare, ExternalLink, Database, BookMarked, Library, Folder, CheckCircle2, Download, Book, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { storage } from '../lib/storage';
import CitationModal from '../components/CitationModal';
import FileChatModal from '../components/FileChatModal';
import { useProject } from '../contexts/ProjectContext';
import Breadcrumbs from '../components/Breadcrumbs';
import ZoteroImportModal from '../components/ZoteroImportModal';
import { resourcesService, type Resource } from '../lib/resources';

export default function Resources() {
  const { activeProject } = useProject();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [citingResource, setCitingResource] = useState<Resource | null>(null);
  const [chattingWith, setChattingWith] = useState<Resource | null>(null);
  const [showZoteroModal, setShowZoteroModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const UPLOADS_DIR = 'resources/uploads';

  useEffect(() => {
    fetchResources();
  }, [activeProject]);

  const fetchResources = async () => {
    if (!activeProject) {
      setLoading(false);
      return;
    }

    let projectResources: Resource[] = [];
    try {
      projectResources = await resourcesService.listForProject(activeProject.id);
    } catch (err) {
      console.error('Failed to fetch resources', err);
    }

    setResources(projectResources.sort((a: Resource, b: Resource) =>
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
    ));

    // Get download URLs for only project resources
    const urls: Record<string, string> = {};
    for (const res of projectResources) {
      if (res.path) {
        try {
          urls[res.id] = await storage.getReadURL(res.path);
        } catch (err) {
          console.error(`Failed to get URL for ${res.name}`, err);
        }
      }
    }
    setDownloadUrls(urls);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const filename = `${Date.now()}-${file.name}`;
      const path = `${UPLOADS_DIR}/${filename}`;

      // Upload to Storage (handles both Supabase and Puter)
      await storage.write(path, file);

      // Save metadata
      const resource: Partial<Resource> = {
        project_id: activeProject?.id,
        name: file.name,
        source: 'apexscholar',
        // source_id: id,
        type: file.type,
        path,
        created_at: new Date().toISOString()
      };

      await resourcesService.create(resource);

      fetchResources();
    } catch (error) {
      console.error('Upload failed', error);
      alert(`Failed to upload file to Storage`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      if (path) {
        await storage.delete(path);
      }

      await resourcesService.delete(id);

      fetchResources();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete resource');
    }
  };

  const getIcon = (type: string) => {
    const classes = "w-4 h-4 text-indigo-400";
    if (type.includes('book')) return <Book className={classes} />;
    if (type.includes('webpage')) return <Globe className={classes} />;
    if (type.includes('pdf')) return <FileText className={classes} />;
    if (type.includes('image')) return <ImageIcon className={classes} />;
    if (type.includes('text')) return <FileText className={classes} />;
    return <File className="w-4 h-4 text-zinc-400" />;
  };

  const filteredResources = resources.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-zinc-500 font-medium">Loading resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32 lg:pb-8">
      <Breadcrumbs />
      <header className="flex flex-col sm:flex-row items-center justify-between">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div>
          <h1 className="text-2xl font-semibold">Resource Library</h1>
          <p className="text-base text-zinc-400">Manage your PDFs, images, and text files.</p>
        </div>
        <div className="w-full sm:w-fit flex flex-col sm:flex-row gap-3 mt-2 sm:mt-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full sm:w-64"
            />
          </div>
          <button
            onClick={() => setShowZoteroModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl font-medium transition-colors"
          >
            <BookMarked className="w-4 h-4" />
            Import from Zotero
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept=".pdf,.txt,.png,.jpg,.jpeg,.md"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredResources.length === 0 ? (
          <div className="col-span-full text-center py-10 sm:py-20 border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/20">
            <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No resources found</h3>
            <p className="text-zinc-500 mb-6 max-w-sm mx-auto">Upload your first research paper, dataset, or image to get started.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-[var(--color-border)] rounded-xl font-medium transition-colors hover:cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
          </div>
        ) : (
          <table className="col-span-full w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Resource</th>
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Added</th>
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResources.map(resource => (
                <tr key={resource.id} className="group border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface)]/50 transition-colors">
                  {/* Icon + Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        {getIcon(resource.type)}
                      </div>
                      <p className="text-sm font-medium truncate max-w-[200px]" title={resource.name}>
                        {resource.name}
                      </p>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                    {resource.type}
                  </td>

                  {/* Date Added */}
                  <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(resource.created_at || new Date()), { addSuffix: true })}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <a
                        href={resource?.url || resource.metadata?.openUrl || downloadUrls[resource.id] || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-300 hover:bg-indigo-400/10 px-2 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open
                      </a>
                      <button
                        onClick={() => setChattingWith(resource)}
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 px-2 py-1.5 rounded-lg transition-colors"
                        title="Chat with AI about this file"
                      >
                        <MessagesSquare className="w-3.5 h-3.5" />
                        Chat
                      </button>
                      <button
                        onClick={() => setCitingResource(resource)}
                        className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 px-2 py-1.5 rounded-lg transition-colors"
                        title="Cite this resource"
                      >
                        <Quote className="w-3.5 h-3.5" />
                        Cite
                        <span className="text-[10px] ml-0.5 px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-500 font-bold uppercase tracking-wider">
                          Beta
                        </span>
                      </button>
                      <button
                        onClick={() => handleDelete(resource.id, resource.path)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors ml-1"
                        title="Delete resource"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {
        citingResource && (
          <CitationModal
            resource={citingResource}
            downloadUrl={downloadUrls[citingResource.id] || ''}
            onClose={() => setCitingResource(null)}
          />
        )
      }

      {
        chattingWith && (
          <FileChatModal
            resource={chattingWith}
            onClose={() => setChattingWith(null)}
          />
        )
      }

      {
        showZoteroModal && (
          <ZoteroImportModal
            onClose={() => setShowZoteroModal(false)}
            onImport={() => {
              fetchResources();
            }}
          />
        )
      }
    </div >
  );
}
