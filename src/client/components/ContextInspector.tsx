import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  FileText,
  BookOpen,
  Quote,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Layers,
  Send,
  Loader2,
  Download,
  Clock,
  Play,
  CheckCircle2,
  Circle,
  Tag,
  ArrowRight,
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useInspector, type InspectorTab } from '../contexts/InspectorContext';
import { useToast } from '../contexts/ToastContext';
import { useProject } from '../contexts/ProjectContext';
import { formatCitation, type CitationFormat, type CitationMetadata } from '../lib/citationPipeline';
import { journalService } from '../lib/journal';
import { ai } from '../lib/ai';
import { format } from 'date-fns';

export default function ContextInspector() {
  const { isOpen, item, activeTab, setActiveTab, closeInspector } = useInspector();
  const { toast } = useToast();
  const { activeProject } = useProject();

  // Notes state (auto-saved per item ID)
  const [noteContent, setNoteContent] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [isAppendingJournal, setIsAppendingJournal] = useState(false);

  // Citation state
  const [citationFormat, setCitationFormat] = useState<CitationFormat>('bibtex');
  const [copiedCitation, setCopiedCitation] = useState(false);

  // Brain AI state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Load saved notes when item changes
  useEffect(() => {
    if (item?.id) {
      const saved = localStorage.getItem(`apex_inspector_note_${item.id}`);
      setNoteContent(saved || '');
      setAiResponse(null);
      setAiPrompt('');
    }
  }, [item?.id]);

  // Auto-save notes with debounce
  const handleNoteChange = (val: string) => {
    setNoteContent(val);
    setNoteSaved(false);
    if (item?.id) {
      localStorage.setItem(`apex_inspector_note_${item.id}`, val);
      setTimeout(() => setNoteSaved(true), 300);
    }
  };

  // Append note to journal
  const handleAppendToJournal = async () => {
    if (!noteContent.trim() || !item) return;
    setIsAppendingJournal(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      await journalService.createEntry({
        date: todayStr,
        type: 'synthesis',
        content: `### Synthesis Note: ${item.title}\n\n${noteContent.trim()}\n\n*Source: ${item.type.toUpperCase()} (${item.id})*`,
        project_id: item.project_id || activeProject?.id,
      });
      toast('Note successfully appended to Research Journal', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to append to journal', 'error');
    } finally {
      setIsAppendingJournal(false);
    }
  };

  // Format citation metadata from item
  const citationMeta: CitationMetadata = useMemo(() => {
    if (!item) {
      return {
        title: '',
        authors: [],
        year: new Date().getFullYear().toString(),
        type: 'misc',
        source: 'filename',
      };
    }
    return {
      title: item.title,
      authors: item.authors && item.authors.length > 0 ? item.authors : ['Apex Scholar Research'],
      year: item.year ? String(item.year) : new Date().getFullYear().toString(),
      journal: item.venue,
      doi: item.doi,
      url: item.url || (item.doi ? `https://doi.org/${item.doi}` : undefined),
      type: 'article',
      source: 'doi_crossref',
    };
  }, [item]);

  const formattedCitationText = useMemo(() => {
    try {
      return formatCitation(citationMeta, citationFormat);
    } catch {
      return item?.title || '';
    }
  }, [citationMeta, citationFormat, item]);

  const handleCopyCitation = async () => {
    await navigator.clipboard.writeText(formattedCitationText);
    setCopiedCitation(true);
    toast(`Citation copied to clipboard (${citationFormat.toUpperCase()})`, 'success');
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const handleDownloadBib = () => {
    const bibText = formatCitation(citationMeta, 'bibtex');
    const blob = new Blob([bibText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item?.title?.slice(0, 20).replace(/\s+/g, '_') || 'citation'}.bib`;
    link.click();
    URL.revokeObjectURL(url);
    toast('BibTeX file downloaded', 'info');
  };

  // Run Brain AI query
  const handleRunAiQuery = async (promptOverride?: string) => {
    const promptToUse = promptOverride || aiPrompt;
    if (!promptToUse.trim() || !item) return;

    setAiLoading(true);
    setAiResponse(null);
    try {
      const contextSummary = `
Context Item:
Type: ${item.type}
Title: ${item.title}
Subtitle/Venue: ${item.subtitle || item.venue || ''}
Date: ${item.date || ''}
Content/Abstract:
${item.content || 'No description provided.'}
      `.trim();

      const fullPrompt = `You are the Apex Scholar Research Assistant. Analyze the following research context item and answer the researcher's query concisely with actionable academic insights and clear markdown formatting.

${contextSummary}

Researcher Question:
${promptToUse}
`;

      const response = await ai.chat([
        { role: 'system', content: 'You are the Apex Scholar Research Assistant. Provide concise, actionable academic insights with clear markdown formatting.' },
        { role: 'user', content: fullPrompt },
      ]);
      setAiResponse(response);
      if (!promptOverride) {
        setAiPrompt('');
      }
    } catch (err: any) {
      toast(err.message || 'AI request failed', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <>
      {/* Backdrop (mobile/small screen) */}
      <div
        onClick={closeInspector}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-out Inspector Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-40 w-full sm:w-[440px] md:w-[480px] bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`}
        style={{ contain: 'paint' }}
      >
        {/* Top Header Bar */}
        <div className="min-h-[64px] border-b border-[var(--color-border)] px-5 flex items-center justify-between gap-3 bg-[var(--color-bg)]/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                item.type === 'entry'
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : item.type === 'paper'
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                  : item.type === 'task'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              {item.type === 'entry'
                ? 'Research Log'
                : item.type === 'paper'
                ? 'Literature'
                : item.type === 'task'
                ? 'Task / Todo'
                : 'Resource'}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] truncate font-mono">
              #{item.id.slice(0, 8)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[var(--color-text-faint)] font-mono">
              <kbd className="px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[10px]">
                Esc
              </kbd>
            </span>
            <button
              onClick={closeInspector}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] border border-transparent hover:border-[var(--color-border)] transition-all"
              aria-label="Close Inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title & Metadata Strip */}
        <div className="p-5 pb-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <h2 className="text-lg font-bold text-[var(--color-text)] tracking-tight leading-snug line-clamp-2">
            {item.title}
          </h2>
          {item.subtitle && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-1">
              {item.subtitle}
            </p>
          )}

          {/* Quick attribute chips */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-[var(--color-border)]/60 text-xs">
            {item.date && (
              <span className="inline-flex items-center gap-1 text-[var(--color-text-muted)] font-mono text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                {item.date}
              </span>
            )}
            {item.projectName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[11px]">
                <Layers className="w-3 h-3" />
                {item.projectName}
              </span>
            )}
            {item.priority && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                  item.priority === 'urgent'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : item.priority === 'high'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : item.priority === 'medium'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {item.priority.toUpperCase()}
              </span>
            )}
            {item.status && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)] text-[11px] font-mono capitalize">
                {item.status.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Linear High-Density Tab Bar */}
        <div className="flex items-center px-4 bg-[var(--color-surface-2)]/50 border-b border-[var(--color-border)] overflow-x-auto custom-scrollbar">
          {(
            [
              { id: 'overview', label: 'Overview', icon: FileText },
              { id: 'notes', label: 'Synthesis Notes', icon: BookOpen },
              { id: 'citations', label: 'Citations', icon: Quote },
              { id: 'ai', label: 'Brain AI', icon: Sparkles },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 py-2.5 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-400' : 'text-zinc-500'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
          {/* ──────────────── TAB 1: OVERVIEW ──────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Paper Details (if literature) */}
              {item.type === 'paper' && (
                <div className="p-4 rounded-xl bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] space-y-2.5 text-xs">
                  {item.authors && item.authors.length > 0 && (
                    <div>
                      <span className="text-[var(--color-text-muted)] uppercase tracking-wider font-semibold text-[10px]">
                        Authors
                      </span>
                      <p className="text-[var(--color-text)] font-medium mt-0.5">
                        {item.authors.join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]/60">
                    {item.venue && (
                      <div>
                        <span className="text-[var(--color-text-muted)] uppercase tracking-wider font-semibold text-[10px]">
                          Venue
                        </span>
                        <p className="text-[var(--color-text)] truncate mt-0.5">{item.venue}</p>
                      </div>
                    )}
                    {item.year && (
                      <div>
                        <span className="text-[var(--color-text-muted)] uppercase tracking-wider font-semibold text-[10px]">
                          Year
                        </span>
                        <p className="text-[var(--color-text)] font-mono mt-0.5">{item.year}</p>
                      </div>
                    )}
                  </div>

                  {item.doi && (
                    <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between">
                      <span className="text-[var(--color-text-muted)] text-[10px] uppercase font-semibold">
                        DOI
                      </span>
                      <a
                        href={`https://doi.org/${item.doi}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-mono text-xs transition-colors"
                      >
                        {item.doi}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Main Content / Abstract */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2.5">
                  {item.type === 'paper' ? 'Abstract' : item.type === 'task' ? 'Description' : 'Log Content'}
                </h4>
                <div className="p-4 rounded-xl bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] text-sm text-[var(--color-text)] leading-relaxed prose prose-invert prose-sm max-w-none">
                  {item.content ? (
                    <Markdown remarkPlugins={[remarkGfm]}>{item.content}</Markdown>
                  ) : (
                    <p className="text-[var(--color-text-muted)] italic text-xs">
                      No descriptive content provided.
                    </p>
                  )}
                </div>
              </div>

              {/* Task-specific action shortcuts */}
              {item.type === 'task' && item.onStatusChange && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Quick Workflow Transition
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => item.onStatusChange?.('pending')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                        item.status === 'pending'
                          ? 'bg-zinc-700 text-white border-zinc-500'
                          : 'bg-zinc-800/40 text-zinc-400 border-zinc-700 hover:text-white'
                      }`}
                    >
                      To Do
                    </button>
                    <button
                      onClick={() => item.onStatusChange?.('in_progress')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                        item.status === 'in_progress'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-zinc-800/40 text-zinc-400 border-zinc-700 hover:text-white'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => item.onStatusChange?.('completed')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                        item.status === 'completed'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-zinc-800/40 text-zinc-400 border-zinc-700 hover:text-white'
                      }`}
                    >
                      Completed
                    </button>
                  </div>
                </div>
              )}

              {/* Direct Quick Actions Strip */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => setActiveTab('ai')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 font-semibold text-xs transition-all active:scale-[0.99]"
                >
                  <Sparkles className="w-4 h-4" />
                  Ask Supermemory Brain about this
                </button>
                {item.type === 'paper' && (
                  <button
                    onClick={() => setActiveTab('citations')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text)] font-semibold text-xs transition-all"
                  >
                    <Quote className="w-4 h-4 text-indigo-400" />
                    Copy Formatted Citation
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ──────────────── TAB 2: NOTES & SYNTHESIS ──────────────── */}
          {activeTab === 'notes' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-text)]">
                    Item Synthesis Scratchpad
                  </h4>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                    Persistent notes stored locally per item.
                  </p>
                </div>
                {noteSaved && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3" /> Auto-saved
                  </span>
                )}
              </div>

              <textarea
                value={noteContent}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Write your research takeaways, critique, hypotheses, or ideas here..."
                rows={10}
                className="w-full p-3.5 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-indigo-500/50 leading-relaxed font-sans custom-scrollbar resize-none"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-[var(--color-text-faint)]">
                  {noteContent.trim() ? `${noteContent.trim().split(/\s+/).length} words` : '0 words'}
                </span>

                <button
                  onClick={handleAppendToJournal}
                  disabled={!noteContent.trim() || isAppendingJournal}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-xs active:scale-[0.98]"
                >
                  {isAppendingJournal ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BookOpen className="w-3.5 h-3.5" />
                  )}
                  <span>Append to Journal</span>
                </button>
              </div>
            </div>
          )}

          {/* ──────────────── TAB 3: CITATIONS & BIBTEX ──────────────── */}
          {activeTab === 'citations' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-text)]">
                    Format & Export Citation
                  </h4>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                    Standard academic formats generated automatically.
                  </p>
                </div>
              </div>

              {/* Format selector buttons */}
              <div className="flex bg-[var(--color-surface-2)] p-1 rounded-xl border border-[var(--color-border)]">
                {(
                  [
                    { id: 'bibtex', label: 'BibTeX' },
                    { id: 'apa', label: 'APA 7th' },
                    { id: 'mla', label: 'MLA 9th' },
                    { id: 'chicago', label: 'Chicago' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCitationFormat(f.id)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      citationFormat === f.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Formatted Citation Display */}
              <div className="p-4 rounded-xl bg-black/60 border border-[var(--color-border)] font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto custom-scrollbar select-all whitespace-pre-wrap">
                {formattedCitationText}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyCitation}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all active:scale-[0.98] shadow-sm"
                >
                  {copiedCitation ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Citation</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadBib}
                  title="Download .bib file"
                  className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ──────────────── TAB 4: BRAIN AI ASSISTANT ──────────────── */}
          {activeTab === 'ai' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h4 className="text-xs font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Supermemory Context Assistant
                </h4>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  Synthesize, critique, or extract hypotheses from this item.
                </p>
              </div>

              {/* Quick Prompt Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Summarize key findings',
                  'Draft research hypothesis',
                  'Critique methodology',
                  'Propose next experiments',
                ].map((promptText) => (
                  <button
                    key={promptText}
                    onClick={() => handleRunAiQuery(promptText)}
                    disabled={aiLoading}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {promptText}
                  </button>
                ))}
              </div>

              {/* Custom Prompt Input */}
              <div className="relative">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleRunAiQuery();
                    }
                  }}
                  placeholder="Ask any question about this item (⌘+Enter to submit)..."
                  rows={3}
                  className="w-full p-3 pr-10 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-indigo-500/50 resize-none"
                />
                <button
                  onClick={() => handleRunAiQuery()}
                  disabled={!aiPrompt.trim() || aiLoading}
                  className="absolute right-2.5 bottom-3.5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all shadow-xs"
                >
                  {aiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* AI Response Display */}
              {aiResponse && (
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Synthesis Analysis
                    </span>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(aiResponse);
                        toast('Analysis copied to clipboard', 'success');
                      }}
                      className="p-1 text-zinc-400 hover:text-white transition-colors"
                      title="Copy response"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-zinc-200 leading-relaxed prose prose-invert prose-xs max-w-none pt-1">
                    <Markdown remarkPlugins={[remarkGfm]}>{aiResponse}</Markdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
