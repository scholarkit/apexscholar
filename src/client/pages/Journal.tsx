import { useEffect, useRef, useState, useMemo } from 'react';
import { Edit2, FileText, Loader2, Mic, Plus, Radio, Save, Trash2, X, Search, Filter, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import { parseEntryDate } from '../utils/dateUtils';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import { type JournalEntry, journalService } from '../lib/journal';
import { journalEntrySchema } from '../lib/schemas';

import { kv } from '../lib/kv';

export default function Journal() {
  const { activeProject, isViewer } = useProject();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<Partial<JournalEntry>>({});
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const recognitionRef = useRef<any>(null);
  const contentRef = useRef<string>('');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleEntry = (id?: string) => {
    if (!id) return;
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        (entry.content && entry.content.toLowerCase().includes(searchLower)) ||
        (entry.type && entry.type.toLowerCase().includes(searchLower)) ||
        (entry.date && entry.date.toLowerCase().includes(searchLower));

      const matchesType = typeFilter === 'all' || entry.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [entries, searchQuery, typeFilter]);

  const entryTypes = [
    { label: 'Daily Diary', value: 'daily' },
    { label: 'Weekly Diary', value: 'weekly' },
    { label: 'Progress Notes', value: 'progress_note' },
    { label: 'Meeting Notes', value: 'meeting_note' },
    { label: 'Other', value: 'other' },
  ];

  // Set up SpeechRecognition once
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setVoiceSupported(true);
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      if (final) {
        contentRef.current = contentRef.current + final;
        setCurrentEntry((prev) => ({ ...prev, content: contentRef.current }));
      }
    };
    rec.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicError(
          'Microphone access was denied. Please allow access in your browser settings and try again.'
        );
        setTimeout(() => setMicError(null), 6000);
      }
    };
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
  }, []);

  // Keep contentRef in sync so speech appends correctly
  useEffect(() => {
    contentRef.current = currentEntry.content || '';
  }, [currentEntry.content]);

  useEffect(() => {
    fetchEntries();
  }, [activeProject]);

  const fetchEntries = async () => {
    if (!activeProject) {
      setLoading(false);
      return;
    }
    const data: any = await journalService.getEntries(activeProject.id);
    setEntries(
      data.sort(
        (a: JournalEntry, b: JournalEntry) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );
    setLoading(false);
  };

  const handleSave = async () => {
    const result = journalEntrySchema.safeParse({
      type: currentEntry.type,
      content: currentEntry.content,
      date: currentEntry.date,
      start_date: currentEntry.start_date,
      end_date: currentEntry.end_date,
    });
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      alert(firstIssue?.message ?? 'Validation failed');
      return;
    }
    setIsSaving(true);

    try {
      const isNew = !currentEntry.id;
      let finalDate = currentEntry.date || new Date().toISOString().split('T')[0];

      if (currentEntry.type === 'weekly' && currentEntry.start_date && currentEntry.end_date) {
        finalDate = `${currentEntry.start_date} to ${currentEntry.end_date}`;
      }

      const newEntry: Partial<JournalEntry> = {
        project_id: activeProject?.id,
        content: currentEntry.content,
        type: currentEntry.type,
        date: finalDate,
      };

      if (isNew) {
        await journalService.createEntry(newEntry);
      } else {
        await journalService.updateEntry(currentEntry.id!, newEntry);
      }

      setIsEditing(false);
      setCurrentEntry({});
      fetchEntries();
    } catch (err) {
      console.error('Failed to save journal entry:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Entry?')) return;
    const allEntries = (await kv.get('research_entries')) || [];
    await journalService.deleteEntry(id);
    fetchEntries();
  };

  const openEditor = (Entry?: JournalEntry) => {
    if (Entry) {
      const isWeekly = Entry.type === 'weekly';
      let startDate = '';
      let endDate = '';
      let singleDate = '';

      if (isWeekly && Entry.date?.includes(' to ')) {
        const parts = Entry.date.split(' to ');
        startDate = parts[0]?.trim() || '';
        endDate = parts[1]?.trim() || '';
      } else if (isWeekly) {
        startDate = Entry.start_date || '';
        endDate = Entry.end_date || '';
      } else {
        // For non-weekly entries, extract a YYYY-MM-DD date for the input field
        singleDate = Entry.date ? Entry.date.split('T')[0] : '';
      }

      setCurrentEntry({
        ...Entry,
        date: singleDate,
        start_date: startDate,
        end_date: endDate,
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      setCurrentEntry({
        type: 'daily',
        start_date: today,
        end_date: today,
        date: today,
      });
    }
    // Stop any active recording when switching entries
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    setIsEditing(true);
  };

  const toggleListening = async () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    // Gracefully request mic permission before starting recognition
    try {
      // Check existing permission state if Permissions API is available
      if (navigator.permissions) {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (status.state === 'denied') {
          setMicError(
            "Microphone access is blocked. Click the 🔒 icon in your browser's address bar to allow it, then try again."
          );
          setTimeout(() => setMicError(null), 8000);
          return;
        }
      }

      // Trigger the browser permission prompt via getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately — SpeechRecognition manages its own
      stream.getTracks().forEach((t) => t.stop());

      // Permission granted — start recognition
      setMicError(null);
      contentRef.current = currentEntry.content || '';
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err: any) {
      setIsListening(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError(
          'Microphone access was denied. Please allow it in your browser settings and try again.'
        );
      } else {
        setMicError('Could not access the microphone. Please check your device settings.');
      }
      setTimeout(() => setMicError(null), 7000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-zinc-500 font-medium">Loading journal...</p>
        </div>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-xl flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Active Project</h2>
        <p className="text-zinc-500 mb-8 max-w-sm">
          You must select or create a project before accessing the Research Journal.
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32 lg:pb-8">
      <Breadcrumbs />
      <header className="flex flex-col sm:flex-row items-center justify-between">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none will-change-transform" style={{ contain: 'strict' }} />
        <div>
          <h1 className="text-2xl font-semibold">Research Journal</h1>
          <p className="text-base text-zinc-400">
            Log your progress, meetings, and weekly diaries.
          </p>
        </div>
        {!isEditing && !isViewer && (
          <button
            onClick={() => openEditor()}
            className="w-full sm:w-fit mt-2 sm:mt-0 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        )}
      </header>

      {!isEditing && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl pl-10 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none min-w-[150px]"
              >
                <option value="all">All Types</option>
                {entryTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/20">
              <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No entries found</h3>
              <p className="text-zinc-500 mb-6 max-w-sm mx-auto">
                {entries.length === 0 
                  ? "Start documenting your research journey by creating your first journal Entry."
                  : "No entries match your current search and filter criteria."}
              </p>
              {!isViewer && entries.length === 0 && (
                <button
                  onClick={() => openEditor()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-[var(--color-border)] text-white rounded-xl font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Entry
                </button>
              )}
            </div>
          ) : (
            filteredEntries.map((Entry) => {
              const isExpanded = expandedEntries.has(Entry.id || '');
              return (
                <div
                  key={Entry.id}
                  className="bg-[var(--color-surface)]/40 border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface)]/60 transition-colors group overflow-hidden"
                >
                  <div className="p-3 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-semibold tracking-wide uppercase border border-indigo-500/20 whitespace-nowrap">
                        {Entry.type}
                      </span>
                      <span className="text-sm text-zinc-500 font-medium whitespace-nowrap">
                        {Entry.type === 'weekly'
                          ? Entry.date
                          : format(parseEntryDate(Entry.date), 'MMMM d, yyyy')}
                      </span>
                      <span className="text-sm text-zinc-400 truncate hidden sm:block opacity-60">
                        {Entry.content.replace(/[\n\r]+/g, ' ').substring(0, 80)}...
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => toggleEntry(Entry.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-[var(--color-border)] rounded-lg text-sm font-medium transition-colors"
                      >
                        {isExpanded ? (
                          <><EyeOff className="w-4 h-4" /> Hide</>
                        ) : (
                          <><Eye className="w-4 h-4" /> Preview</>
                        )}
                      </button>
                      
                      {!isViewer && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditor(Entry)}
                            className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(Entry.id as string)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-3 pb-3 sm:px-6 sm:pb-6 pt-0 border-t border-[var(--color-border)] mt-4">
                      <div className="prose max-w-none prose-p:leading-relaxed prose-pre:bg-[var(--color-surface)] prose-pre:border prose-pre:border-[var(--color-border)] dark:prose-invert pt-4">
                        <Markdown>{Entry.content}</Markdown>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setIsEditing(false)}
        >
          <div
            className="w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <h2 className="text-xl font-semibold">
                {currentEntry.id ? 'Edit Entry' : 'New Entry'}
              </h2>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] hover:bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-3 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Category</label>
                    <select
                      value={currentEntry.type}
                      onChange={(e) => setCurrentEntry({ ...currentEntry, type: e.target.value })}
                      className="w-full bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl px-2 sm:px-4 py-1 sm:py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                    >
                      {entryTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentEntry.type === 'weekly' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={currentEntry.start_date || ''}
                          onChange={(e) =>
                            setCurrentEntry({ ...currentEntry, start_date: e.target.value })
                          }
                          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={currentEntry.end_date || ''}
                          onChange={(e) =>
                            setCurrentEntry({ ...currentEntry, end_date: e.target.value })
                          }
                          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Date</label>
                      <input
                        type="date"
                        value={currentEntry.date || ''}
                        onChange={(e) => setCurrentEntry({ ...currentEntry, date: e.target.value })}
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    <div className="flex items-center justify-between">
                      <span>
                        Content <span className="text-zinc-600">(Markdown supported)</span>
                      </span>
                      {voiceSupported && (
                        <button
                          type="button"
                          onClick={toggleListening}
                          title={isListening ? 'Stop recording' : 'Start voice dictation'}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                            isListening
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                              : 'bg-zinc-800 text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] hover:bg-zinc-700 border border-[var(--color-border)]'
                          }`}
                        >
                          {isListening ? (
                            <>
                              <Radio className="w-3.5 h-3.5" /> Recording… click to stop
                            </>
                          ) : (
                            <>
                              <Mic className="w-3.5 h-3.5" /> Voice Mode
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </label>

                  {micError && (
                    <div className="flex items-start gap-2 mb-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <span className="text-amber-400 flex-shrink-0 mt-0.5">🎙️</span>
                      <span className="text-xs text-amber-300 font-medium">{micError}</span>
                    </div>
                  )}

                  {isListening && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                      <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse flex-shrink-0" />
                      <span className="text-xs text-rose-300 font-medium">
                        Listening… speak clearly. Text will appear here automatically.
                      </span>
                    </div>
                  )}

                  <textarea
                    value={currentEntry.content || ''}
                    onChange={(e) => setCurrentEntry({ ...currentEntry, content: e.target.value })}
                    placeholder={
                      isListening
                        ? '🎙️ Speak now — your words will appear here…'
                        : 'Write your research notes here…'
                    }
                    className={`w-full h-64 bg-[var(--color-surface)] border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 font-mono text-sm resize-y transition-colors ${
                      isListening
                        ? 'border-rose-500/40 focus:ring-rose-500/30'
                        : 'border-[var(--color-border)] focus:ring-indigo-500/50'
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t    border-[var(--color-border)]">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!currentEntry.content || isSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors  "
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Entry'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
