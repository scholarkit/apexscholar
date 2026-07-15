import React, { useState } from 'react';
import { Download, Search, AlertCircle, CheckCircle2, Film, Loader2, PlaySquare } from 'lucide-react';
import { triggerFileDownload, convertVttToSrt, convertVttToTxt } from '../utils/subtitleConverter';

interface SubtitleTrack {
  id: number;
  lang: string;
  label: string;
  url: string;
}

export default function VimeoDownloader() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [tracks, setTracks] = useState<SubtitleTrack[]>([]);
  const [downloadingTrackId, setDownloadingTrackId] = useState<number | null>(null);

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

  const handleDownload = async (track: SubtitleTrack, format: 'vtt' | 'srt' | 'txt') => {
    setDownloadingTrackId(track.id);
    try {
      // Fetch via proxy to avoid CORS
      const proxyUrl = `/api/vimeo/proxy?url=${encodeURIComponent(track.url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) throw new Error('Failed to download track from server');
      
      const vttText = await response.text();
      
      let finalContent = vttText;
      let extension = format;

      if (format === 'srt') {
        finalContent = convertVttToSrt(vttText);
      } else if (format === 'txt') {
        finalContent = convertVttToTxt(vttText);
      }

      // Format filename nicely
      const safeTitle = (videoTitle || 'vimeo_video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${safeTitle}_${track.lang}.${extension}`;

      triggerFileDownload(finalContent, filename);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingTrackId(null);
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
          Extract and download subtitle and caption tracks from public Vimeo videos instantly.
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
                  {downloadingTrackId === track.id && (
                    <div className="ml-auto">
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    </div>
                  )}
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
                Downloaded files are for personal, offline educational purposes only.
             </p>
          </div>
        </div>
      )}
    </div>
  );
}
