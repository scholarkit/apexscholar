import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/apiFetch';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import Breadcrumbs from '../components/Breadcrumbs';

import {
  AlertCircle,
  ArrowLeft,
  Bold,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Cpu,
  Edit2,
  Eye,
  File,
  FileDown,
  FileText,
  Folder,
  GripVertical,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Minimize2,
  Pen,
  Plus,
  Quote,
  Redo,
  Save,
  Trash,
  Type,
  Underline,
  Undo,
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { kv } from '../lib/kv';
import { type DocumentData, documentService } from '../lib/documents';
import { storage } from '../lib/storage';

// CodeMirror Imports
import CodeMirror from '@uiw/react-codemirror';
import { latex } from 'codemirror-lang-latex';
import { oneDark } from '@codemirror/theme-one-dark';

// Tiptap Imports
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

interface Section {
  id: string;
  title: string;
  type: 'chapter' | 'section';
  path: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-[var(--color-surface)]/80 border-b border-zinc-800">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded-xl transition-colors ${editor.isActive('bold') ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded-xl transition-colors ${editor.isActive('italic') ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded-xl transition-colors ${editor.isActive('underline') ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Underline"
      >
        <Underline className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-zinc-800 mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded-xl transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded-xl transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-zinc-800 mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded-xl transition-colors ${editor.isActive('bulletList') ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded-xl transition-colors ${editor.isActive('orderedList') ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Ordered List"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded-xl transition-colors ${editor.isActive('blockquote') ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
        title="Blockquote"
      >
        <Quote className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-zinc-800 mx-1" />

      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
        title="Undo"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
        title="Redo"
      >
        <Redo className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function Composr() {
  const { activeProject, isViewer } = useProject();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentData | null>(null);
  const [structure, setStructure] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const [latexContent, setLatexContent] = useState('');
  const [docsContent, setDocsContent] = useState('');
  const [activeMode, setActiveMode] = useState<'latex' | 'docs'>('latex');
  const [title, setTitle] = useState('Untitled Manuscript');
  const [isPreviewOnly, setIsPreviewOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'pdf'>('preview');
  const [compilationStatus, setCompilationStatus] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your research document...',
      }),
    ],
    content: docsContent,
    onUpdate: ({ editor }) => {
      setDocsContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none p-6 min-h-[600px] text-zinc-300',
      },
    },
    editable: !isViewer,
  });

  // Sync editor content when docsContent changes (e.g., on load)
  useEffect(() => {
    if (editor && docsContent && editor.getHTML() !== docsContent) {
      editor.commands.setContent(docsContent);
    }
  }, [docsContent, editor]);

  // Default LaTeX template
  const DEFAULT_LATEX = `\\documentclass[11pt]{article}

\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{natbib}

\\title{Title of Your Paper}
\\author{Author Name}
\\date{}

\\begin{document}

\\maketitle

\\begin{abstract}
Your abstract here.
\\end{abstract}

\\section{Introduction}

\\section{Method}

\\section{Results}

\\section{Conclusion}

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}
        `;

  const DEFAULT_DOCS = `<h1>Research Document</h1><p>Start writing your research paper here with rich text formatting.</p>`;

  useEffect(() => {
    if (!activeProject) return;
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject]);

  const loadDocuments = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      const docs = await documentService.getDocuments(activeProject.id);
      setDocuments(docs);
      if (docs.length > 0) {
        await selectDocument(docs[0]);
      } else {
        const newDoc = await documentService.createDocument(
          activeProject.id,
          'My First Thesis',
          'thesis'
        );
        setDocuments([newDoc]);
        await selectDocument(newDoc);
      }
    } catch (err) {
      console.error('Failed to load docs:', err);
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  const selectDocument = async (doc: DocumentData) => {
    if (activeSection) await saveCurrentSection();
    setActiveDoc(doc);
    setTitle(doc.title);

    // Auto-expand the newly selected document
    setExpandedDocs((prev) => ({ ...prev, [doc.id]: true }));

    try {
      const docStructure = (await kv.get(`doc_structure_${doc.id}`)) as Section[];
      if (docStructure && docStructure.length > 0) {
        setStructure(docStructure);
        selectSection(docStructure[0]);
      } else {
        const defaultChapter: Section = {
          id: Math.random().toString(36).substring(7),
          title: 'Chapter 1 - Introduction',
          type: 'chapter',
          path: `composr/${doc.id}/chapter_1.tex`,
        };
        await kv.set(`doc_structure_${doc.id}`, [defaultChapter]);
        setStructure([defaultChapter]);
        await storage.write(defaultChapter.path, '\\section{Introduction}\n\nStart writing...\n');
        selectSection(defaultChapter);
      }
    } catch (err) {
      console.error('Failed to load structure:', err);
    }
  };

  const selectSection = async (section: Section) => {
    if (activeSection && activeSection.id !== section.id) {
      await saveCurrentSection();
    }
    setActiveSection(section);
    try {
      const res = await storage.read(section.path);
      let text = '';
      if (typeof res === 'string') {
        text = res;
      } else if (res && typeof res.text === 'function') {
        text = await res.text();
      }
      if (activeMode === 'latex') {
        setLatexContent(text);
        setDocsContent('');
      } else {
        setDocsContent(text);
      }
    } catch (err) {
      console.error('Failed to load section content', err);
      setLatexContent('');
      setDocsContent('');
    }
  };

  const saveCurrentSection = async () => {
    if (!activeSection) return;
    setIsSaving(true);
    try {
      const content = activeMode === 'latex' ? latexContent : docsContent;
      await storage.write(activeSection.path, content);
    } catch (err) {
      console.error('Failed to save section', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!activeProject || !activeDoc) return;
    try {
      setIsSaving(true);
      await documentService.updateDocument(activeDoc.id, activeProject.id, { title });
      setDocuments((docs) => docs.map((d) => (d.id === activeDoc.id ? { ...d, title } : d)));

      await kv.set(`doc_structure_${activeDoc.id}`, structure);
      await saveCurrentSection();
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save manuscript.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompile = async () => {
    if (!activeDoc) return;
    try {
      setIsCompiling(true);
      setError(null);
      setCompilationStatus('Stitching document...');

      await saveCurrentSection();

      let stitchedLatex = `${DEFAULT_LATEX.split('\\begin{document}')[0]}\\begin{document}\n\n`;

      const docStructure = (await kv.get(`doc_structure_${activeDoc.id}`)) as Section[];
      for (const sec of docStructure || []) {
        try {
          const res = await storage.read(sec.path);
          const text =
            typeof res === 'string'
              ? res
              : res && typeof res.text === 'function'
                ? await res.text()
                : '';
          stitchedLatex += `\n% --- ${sec.title} ---\n${text}\n`;
        } catch (err) {
          console.log(`Failed to read ${sec.path} for stitching`);
        }
      }
      stitchedLatex += `\n\\end{document}`;

      setCompilationStatus('Compiling...');

      const response = await apiFetch('/api/latex/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: stitchedLatex }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Compilation failed');
      }

      setCompilationStatus('Retrieving PDF...');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
      setActiveTab('pdf');
    } catch (err) {
      console.error('Compilation error:', err);
      setError((err as Error).message);
    } finally {
      setIsCompiling(false);
      setCompilationStatus(null);
    }
  };

  const downloadFile = () => {
    const isLatex = activeMode === 'latex';
    const blob = new Blob([isLatex ? latexContent : docsContent], {
      type: isLatex ? 'text/plain' : 'text/html',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}${isLatex ? '.tex' : '.html'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onLatexChange = useCallback((value: string) => {
    setLatexContent(value);
  }, []);

  if (!activeProject && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 bg-[var(--color-surface)]/20 border border-dashed border-[var(--color-border)] rounded-xl">
        <div className="w-20 h-20 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-8">
          <FileText className="w-10 h-10 text-indigo-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Writing Environment</h2>
        <p className="text-zinc-500 mb-8 max-w-sm">
          You must select or create a project before accessing Composr.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to Projects
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-50px)] overflow-hidden">
      <Breadcrumbs />

      {/* Dynamic Header */}
      <header className="flex flex-col lg:flex-row items-center gap-4 mb-6 shrink-0">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none will-change-transform" style={{ contain: 'strict' }} />
        <div className="flex items-center gap-4 w-full">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-3 hover:bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-zinc-700/50 transition-colors"
            title="Toggle Sidebar"
          >
            <List className="w-5 h-5 text-zinc-400" />
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl sm:text-2xl font-bold bg-transparent text-white border-none focus:ring-0 w-full placeholder:text-zinc-700"
            placeholder="Manuscript Title"
          />
          <div className="flex items-center justify-end gap-4">
            {!isViewer && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 hover:text-white hover:cursor-pointer text-sm font-medium transition-colors shrink-0"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
            )}

            <button
              onClick={downloadFile}
              className="flex items-center justify-center gap-2 hover:text-white hover:cursor-pointer text-sm font-medium transition-colors shrink-0"
            >
              <FileDown className="w-4 h-4" />
              {activeMode === 'latex' ? '.tex' : '.html'}
            </button>

            {!isViewer && activeMode === 'latex' && (
              <button
                onClick={handleCompile}
                disabled={isCompiling}
                className="flex items-center justify-center gap-2 hover:text-white hover:cursor-pointer disabled:opacity-50 text-sm font-medium transition-colors shrink-0"
              >
                {isCompiling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Cpu className="w-4 h-4" />
                )}
                {isCompiling ? compilationStatus || 'Compiling...' : 'Compile'}
              </button>
            )}

            <button
              onClick={() => setIsPreviewOnly(!isPreviewOnly)}
              className="lg:hidden flex items-center justify-center gap-2 hover:text-white hover:cursor-pointer text-sm font-medium transition-colors shrink-0"
            >
              {isPreviewOnly ? <Code2 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isPreviewOnly ? 'Edit' : 'View'}
            </button>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-[var(--color-surface)] p-1 rounded-xl ml-auto">
          <button
            onClick={() => setActiveMode('latex')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeMode === 'latex' ? 'bg-indigo-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Code2 className="w-4 h-4" />
            LaTeX
          </button>
          <button
            onClick={() => setActiveMode('docs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeMode === 'docs' ? 'bg-indigo-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Type className="w-4 h-4" />
            Docs
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 relative">
        {/* Sidebar */}
        <div
          className={`w-64 flex flex-col bg-[var(--color-surface)]/50 rounded-xl overflow-hidden backdrop-blur-sm border border-zinc-800 transition-all duration-300 shrink-0 ${!isSidebarOpen ? 'hidden' : ''}`}
        >
          <div className="flex bg-[var(--color-surface)]/80 border-b border-zinc-800 p-3 items-center justify-between">
            <span className="text-sm font-semibold text-white">Project Documents</span>
            {!isViewer && (
              <button
                onClick={async () => {
                  if (!activeProject) return;
                  const newDoc = await documentService.createDocument(
                    activeProject.id,
                    `New Document ${documents.length + 1}`,
                    'thesis'
                  );
                  setDocuments([...documents, newDoc]);
                  selectDocument(newDoc);
                }}
                className="p-1.5 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors"
                title="New Document"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {documents.map((doc) => {
              const isDocActive = activeDoc?.id === doc.id;
              const isExpanded = expandedDocs[doc.id];

              return (
                <div key={doc.id} className="mb-1">
                  <div
                    className={`flex items-center justify-between group px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${isDocActive ? 'bg-indigo-500/10 text-white' : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'}`}
                  >
                    <div
                      className="flex items-center gap-2 flex-1 min-w-0"
                      onClick={() => selectDocument(doc)}
                    >
                      <button
                        className="p-0.5 hover:bg-zinc-700/50 rounded shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDocs((prev) => ({ ...prev, [doc.id]: !prev[doc.id] }));
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <FileText
                        className={`w-4 h-4 shrink-0 ${isDocActive ? 'text-indigo-400' : ''}`}
                      />
                      <span className="text-sm font-medium truncate">{doc.title}</span>
                    </div>
                    {!isViewer && (
                      <>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const newTitle = prompt('Enter new title:', doc.title);
                            if (newTitle && newTitle !== doc.title) {
                              await documentService.updateDocument(doc.id, activeProject!.id, {
                                title: newTitle,
                              });
                              const newDocs = documents.map((d) =>
                                d.id === doc.id ? { ...d, title: newTitle } : d
                              );
                              setDocuments(newDocs);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors shrink-0"
                          title="Rename Document"
                        >
                          <Pen className="w-3 h-3" />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm('Delete this document?')) {
                              await documentService.deleteDocument(doc.id, activeProject!.id);
                              const newDocs = documents.filter((d) => d.id !== doc.id);
                              setDocuments(newDocs);
                              if (isDocActive) {
                                setActiveDoc(null);
                                setStructure([]);
                                if (newDocs.length > 0) selectDocument(newDocs[0]);
                              }
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors shrink-0"
                          title="Delete Document"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>

                  {isExpanded && isDocActive && (
                    <div className="pl-6 mt-1 space-y-0.5 border-l border-zinc-800 ml-3">
                      {structure.map((sec, idx) => (
                        <div
                          key={sec.id}
                          draggable={!isViewer}
                          onDragStart={(e) => {
                            if (isViewer) return;
                            setDraggedIdx(idx);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => {
                            if (isViewer) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={async (e) => {
                            if (isViewer) return;
                            e.preventDefault();
                            if (draggedIdx === null || draggedIdx === idx) return;
                            const newStructure = [...structure];
                            const [draggedItem] = newStructure.splice(draggedIdx, 1);
                            newStructure.splice(idx, 0, draggedItem);
                            setStructure(newStructure);
                            setDraggedIdx(null);
                            await kv.set(`doc_structure_${activeDoc.id}`, newStructure);
                          }}
                          className={`flex items-center group px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${activeSection?.id === sec.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'} ${draggedIdx === idx ? 'opacity-50' : ''}`}
                        >
                          {!isViewer && (
                            <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing mr-1 shrink-0" />
                          )}
                          {sec.type === 'chapter' ? (
                            <Folder className="w-3.5 h-3.5 shrink-0 text-indigo-500/70 mr-2" />
                          ) : (
                            <File className="w-3.5 h-3.5 shrink-0 ml-4 mr-2" />
                          )}
                          <input
                            value={sec.title}
                            readOnly={isViewer}
                            onChange={(e) => {
                              if (isViewer) return;
                              const newStructure = [...structure];
                              newStructure[idx].title = e.target.value;
                              setStructure(newStructure);
                            }}
                            onBlur={async () => {
                              if (isViewer) return;
                              await kv.set(`doc_structure_${activeDoc.id}`, structure);
                            }}
                            onClick={() => selectSection(sec)}
                            className="text-xs truncate flex-1 bg-transparent focus:outline-none border-b border-transparent focus:border-indigo-500"
                          />
                          {!isViewer && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm('Delete this section?')) {
                                  const newStructure = structure.filter((s) => s.id !== sec.id);
                                  setStructure(newStructure);
                                  await kv.set(`doc_structure_${activeDoc.id}`, newStructure);
                                  if (activeSection?.id === sec.id && newStructure.length > 0) {
                                    selectSection(newStructure[newStructure.length - 1]);
                                  }
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors shrink-0"
                              title="Delete Section"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      {!isViewer && (
                        <button
                          onClick={async () => {
                            const newSec: Section = {
                              id: Math.random().toString(36).substring(7),
                              title: `New Chapter ${structure.length + 1}`,
                              type: 'chapter',
                              path: `composr/${activeDoc.id}/chapter_${Math.random().toString(36).substring(7)}.tex`,
                            };
                            const newStructure = [...structure, newSec];
                            setStructure(newStructure);
                            await kv.set(`doc_structure_${activeDoc.id}`, newStructure);
                            await storage.write(
                              newSec.path,
                              '\\section{Introduction}\n\nStart writing...\n'
                            );
                            selectSection(newSec);
                          }}
                          className="w-full flex items-center gap-2 px-6 py-1.5 text-zinc-500 text-xs hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors mt-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Chapter
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor Side */}
        <div
          className={`flex-1 flex flex-col bg-[var(--color-surface)]/50 rounded-xl overflow-hidden backdrop-blur-sm transition-all duration-300 ${isPreviewOnly ? 'hidden lg:flex' : 'flex'}`}
        >
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeMode === 'latex' ? (
              <CodeMirror
                value={latexContent}
                readOnly={isViewer}
                editable={!isViewer}
                height="100%"
                theme={oneDark}
                extensions={[latex()]}
                onChange={onLatexChange}
                className="h-full custom-codemirror-scroll"
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: true,
                  bracketMatching: true,
                  autocompletion: true,
                  foldGutter: true,
                }}
              />
            ) : (
              <>
                <MenuBar editor={editor} />
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/10">
                  <EditorContent editor={editor} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Preview Side (Only for LaTeX) */}
        {activeMode === 'latex' && (
          <div
            className={`flex-1 flex flex-col bg-[var(--color-surface)]/30 rounded-xl overflow-hidden backdrop-blur-md transition-all duration-300 ${!isPreviewOnly ? 'hidden lg:flex' : 'flex'}`}
          >
            <div className="flex items-center justify-end gap-4 px-6 py-4 bg-[var(--color-surface)]/80 border-b border-zinc-800 shrink-0">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'preview' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Eye className="w-4 h-4" />
                Draft View
              </button>
              <button
                onClick={() => setActiveTab('pdf')}
                disabled={!pdfUrl}
                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'pdf' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300 disabled:opacity-30'}`}
              >
                <FileText className="w-4 h-4" />
                PDF Proof
              </button>
              {isPreviewOnly && (
                <button
                  onClick={() => setIsPreviewOnly(false)}
                  className="lg:hidden p-1 text-zinc-500 hover:text-white"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {activeTab === 'preview' ? (
                <div
                  ref={previewRef}
                  className="flex-1 p-8 sm:p-12 overflow-y-auto custom-scrollbar bg-black/20"
                />
              ) : (
                <div className="flex-1 bg-zinc-800/50">
                  {pdfUrl ? (
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full border-none"
                      title="PDF Compilation Output"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-8 text-center">
                      <Cpu className="w-12 h-12 mb-4 opacity-20" />
                      <p>
                        No compiled PDF yet.
                        <br />
                        Click "Compile" to generate one.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-red-400/10 border border-red-400/20 text-red-400 rounded-xl text-sm animate-in fade-in zoom-in-95">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}
    </div>
  );
}
