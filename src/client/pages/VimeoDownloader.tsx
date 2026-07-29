import React, { useState } from 'react';
import { 
  Download, 
  Search, 
  AlertCircle, 
  Film, 
  Loader2, 
  PlaySquare, 
  Eye, 
  BookmarkPlus, 
  Copy, 
  Check, 
  X, 
  Folder, 
  Calendar, 
  FileText, 
  BookOpen 
} from 'lucide-react';
import { triggerFileDownload, convertVttToSrt, convertVttToTxt } from '../utils/subtitleConverter';
import { useProject } from '../contexts/ProjectContext';
import { useToast } from '../contexts/ToastContext';
import { journalService } from '../lib/journal';

interface SubtitleTrack {
  id: number;
  lang: string;
  label: string;
  url: string;
}

export default function VimeoDownloader() {
  const { projects, activeProject } = useProject();
  const { toast } = useToast();

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [tracks, setTracks] = useState<SubtitleTrack[]>([]);
  const [downloadingTrackId, setDownloadingTrackId] = useState<number | null>(null);

  // Preview Modal State
  const [previewTrack, setPreviewTrack] = useState<{
    track: SubtitleTrack;
    format: 'txt' | 'vtt' | 'srt';
    vttText: string;
    formattedText: string;
  } | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<number | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Quick Save Modal State
  const [saveModalTrack, setSaveModalTrack] = useState<{
    track: SubtitleTrack;
    rawTxt: string;
  } | null>(null);
  const [loadingSaveTrackId, setLoadingSaveTrackId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [journalTitle, setJournalTitle] = useState('');
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalType, setJournalType] = useState('video_notes');
  const [journalNotes, setJournalNotes] = useState('');
  const [savingJournal, setSavingJournal] = useState(false);

  const isValidVimeoUrl = (input: string) => {
    const vimeoRegExp = /(?:videos?\/|vimeo\.com\/)(?:channels\/[^/]+\/|groups\/[^/]+\/forum\/discussion\/|album\/[^/]+\/video\/|showcase\/[^/]+\/video\/)?([0-9]+)/;
    return vimeoRegExp.test(input);
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVideoTitle(null);
    setTracks([]);

    if (!url.trim()) {
      setError('Please enter a Vimeo URL');
      return;
    }

    if (!isValidVimeoUrl(url)) {
      setError('Invalid Vimeo URL format. Example: https://vimeo.com/123456789');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/vimeo/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract video data');
      }

      setVideoTitle(data.title);
      setTracks(data.tracks);

      if (data.tracks.length === 0) {
        setError('No subtitle tracks found for this video.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching video details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackVtt = async (track: SubtitleTrack): Promise<string> => {
    const proxyUrl = `/api/vimeo/proxy?url=${encodeURIComponent(track.url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Failed to download track from server');
    return await response.text();
  };

  const handleDownload = async (track: SubtitleTrack, format: 'vtt' | 'srt' | 'txt') => {
    setDownloadingTrackId(track.id);
    try {
      const vttText = await fetchTrackVtt(track);
      let finalContent = vttText;
      let extension = format;

      if (format === 'srt') {
        finalContent = convertVttToSrt(vttText);
      } else if (format === 'txt') {
        finalContent = convertVttToTxt(vttText);
      }

      const safeTitle = (videoTitle || 'vimeo_video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${safeTitle}_${track.lang}.${extension}`;

      triggerFileDownload(finalContent, filename);
      toast(`Downloaded ${filename}`, 'success');
    } catch (err: any) {
      toast(`Download failed: ${err.message}`, 'error');
    } finally {
      setDownloadingTrackId(null);
    }
  };

  const handleOpenPreview = async (track: SubtitleTrack, format: 'txt' | 'vtt' | 'srt' = 'txt') => {
    setLoadingPreviewId(track.id);
    try {
      let vttText = previewTrack?.track.id === track.id ? previewTrack.vttText : '';
      if (!vttText) {
        vttText = await fetchTrackVtt(track);
      }

      let formattedText = vttText;
      if (format === 'srt') {
        formattedText = convertVttToSrt(vttText);
      } else if (format === 'txt') {
        formattedText = convertVttToTxt(vttText);
      }

      setPreviewTrack({
        track,
        format,
        vttText,
        formattedText,
      });
      setCopiedPreview(false);
    } catch (err: any) {
      toast(`Failed to load preview: ${err.message}`, 'error');
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const handleSwitchPreviewFormat = (format: 'txt' | 'vtt' | 'srt') => {
    if (!previewTrack) return;
    let formattedText = previewTrack.vttText;
    if (format === 'srt') {
      formattedText = convertVttToSrt(previewTrack.vttText);
    } else if (format === 'txt') {
      formattedText = convertVttToTxt(previewTrack.vttText);
    }
    setPreviewTrack({
      ...previewTrack,
      format,
      formattedText,
    });
    setCopiedPreview(false);
  };

  const handleCopyPreview = () => {
    if (!previewTrack) return;
    navigator.clipboard.writeText(previewTrack.formattedText);
    setCopiedPreview(true);
    toast('Transcript copied to clipboard', 'info');
    setTimeout(() => setCopiedPreview(false), 2500);
  };

  const handleOpenSaveModal = async (track: SubtitleTrack) => {
    setLoadingSaveTrackId(track.id);
    try {
      let rawTxt = '';
      if (previewTrack?.track.id === track.id) {
        rawTxt = convertVttToTxt(previewTrack.vttText);
      } else {
        const vtt = await fetchTrackVtt(track);
        rawTxt = convertVttToTxt(vtt);
      }

      setSaveModalTrack({ track, rawTxt });
      setSelectedProjectId(activeProject?.id || projects[0]?.id || '');
      setJournalTitle(videoTitle ? `Video Notes: ${videoTitle}` : 'Vimeo Video Summary');
      setJournalDate(new Date().toISOString().split('T')[0]);
      setJournalType('video_notes');
      setJournalNotes('');
    } catch (err: any) {
      toast(`Failed to prepare journal entry: ${err.message}`, 'error');
    } finally {
      setLoadingSaveTrackId(null);
    }
  };

  const handleSaveJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveModalTrack) return;
    if (!selectedProjectId) {
      toast('Please select a project to save the entry', 'error');
      return;
    }
    if (!journalTitle.trim()) {
      toast('Please provide a title for the entry', 'error');
      return;
    }

    setSavingJournal(true);
    try {
      const content = `# ${journalTitle.trim()}

**Video Source**: [${videoTitle || 'Vimeo Video'}](${url})
**Subtitle Track**: ${saveModalTrack.track.label} (${saveModalTrack.track.lang})
**Saved Date**: ${journalDate}

${journalNotes.trim() ? `## Key Notes & Takeaways\n${journalNotes.trim()}\n\n` : ''}## Transcript & Summary
${saveModalTrack.rawTxt}`;

      await journalService.createEntry({
        project_id: selectedProjectId,
        date: journalDate,
        type: journalType,
        content,
      });

      const targetProj = projects.find((p) => p.id === selectedProjectId);
      toast(`Journal entry saved to ${targetProj ? targetProj.name : 'Project'}!`, 'success');
      setSaveModalTrack(null);
    } catch (err: any) {
      toast(`Failed to save journal entry: ${err.message}`, 'error');
    } finally {
      setSavingJournal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Film className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Vimeo Subtitle Downloader</h1>
        </div>
        <p className="text-zinc-400 text-sm">
          Extract, preview, download, and journal subtitle tracks from public Vimeo videos instantly.
        </p>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

        <form onSubmit={handleExtract} className="relative space-y-4">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium text-zinc-300 ml-1 block">
              Video URL
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-zinc-500">
                <Search className="w-5 h-5" />
              </div>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://vimeo.com/..."
                className="w-full pl-12 pr-32 py-4 bg-black/20 border border-white/10 hover:border-white/20 focus:border-indigo-500/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="absolute right-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-all duration-300 shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting</span>
                  </>
                ) : (
                  <span>Extract</span>
                )}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-2 mt-3 text-rose-400 text-sm bg-rose-500/10 px-4 py-3 rounded-xl border border-rose-500/20 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </form>
      </div>

      {videoTitle && tracks.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 px-1">
            <PlaySquare className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white truncate" title={videoTitle}>
              {videoTitle}
            </h2>
            <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-zinc-300 ml-auto flex-shrink-0">
              {tracks.length} track{tracks.length !== 1 && 's'} found
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tracks.map((track) => (
              <div 
                key={track.id} 
                className="group flex flex-col justify-between p-5 bg-[var(--color-surface)] border border-white/5 hover:border-indigo-500/30 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-300 font-medium uppercase tracking-wider text-sm border border-white/10 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-colors">
                    {track.lang.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{track.label}</h3>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">{track.lang}</p>
                  </div>
                  {(downloadingTrackId === track.id || loadingPreviewId === track.id || loadingSaveTrackId === track.id) && (
                    <div className="ml-auto">
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Quick Action Toolbar: Preview & Quick Save */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => handleOpenPreview(track)}
                    disabled={loadingPreviewId === track.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 hover:text-indigo-200 rounded-lg text-xs font-medium transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => handleOpenSaveModal(track)}
                    disabled={loadingSaveTrackId === track.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 hover:text-emerald-200 rounded-lg text-xs font-medium transition-all"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Save to Journal</span>
                  </button>
                </div>
                
                <div className="flex items-center gap-2 mt-auto">
                  {(['srt', 'vtt', 'txt'] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => handleDownload(track, format)}
                      disabled={downloadingTrackId !== null}
                      className="flex-1 flex justify-center items-center gap-1.5 py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium text-zinc-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                    >
                      <Download className="w-3 h-3 text-zinc-500 group-hover/btn:text-indigo-400 transition-colors" />
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
             <p className="text-xs text-zinc-600 flex items-center gap-1.5 bg-black/20 px-4 py-2 rounded-full border border-white/5">
                <AlertCircle className="w-3 h-3" />
                Downloaded files and summaries are for personal, offline educational purposes only.
             </p>
          </div>
        </div>
      )}

      {/* --- PREVIEW MODAL --- */}
      {previewTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--color-surface)] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base">
                    Transcript Preview — {previewTrack.track.label}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate max-w-md">
                    {videoTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewTrack(null)}
                className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Format Toggle Bar & Copy Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-black/30 border-b border-white/5">
              <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                {(['txt', 'srt', 'vtt'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleSwitchPreviewFormat(fmt)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium uppercase transition-all ${
                      previewTrack.format === fmt
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPreview}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white rounded-lg transition-all"
                >
                  {copiedPreview ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleOpenSaveModal(previewTrack.track)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-medium text-emerald-300 hover:text-emerald-200 rounded-lg transition-all"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save to Journal</span>
                </button>
              </div>
            </div>

            {/* Scrollable Preview Content */}
            <div className="p-5 flex-1 overflow-y-auto font-mono text-xs text-zinc-300 leading-relaxed bg-black/40 space-y-2 whitespace-pre-wrap selection:bg-indigo-500/30">
              {previewTrack.formattedText || 'No transcript text available.'}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-end gap-3 bg-black/20">
              <button
                onClick={() => setPreviewTrack(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleDownload(previewTrack.track, previewTrack.format)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-indigo-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Download {previewTrack.format.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- QUICK SAVE TO JOURNAL MODAL --- */}
      {saveModalTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--color-surface)] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <BookmarkPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base">Quick Save to Journal</h3>
                  <p className="text-xs text-zinc-400">
                    Save video transcript and notes as a research journal entry
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSaveModalTrack(null)}
                className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveJournalEntry} className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Select Project */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  Target Project <span className="text-rose-400">*</span>
                </label>
                {projects.length > 0 ? (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id} className="bg-zinc-900 text-white">
                        {proj.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs">
                    No projects found. Please create a project first before saving journal entries.
                  </div>
                )}
              </div>

              {/* Title & Category Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Entry Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={journalTitle}
                    onChange={(e) => setJournalTitle(e.target.value)}
                    required
                    placeholder="Enter journal title..."
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    Entry Type
                  </label>
                  <select
                    value={journalType}
                    onChange={(e) => setJournalType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="video_notes" className="bg-zinc-900">Video Notes</option>
                    <option value="summary" className="bg-zinc-900">Summary</option>
                    <option value="transcript" className="bg-zinc-900">Transcript</option>
                    <option value="paper" className="bg-zinc-900">Paper/Resource</option>
                    <option value="note" className="bg-zinc-900">General Note</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Date
                </label>
                <input
                  type="date"
                  value={journalDate}
                  onChange={(e) => setJournalDate(e.target.value)}
                  className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* User Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Personal Takeaways & Notes (Optional)
                </label>
                <textarea
                  value={journalNotes}
                  onChange={(e) => setJournalNotes(e.target.value)}
                  placeholder="Add key insights, thoughts, or reflections about this video summary..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-600 resize-none"
                />
              </div>

              {/* Preview of Transcript payload */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 block">
                  Attached Transcript Preview
                </label>
                <div className="max-h-36 overflow-y-auto p-3 bg-black/50 border border-white/5 rounded-xl font-mono text-[11px] text-zinc-400 whitespace-pre-wrap">
                  {saveModalTrack.rawTxt.slice(0, 500)}
                  {saveModalTrack.rawTxt.length > 500 && '... [Truncated preview]'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSaveModalTrack(null)}
                  className="px-4 py-2.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingJournal || !selectedProjectId}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  {savingJournal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Entry...</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-4 h-4" />
                      <span>Save Journal Entry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
