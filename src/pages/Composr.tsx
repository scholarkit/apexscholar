import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import Breadcrumbs from '../components/Breadcrumbs';
import { puterService } from '../lib/puter';
import {
    FileText,
    Save,
    Eye,
    Code2,
    Download,
    Maximize2,
    Minimize2,
    Settings2,
    AlertCircle,
    ArrowLeft,
    Loader2,
    Trash2,
    FileDown,
    Cpu,
    Type,
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Quote,
    Undo,
    Redo,
    Link as LinkIcon
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// CodeMirror Imports
import CodeMirror from '@uiw/react-codemirror';
import { latex } from 'codemirror-lang-latex';
import { oneDark } from '@codemirror/theme-one-dark';

// Tiptap Imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

interface DocumentData {
    projectId: string;
    title: string;
    latexContent: string;
    docsContent: string;
    activeMode: 'latex' | 'docs';
    updatedAt: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-zinc-900/80 border-b border-zinc-800">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
                title="Bold"
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
                title="Italic"
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-2 rounded-lg transition-colors ${editor.isActive('underline') ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
                title="Underline"
            >
                <Underline className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-zinc-800 mx-1" />

            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-2 rounded-lg transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
                title="Heading 1"
            >
                <Heading1 className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-2 rounded-lg transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
                title="Heading 2"
            >
                <Heading2 className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-zinc-800 mx-1" />

            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-2 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
                title="Bullet List"
            >
                <List className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-2 rounded-lg transition-colors ${editor.isActive('orderedList') ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
                title="Ordered List"
            >
                <ListOrdered className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-2 rounded-lg transition-colors ${editor.isActive('blockquote') ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
                title="Blockquote"
            >
                <Quote className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-zinc-800 mx-1" />

            <button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                title="Undo"
            >
                <Undo className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                title="Redo"
            >
                <Redo className="w-4 h-4" />
            </button>
        </div>
    );
};

export default function Composr() {
    const { activeProject } = useProject();
    const navigate = useNavigate();
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
                class: 'prose prose-invert max-w-none focus:outline-none p-6 min-h-[500px] text-zinc-300',
            },
        },
    });

    // Sync editor content when docsContent changes (e.g., on load)
    useEffect(() => {
        if (editor && docsContent && editor.getHTML() !== docsContent) {
            editor.commands.setContent(docsContent);
        }
    }, [docsContent, editor]);

    // Default LaTeX template
    const DEFAULT_LATEX = `\\title{Research Project Manuscript}
\\author{Your Name}
\\date{\\today}

\\section{Introduction}
Start writing your research paper here using LaTeX. 

\\section{Methodology}
Explain your research design and methods. 

\\section{Results}
Use equations like $E = mc^2$ or display math:
\\[ \\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi} \\]

\\section{Conclusion}
Summarize your findings.`;

    const DEFAULT_DOCS = `<h1>Research Document</h1><p>Start writing your research paper here with rich text formatting.</p>`;

    useEffect(() => {
        if (!activeProject) return;
        loadDocument();
    }, [activeProject]);

    useEffect(() => {
        if (previewRef.current && latexContent && activeMode === 'latex') {
            renderLaTeX();
        }
    }, [latexContent, isPreviewOnly, activeTab, activeMode]);

    const loadDocument = async () => {
        if (!activeProject) return;
        try {
            setLoading(true);
            const data = await puterService.kvGet(`composr_${activeProject.id}`) as DocumentData;
            if (data) {
                setLatexContent(data.latexContent || '');
                setDocsContent(data.docsContent || '');
                setActiveMode(data.activeMode || 'latex');
                setTitle(data.title || 'Untitled Manuscript');
            } else {
                setLatexContent(DEFAULT_LATEX);
                setDocsContent(DEFAULT_DOCS);
                setActiveMode('latex');
            }
        } catch (err) {
            console.error('Failed to load document:', err);
            setError('Failed to load manuscript. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!activeProject) return;
        try {
            setIsSaving(true);
            await puterService.kvSet(`composr_${activeProject.id}`, {
                projectId: activeProject.id,
                title,
                latexContent,
                docsContent,
                activeMode,
                updatedAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('Save error:', err);
            setError('Failed to save manuscript.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCompile = async () => {
        if (activeMode !== 'latex') {
            setError('Full LaTeX compilation is only available in LaTeX mode.');
            return;
        }
        try {
            setIsCompiling(true);
            setError(null);
            setCompilationStatus('Dispatching Workflow...');

            const response = await fetch('/api/compile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: latexContent })
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

    const renderLaTeX = () => {
        if (!previewRef.current || activeTab !== 'preview') return;

        // Process the content for KaTeX
        let html = latexContent
            .replace(/\\section{(.*?)}/g, '<h2 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-zinc-800 pb-2">$1</h2>')
            .replace(/\\subsection{(.*?)}/g, '<h3 class="text-xl font-semibold text-white mt-6 mb-3">$1</h3>')
            .replace(/\\title{(.*?)}/g, '<h1 class="text-4xl font-black text-white text-center mb-8 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">$1</h1>')
            .replace(/\\author{(.*?)}/g, '<p class="text-center text-zinc-400 mb-2">By: $1</p>')
            .replace(/\\date{(.*?)}/g, '<p class="text-center text-zinc-500 mb-8 italic">$1</p>')
            .replace(/\\today/g, new Date().toLocaleDateString());

        // Render Display Math: \[ math \]
        html = html.replace(/\\\[([\s\S]*?)\\\]/g, (match, p1) => {
            try {
                return `<div class="my-6 flex justify-center overflow-x-auto py-4 bg-zinc-900/50 rounded-xl px-4">${katex.renderToString(p1, { displayMode: true, throwOnError: false })}</div>`;
            } catch (e) {
                return `<span class="text-red-500">Error in formula</span>`;
            }
        });

        // Render Inline Math: $ math $
        html = html.replace(/\$(.*?)\$/g, (match, p1) => {
            try {
                return katex.renderToString(p1, { displayMode: false, throwOnError: false });
            } catch (e) {
                return `<span class="text-red-500">Error</span>`;
            }
        });

        // Handle paragraphs (double newlines)
        html = html.split('\n\n').map(p => {
            if (p.startsWith('<h') || p.startsWith('<p') || p.startsWith('<div')) return p;
            return `<p class="mb-4 leading-relaxed text-zinc-300">${p.replace(/\n/g, '<br/>')}</p>`;
        }).join('');

        previewRef.current.innerHTML = html;
    };

    const downloadFile = () => {
        const isLatex = activeMode === 'latex';
        const blob = new Blob([isLatex ? latexContent : docsContent], { type: isLatex ? 'text/plain' : 'text/html' });
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
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 bg-zinc-900/20 border border-dashed border-white/10 rounded-3xl">
                <div className="w-20 h-20 bg-[#3B82F6]/10 rounded-3xl flex items-center justify-center mb-8">
                    <FileText className="w-10 h-10 text-indigo-500" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Writing Environment</h2>
                <p className="text-zinc-500 mb-8 max-w-sm">You must select or create a project before accessing Composr.</p>
                <button
                    onClick={() => navigate('/projects')}
                    className="flex items-center gap-2 px-6 py-3 bg-[#3B82F6] hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all"
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
        <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden">
            <Breadcrumbs />

            {/* Dynamic Header */}
            <header className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6 shrink-0">
                <div className="flex items-center gap-4 w-full lg:w-1/3">
                    <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <FileText className="w-6 h-6 text-indigo-400" />
                    </div>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-xl sm:text-2xl font-bold bg-transparent text-white border-none focus:ring-0 w-full placeholder:text-zinc-700"
                        placeholder="Manuscript Title"
                    />
                </div>

                {/* Mode Switcher */}
                <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl shadow-lg shadow-black/50">
                    <button
                        onClick={() => setActiveMode('latex')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeMode === 'latex' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Code2 className="w-4 h-4" />
                        LaTeX
                    </button>
                    <button
                        onClick={() => setActiveMode('docs')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeMode === 'docs' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Type className="w-4 h-4" />
                        Docs
                    </button>
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto lg:overflow-visible no-scrollbar pb-2 lg:pb-0">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                    </button>

                    {activeMode === 'latex' && (
                        <button
                            onClick={handleCompile}
                            disabled={isCompiling}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/10 min-w-[140px] shrink-0"
                        >
                            {isCompiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                            {isCompiling ? (compilationStatus || 'Compiling...') : 'Full Compile'}
                        </button>
                    )}

                    <button
                        onClick={downloadFile}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
                    >
                        <FileDown className="w-4 h-4" />
                        {activeMode === 'latex' ? '.tex' : '.html'}
                    </button>

                    <button
                        onClick={() => setIsPreviewOnly(!isPreviewOnly)}
                        className="lg:hidden flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
                    >
                        {isPreviewOnly ? <Code2 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {isPreviewOnly ? 'Edit' : 'View'}
                    </button>
                </div>
            </header>

            {/* Editor/Preview Container */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 relative">
                {/* Editor Side */}
                <div className={`flex-1 flex flex-col bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-sm transition-all duration-300 ${isPreviewOnly ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/80 border-b border-zinc-800 shrink-0">
                        <div className="flex items-center gap-2 text-zinc-400">
                            {activeMode === 'latex' ? <Code2 className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                            <span className="text-xs font-bold uppercase tracking-wider">
                                {activeMode === 'latex' ? 'LaTeX Editor' : 'Rich Text Editor'}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {activeMode === 'latex' ? (
                            <CodeMirror
                                value={latexContent}
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
                    <div className={`flex-1 flex flex-col bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-md transition-all duration-300 ${!isPreviewOnly ? 'hidden lg:flex' : 'flex'}`}>
                        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/80 border-b border-zinc-800 shrink-0">
                            <div className="flex items-center gap-4">
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
                            </div>
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
                                            <p>No compiled PDF yet.<br />Click "Full Compile" to generate one.</p>
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
