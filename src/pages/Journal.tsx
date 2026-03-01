import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Edit2, X, FileText } from 'lucide-react';
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import { Entry, puterService } from '../lib/puter';
import { parseEntryDate } from '../utils/dateUtils';

export default function Journal() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<Partial<Entry>>({});
  const [loading, setLoading] = useState(true);

  const entryTypes = ['Weekly Diary', 'Progress Notes', 'Meeting Notes', 'Other'];

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    const data = await puterService.kvGet('research_entries') || [];
    setEntries(data.sort((a: Entry, b: Entry) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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
      date: finalDate,
      content: currentEntry.content,
      entry_type: currentEntry.entry_type
    };

    const allEntries = await puterService.kvGet('research_entries') || [];
    let updatedEntries;
    if (isNew) {
      updatedEntries = [newEntry, ...allEntries];
    } else {
      updatedEntries = allEntries.map((e: Entry) => e.id === newEntry.id ? newEntry : e);
    }

    await puterService.kvSet('research_entries', updatedEntries);

    setIsEditing(false);
    setCurrentEntry({});
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    const allEntries = await puterService.kvGet('research_entries') || [];
    const updatedEntries = allEntries.filter((e: Entry) => e.id !== id);
    await puterService.kvSet('research_entries', updatedEntries);
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
    setIsEditing(true);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white mb-1">Research Journal</h1>
          <p className="text-sm sm:text-base text-zinc-400">Log your progress, meetings, and weekly diaries.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => openEditor()}
            className="w-full sm:w-fit mt-2 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        )}
      </header>

      {isEditing ? (
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              {currentEntry.id ? 'Edit Entry' : 'New Entry'}
            </h2>
            <button onClick={() => setIsEditing(false)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
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
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2 sm:px-4 py-1 sm:py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
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
                      className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">End Date</label>
                    <input
                      type="date"
                      value={currentEntry.endDate || ''}
                      onChange={(e) => setCurrentEntry({ ...currentEntry, endDate: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2 flex justify-between">
                <span>Content (Markdown supported)</span>
              </label>
              <textarea
                value={currentEntry.content || ''}
                onChange={(e) => setCurrentEntry({ ...currentEntry, content: e.target.value })}
                placeholder="Write your research notes here..."
                className="w-full h-64 bg-zinc-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono text-sm resize-y"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!currentEntry.content}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
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
            <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-zinc-900/20">
              <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No entries yet</h3>
              <p className="text-zinc-500 mb-6 max-w-sm mx-auto">Start documenting your research journey by creating your first journal entry.</p>
              <button
                onClick={() => openEditor()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Entry
              </button>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-3 sm:p-6 hover:bg-zinc-900/60 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-wide uppercase border border-indigo-500/20">
                      {entry.entry_type}
                    </span>
                    <span className="text-sm text-zinc-500 font-medium">
                      {entry.entry_type === 'Weekly Diary' ? entry.date : format(parseEntryDate(entry.date), 'MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditor(entry)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(entry.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-white/10">
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
