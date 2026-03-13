import { useState, useEffect, useRef } from 'react';
import { Plus, Save, Trash2, Edit2, X, FileText, Mic, Radio } from 'lucide-react';
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import { Entry } from '../lib/puter';
import { parseEntryDate } from '../utils/dateUtils';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import { kv } from '../lib/kv';

export default function Journal() {
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<Partial<Entry>>({});
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const contentRef = useRef<string>('');

  const entryTypes = ['Weekly Diary', 'Progress Notes', 'Meeting Notes', 'Other'];

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
        setCurrentEntry(prev => ({ ...prev, content: contentRef.current }));
      }
    };
    rec.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicError('Microphone access was denied. Please allow access in your browser settings and try again.');
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
    const data = await kv.get('research_entries') || [];
    const projectEntries = data.filter((e: Entry) => e.projectId === activeProject.id);
    setEntries(projectEntries.sort((a: Entry, b: Entry) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setLoading(false);
  };

  const handleSave = async () => {
    if (!currentEntry.content || !currentEntry.entry_type) return;

    const isNew = !currentEntry.id;
    let finalDate = currentEntry.date || new Date().toISOString();

    if (currentEntry.entry_type === 'Weekly Diary' && currentEntry.startDate && currentEntry.endDate) {
      finalDate = `${currentEntry.startDate} to ${currentEntry.endDate}`;
    }

    const newEntry: Entry = {
      id: currentEntry.id || Math.random().toString(36).substring(7),
      projectId: activeProject?.id,
      date: finalDate,
      content: currentEntry.content,
      entry_type: currentEntry.entry_type
    };

    const allEntries = await kv.get('research_entries') || [];
    let updatedEntries;
    if (isNew) {
      updatedEntries = [newEntry, ...allEntries];
    } else {
      updatedEntries = allEntries.map((e: Entry) => e.id === newEntry.id ? newEntry : e);
    }

    await kv.set('research_entries', updatedEntries);

    setIsEditing(false);
    setCurrentEntry({});
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    const allEntries = await kv.get('research_entries') || [];
    const updatedEntries = allEntries.filter((e: Entry) => e.id !== id);
    await kv.set('research_entries', updatedEntries);
    fetchEntries();
  };

  const openEditor = (entry?: Entry) => {
    if (entry) {
      const isWeekly = entry.entry_type === 'Weekly Diary';
      let startDate = '';
      let endDate = '';

      if (isWeekly && entry.date.includes(' to ')) {
        [startDate, endDate] = entry.date.split(' to ');
      }

      setCurrentEntry({
        ...entry,
        startDate: startDate || (isWeekly ? entry.date : ''),
        endDate: endDate || ''
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      setCurrentEntry({
        entry_type: 'Progress Notes',
        date: today,
        startDate: today,
        endDate: today
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
          setMicError('Microphone access is blocked. Click the 🔒 icon in your browser\'s address bar to allow it, then try again.');
          setTimeout(() => setMicError(null), 8000);
          return;
        }
      }

      // Trigger the browser permission prompt via getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately — SpeechRecognition manages its own
      stream.getTracks().forEach(t => t.stop());

      // Permission granted — start recognition
      setMicError(null);
      contentRef.current = currentEntry.content || '';
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err: any) {
      setIsListening(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Microphone access was denied. Please allow it in your browser settings and try again.');
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
        <h2 className="text-2xl font-bold text-white mb-2">No Active Project</h2>
        <p className="text-zinc-500 mb-8 max-w-sm">You must select or create a project before accessing the Research Journal.</p>
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
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div>
          <h1 className="text-2xl font-semibold text-white">Research Journal</h1>
          <p className="text-base text-zinc-400">Log your progress, meetings, and weekly diaries.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => openEditor()}
            className="w-full sm:w-fit mt-2 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors  "
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        )}
      </header>

      {isEditing ? (
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 backdrop-blur-sm shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              {currentEntry.id ? 'Edit Entry' : 'New Entry'}
            </h2>
            <button onClick={() => setIsEditing(false)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Category</label>
                <select
                  value={currentEntry.entry_type}
                  onChange={(e) => setCurrentEntry({ ...currentEntry, entry_type: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-2 sm:px-4 py-1 sm:py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                >
                  {entryTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {currentEntry.entry_type === 'Weekly Diary' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={currentEntry.startDate || ''}
                      onChange={(e) => setCurrentEntry({ ...currentEntry, startDate: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">End Date</label>
                    <input
                      type="date"
                      value={currentEntry.endDate || ''}
                      onChange={(e) => setCurrentEntry({ ...currentEntry, endDate: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                <div className="flex items-center justify-between">
                  <span>Content <span className="text-zinc-600">(Markdown supported)</span></span>
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      title={isListening ? 'Stop recording' : 'Start voice dictation'}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${isListening
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 border border-white/10'
                        }`}
                    >
                      {isListening ? (
                        <><Radio className="w-3.5 h-3.5" /> Recording… click to stop</>
                      ) : (
                        <><Mic className="w-3.5 h-3.5" /> Voice Mode</>
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
                  <span className="text-xs text-rose-300 font-medium">Listening… speak clearly. Text will appear below automatically.</span>
                </div>
              )}

              <textarea
                value={currentEntry.content || ''}
                onChange={(e) => setCurrentEntry({ ...currentEntry, content: e.target.value })}
                placeholder={isListening ? '🎙️ Speak now — your words will appear here…' : 'Write your research notes here…'}
                className={`w-full h-64 bg-black border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 font-mono text-sm resize-y transition-colors ${isListening
                  ? 'border-rose-500/40 focus:ring-rose-500/30'
                  : 'border-white/10 focus:ring-indigo-500/50'
                  }`}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t    border-neutral-800">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!currentEntry.content}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors  "
              >
                <Save className="w-4 h-4" />
                Save Entry
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {entries.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-zinc-900/20">
              <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No entries yet</h3>
              <p className="text-zinc-500 mb-6 max-w-sm mx-auto">Start documenting your research journey by creating your first journal entry.</p>
              <button
                onClick={() => openEditor()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Entry
              </button>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="bg-zinc-900/40 border    border-neutral-800 rounded-xl p-3 sm:p-6 hover:bg-zinc-900/60 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-semibold tracking-wide uppercase border border-indigo-500/20">
                      {entry.entry_type}
                    </span>
                    <span className="text-sm text-zinc-500 font-medium">
                      {entry.entry_type === 'Weekly Diary' ? entry.date : format(parseEntryDate(entry.date), 'MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditor(entry)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(entry.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed prose-pre:bg-black prose-pre:border prose-pre:border-white/10">
                  <Markdown>{entry.content}</Markdown>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
