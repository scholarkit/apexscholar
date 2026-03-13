import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, File, Trash2, Search, FolderOpen, Quote, MessagesSquare, ExternalLink, Database, BookMarked, Library, Folder, CheckCircle2, Download, Book, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Resource, puterService } from '../lib/puter';
import CitationModal from '../components/CitationModal';
import FileChatModal from '../components/FileChatModal';
import { useProject } from '../contexts/ProjectContext';
import Breadcrumbs from '../components/Breadcrumbs';
import ZoteroImportModal from '../components/ZoteroImportModal';

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

  const UPLOADS_DIR = 'research-dashboard/uploads';

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    if (!activeProject) {
      setLoading(false);
      return;
    }
    const data = await puterService.kvGet('research_resources') || [];
    const projectResources = data.filter((r: Resource) => r.projectId === activeProject.id);
    setResources(projectResources.sort((a: Resource, b: Resource) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime()));

    // Get download URLs for only project resources
    const urls: Record<string, string> = {};
    for (const res of projectResources) {
      try {
        urls[res.id] = await puterService.fsGetURL(res.path);
      } catch (err) {
        console.error(`Failed to get URL for ${res.name}`, err);
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
      const id = Math.random().toString(36).substring(7);
      const filename = `${Date.now()}-${file.name}`;
      const path = `${UPLOADS_DIR}/${filename}`;

      // Upload to Puter FS
      await puterService.fsWrite(path, file);

      // Save metadata to KV
      const resource: Resource = {
        id,
        projectId: activeProject?.id,
        name: file.name,
        source: 'apexscholar',
        source_id: id,
        type: file.type,
        path,
        date_added: new Date().toISOString()
      };

      const allResources = await puterService.kvGet('research_resources') || [];
      const updatedResources = [resource, ...allResources];
      await puterService.kvSet('research_resources', updatedResources);

      fetchResources();
    } catch (error) {
      console.error('Upload failed', error);
      alert('Failed to upload file to Puter Cloud Storage');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      // Delete from Puter FS
      await puterService.fsDelete(path);

      // Update KV metadata
      const allResources = await puterService.kvGet('research_resources') || [];
      const updatedResources = allResources.filter((r: Resource) => r.id !== id);
      await puterService.kvSet('research_resources', updatedResources);

      fetchResources();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete resource');
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('book')) return <Book className="w-8 h-8 text-indigo-400" />;
    if (type.includes('webpage')) return <Globe className="w-8 h-8 text-red-400" />;
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-400" />;
    if (type.includes('image')) return <ImageIcon className="w-8 h-8 text-emerald-400" />;
    if (type.includes('text')) return <FileText className="w-8 h-8 text-blue-400" />;
    return <File className="w-8 h-8 text-zinc-400" />;
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
        <div>
          <h1 className="text-2xl font-semibold text-white">Resource Library</h1>
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
              className="pl-9 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full sm:w-64"
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
          <div className="col-span-full text-center py-10 sm:py-20 border border-dashed border-white/10 rounded-xl bg-zinc-900/20">
            <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No resources found</h3>
            <p className="text-zinc-500 mb-6 max-w-sm mx-auto">Upload your first research paper, dataset, or image to get started.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
          </div>
        ) : (
          <table className="col-span-full w-full text-left">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Resource</th>
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Added</th>
                <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResources.map(resource => (
                <tr key={resource.id} className="group border-b border-neutral-800/60 hover:bg-zinc-900/50 transition-colors">
                  {/* Icon + Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black rounded-lg border border-neutral-800 shrink-0">
                        {getIcon(resource.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate max-w-[200px]" title={resource.name}>
                          {resource.name}
                        </p>
                        <span className="px-1.5 py-0.5 rounded-full text-indigo-500 text-[8px] font-bold uppercase tracking-wider">
                          {resource.type}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Date Added */}
                  <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(resource.date_added), { addSuffix: true })}
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
