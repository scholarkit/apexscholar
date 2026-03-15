import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Loader2, Brain, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';
import { supermemory } from '../lib/supermemory';
import type { SearchResultItem, UserProfile } from '../lib/supermemory';

interface BrainModalProps {
    onClose: () => void;
}

export default function BrainModal({ onClose }: BrainModalProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState<string | null>(null);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Load profile on mount
    useEffect(() => {
        (async () => {
            try {
                const data = await supermemory.getUserProfile();
                setProfile(data);
            } catch (err: any) {
                setProfileError(err.message || 'Failed to load profile');
            } finally {
                setProfileLoading(false);
            }
        })();
    }, []);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Escape to close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            setHasSearched(false);
            return;
        }
        setSearching(true);
        setSearchError(null);
        setHasSearched(true);
        try {
            const data = await supermemory.searchMemory(q.trim(), { limit: 12 });
            setResults(data.results || []);
        } catch (err: any) {
            setSearchError(err.message || 'Search failed');
            setResults([]);
        } finally {
            setSearching(false);
        }
    }, []);

    const onQueryChange = (value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => handleSearch(value), 400);
    };

    const staticFacts = profile?.profile?.static || [];
    const dynamicFacts = profile?.profile?.dynamic || [];

    return (
        <div
            className="fixed inset-0 z-50 flex bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden animate-in zoom-in-95 duration-200">

                {/* ── Profile Panel ─────────────────────────────── */}
                <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-zinc-950/80 overflow-y-auto custom-scrollbar">
                    <div className="p-6">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/20">
                                <Brain className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white tracking-wide">Nexus</h2>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Memory Profile</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="ml-auto p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {profileLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                                <p className="text-xs text-zinc-500">Loading memory profile…</p>
                            </div>
                        ) : profileError ? (
                            <div className="flex items-start gap-3 p-4 bg-rose-500/5 border border-rose-500/15 rounded-xl">
                                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-rose-300">{profileError}</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Static facts */}
                                <div>
                                    <h3 className="text-[11px] uppercase tracking-widest font-bold text-zinc-500 mb-3 flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                        Core Knowledge
                                    </h3>
                                    {staticFacts.length === 0 ? (
                                        <p className="text-xs text-zinc-600 italic">No core knowledge yet. Use the app to build your profile.</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {staticFacts.map((fact, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-zinc-300 group">
                                                    <ChevronRight className="w-3 h-3 text-indigo-500/50 mt-0.5 flex-shrink-0 group-hover:text-indigo-400 transition-colors" />
                                                    <span className="leading-relaxed">{fact}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {/* Dynamic facts */}
                                <div>
                                    <h3 className="text-[11px] uppercase tracking-widest font-bold text-zinc-500 mb-3 flex items-center gap-2">
                                        <Brain className="w-3.5 h-3.5 text-cyan-400" />
                                        Recent Context
                                    </h3>
                                    {dynamicFacts.length === 0 ? (
                                        <p className="text-xs text-zinc-600 italic">No recent context captured yet.</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {dynamicFacts.map((fact, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-zinc-400 group">
                                                    <ChevronRight className="w-3 h-3 text-cyan-500/50 mt-0.5 flex-shrink-0 group-hover:text-cyan-400 transition-colors" />
                                                    <span className="leading-relaxed">{fact}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* ── Main Panel (Search + Results) ──────────────── */}
                <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950/50">
                    {/* Search Bar */}
                    <div className="p-4 sm:p-6 border-b border-white/10">
                        <div className="relative max-w-2xl mx-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search your memories…"
                                value={query}
                                onChange={e => onQueryChange(e.target.value)}
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                            />
                            {searching && (
                                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />
                            )}
                        </div>
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                        {searchError && (
                            <div className="flex items-start gap-3 p-4 bg-rose-500/5 border border-rose-500/15 rounded-xl mb-4 max-w-2xl mx-auto">
                                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-rose-300">{searchError}</p>
                            </div>
                        )}

                        {!hasSearched && !searching && (
                            <div className="flex flex-col items-center justify-center h-full text-center px-8">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center mb-5 border border-indigo-500/15">
                                    <Brain className="w-8 h-8 text-indigo-400/70" />
                                </div>
                                <h3 className="text-white font-semibold text-base mb-2">Search Your Brain</h3>
                                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                                    Semantically search across all your tracked interactions, decisions, and research activity.
                                </p>
                            </div>
                        )}

                        {hasSearched && !searching && results.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center px-8">
                                <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 border border-white/5">
                                    <Search className="w-6 h-6 text-zinc-600" />
                                </div>
                                <h3 className="text-zinc-400 font-medium text-sm mb-1">No memories found</h3>
                                <p className="text-xs text-zinc-600 max-w-xs">
                                    Try a different search query or use the app more to build up your memory bank.
                                </p>
                            </div>
                        )}

                        {results.length > 0 && (
                            <div className="max-w-2xl mx-auto space-y-3">
                                {results.map((item, i) => (
                                    <div
                                        key={item.documentId || i}
                                        className="group bg-zinc-900/60 border border-white/5 rounded-xl p-4 hover:border-indigo-500/20 transition-all duration-200"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="text-sm font-medium text-white truncate max-w-[80%]">
                                                {item.title || 'Memory'}
                                            </h4>
                                            <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0 ml-2">
                                                {(item.score * 100).toFixed(0)}%
                                            </span>
                                        </div>

                                        {item.summary && (
                                            <p className="text-xs text-zinc-400 mb-3 leading-relaxed line-clamp-2">{item.summary}</p>
                                        )}

                                        {item.chunks.length > 0 && (
                                            <div className="space-y-2">
                                                {item.chunks.filter(c => c.isRelevant).slice(0, 2).map((chunk, ci) => (
                                                    <div key={ci} className="bg-zinc-950/50 border border-white/5 rounded-lg p-3">
                                                        <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">{chunk.content}</p>
                                                        <span className="text-[10px] text-indigo-400/60 mt-1.5 block font-mono">
                                                            relevance {(chunk.score * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {item.metadata && Object.keys(item.metadata).length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {Object.entries(item.metadata).slice(0, 4).map(([k, v]) => (
                                                    <span key={k} className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded-md border border-white/5">
                                                        {k}: {String(v)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
