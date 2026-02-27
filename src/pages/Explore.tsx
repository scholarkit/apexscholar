import { useState, useEffect, useCallback } from 'react';
import {
    Search, BookOpen, Globe, Sparkles, Download, Quote, BookMarked,
    Calendar, Users, Hash, ExternalLink, Loader2, AlertCircle, X, Bookmark, CheckCircle2, Telescope, Library
} from 'lucide-react';
import { puterService } from '../lib/puter';
import { CitationMetadata, formatCitation } from '../lib/citationPipeline';
import QuickCiteModal from '../components/QuickCiteModal';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Paper {
    id: string;
    title: string;
    authors: string[];
    year: string;
    abstract: string;
    doi?: string;
    url?: string;
    journal?: string;
    source: 'arxiv' | 'openalex' | 'semanticscholar';
    saved?: boolean;
}

type SourceFilter = 'all' | 'arxiv' | 'openalex' | 'semanticscholar';

// ─── arXiv API ─────────────────────────────────────────────────────────────────

async function searchArxiv(query: string): Promise<Paper[]> {
    const res = await fetch("/api/arxiv?q=" + query);
    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, 'text/xml');
    const entries = Array.from(xml.querySelectorAll('entry'));

    return entries.map(entry => {
        const idRaw = entry.querySelector('id')?.textContent || '';
        const arxivId = idRaw.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '').split('v')[0];
        const doi = entry.querySelector('arxiv\\:doi, doi')?.textContent?.trim();
        const authorEls = entry.querySelectorAll('author name');
        const published = entry.querySelector('published')?.textContent || '';
        return {
            id: `arxiv:${arxivId}`,
            title: entry.querySelector('title')?.textContent?.replace(/\s+/g, ' ').trim() || 'Untitled',
            authors: Array.from(authorEls).map(a => a.textContent?.trim() || '').filter(Boolean),
            year: published.slice(0, 4),
            abstract: entry.querySelector('summary')?.textContent?.replace(/\s+/g, ' ').trim() || '',
            doi: doi || undefined,
            url: `https://arxiv.org/abs/${arxivId}`,
            journal: 'arXiv preprint',
            source: 'arxiv' as const,
        };
    });
}

// ─── OpenAlex API ──────────────────────────────────────────────────────────────

function reconstructAbstract(idx: Record<string, number[]> | null): string {
    if (!idx) return '';
    const words: string[] = [];
    for (const [word, positions] of Object.entries(idx)) {
        for (const pos of positions) words[pos] = word;
    }
    return words.filter(Boolean).join(' ');
}

async function searchOpenAlex(query: string): Promise<Paper[]> {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=12&select=id,title,authorships,publication_year,doi,primary_location,abstract_inverted_index`;
    const data = await fetch(url).then(r => r.json());
    return (data.results || []).map((w: any) => {
        const doi = w.doi ? w.doi.replace('https://doi.org/', '') : undefined;
        return {
            id: `oa:${w.id}`,
            title: w.title || 'Untitled',
            authors: (w.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean),
            year: w.publication_year?.toString() || '',
            abstract: reconstructAbstract(w.abstract_inverted_index),
            doi,
            url: doi ? `https://doi.org/${doi}` : w.id,
            journal: w.primary_location?.source?.display_name,
            source: 'openalex' as const,
        };
    });
}

// ─── Semantic Scholar API ──────────────────────────────────────────────────────

async function searchSemanticScholar(query: string): Promise<Paper[]> {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=12&fields=title,authors,year,abstract,externalIds,url,venue`;
    try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.data || []).map((w: any) => {
            const doi = w.externalIds?.DOI;
            return {
                id: `s2:${w.paperId}`,
                title: w.title || 'Untitled',
                authors: (w.authors || []).map((a: any) => a.name).filter(Boolean),
                year: w.year?.toString() || '',
                abstract: w.abstract || '',
                doi,
                url: w.url || (doi ? `https://doi.org/${doi}` : undefined),
                journal: w.venue,
                source: 'semanticscholar' as const,
            };
        });
    } catch {
        return [];
    }
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function paperToMeta(paper: Paper): CitationMetadata {
    return {
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        journal: paper.journal,
        doi: paper.doi,
        url: paper.url,
        type: 'article',
        source: paper.doi ? 'doi_crossref' : 'ai',
    };
}

// ─── Result Card ───────────────────────────────────────────────────────────────

interface PaperCardProps {
    paper: Paper;
    isSaved: boolean;
    onImport: (p: Paper) => void;
    onRemove: (p: Paper) => void;
    onCite: (p: Paper) => void;
}

function PaperCard({ paper, isSaved, onImport, onRemove, onCite }: PaperCardProps) {
    const [expanded, setExpanded] = useState(false);
    const truncated = paper.abstract.length > 200 && !expanded;
    const abstract = truncated ? paper.abstract.slice(0, 200) + '…' : paper.abstract;

    return (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 hover:bg-zinc-900/60 transition-colors group flex flex-col gap-3">
            {/* Source badge + year */}
            <div className="flex items-center justify-between gap-2">
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${paper.source === 'arxiv' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                        paper.source === 'openalex' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                            'text-teal-400 bg-teal-500/10 border-teal-500/20'
                    }`}>
                    {paper.source === 'arxiv' ? <Sparkles className="w-2.5 h-2.5" /> :
                        paper.source === 'openalex' ? <Globe className="w-2.5 h-2.5" /> :
                            <Library className="w-2.5 h-2.5" />}
                    {paper.source === 'arxiv' ? 'arXiv' :
                        paper.source === 'openalex' ? 'OpenAlex' : 'Semantic Scholar'}
                </span>
                <span className="text-xs text-zinc-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{paper.year || '—'}</span>
            </div>

            {/* Title */}
            <h3 className="text-white font-semibold text-sm leading-snug">{paper.title}</h3>

            {/* Authors */}
            {paper.authors.length > 0 && (
                <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <Users className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{paper.authors.slice(0, 4).join(', ')}{paper.authors.length > 4 ? ' et al.' : ''}</span>
                </p>
            )}

            {/* Journal */}
            {paper.journal && (
                <p className="text-xs text-zinc-500 flex items-center gap-1.5 italic">
                    <BookOpen className="w-3 h-3 flex-shrink-0" />{paper.journal}
                </p>
            )}

            {/* Abstract */}
            {paper.abstract && (
                <div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{abstract}</p>
                    {paper.abstract.length > 200 && (
                        <button onClick={() => setExpanded(!expanded)} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1">
                            {expanded ? 'Show less' : 'Read more'}
                        </button>
                    )}
                </div>
            )}

            {/* DOI */}
            {paper.doi && (
                <p className="text-xs text-zinc-600 font-mono flex items-center gap-1"><Hash className="w-3 h-3" />{paper.doi}</p>
            )}

            {/* Actions */}
            <div className="mt-auto pt-3 border-t border-white/5 flex items-center gap-2">
                {paper.url && (
                    <a href={paper.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open
                    </a>
                )}
                <button onClick={() => onCite(paper)}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 px-2 py-1.5 rounded-lg transition-colors"
                >
                    <Quote className="w-3.5 h-3.5" />
                    Cite
                </button>
                {isSaved ? (
                    <button onClick={() => onRemove(paper)}
                        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-red-400 hover:bg-red-400/10 px-2 py-1.5 rounded-lg transition-colors ml-auto"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Saved
                    </button>
                ) : (
                    <button onClick={() => onImport(paper)}
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 px-2 py-1.5 rounded-lg transition-colors ml-auto"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Import
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const KV_KEY = 'research_knowledgebase';

export default function Explore() {
    const [query, setQuery] = useState('');
    const [source, setSource] = useState<SourceFilter>('all');
    const [results, setResults] = useState<Paper[]>([]);
    const [savedPapers, setSavedPapers] = useState<Paper[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [citingPaper, setCitingPaper] = useState<Paper | null>(null);
    const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search');

    const [recentQueries, setRecentQueries] = useState<string[]>([]);
    const [recommendations, setRecommendations] = useState<Paper[]>([]);
    const [loadingRecs, setLoadingRecs] = useState(false);

    useEffect(() => {
        puterService.kvGet(KV_KEY).then((data: Paper[] | null) => setSavedPapers(data || []));

        puterService.kvGet('research_explore_history').then((data: string[] | null) => {
            const history = data || [];
            setRecentQueries(history);
            if (history.length > 0) {
                const pick = history[Math.floor(Math.random() * history.length)];
                setLoadingRecs(true);
                Promise.all([
                    searchArxiv(pick).catch(() => []),
                    searchOpenAlex(pick).catch(() => []),
                    searchSemanticScholar(pick).catch(() => [])
                ]).then(batches => {
                    const merged = batches.flat();
                    merged.sort(() => Math.random() - 0.5); // Shuffle for variety
                    setRecommendations(merged.slice(0, 4)); // Show 4 recommendations
                    setLoadingRecs(false);
                });
            }
        });
    }, []);

    const savedIds = new Set(savedPapers.map(p => p.id));

    const handleSearch = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setError(null);
        setResults([]);

        // Save history
        const updatedHistory = [query, ...recentQueries.filter(q => q !== query)].slice(0, 5);
        setRecentQueries(updatedHistory);
        puterService.kvSet('research_explore_history', updatedHistory).catch(console.error);

        try {
            const fetchers: Promise<Paper[]>[] = [];
            if (source === 'all' || source === 'arxiv') fetchers.push(searchArxiv(query).catch(() => []));
            if (source === 'all' || source === 'openalex') fetchers.push(searchOpenAlex(query).catch(() => []));
            if (source === 'all' || source === 'semanticscholar') fetchers.push(searchSemanticScholar(query).catch(() => []));
            const batches = await Promise.all(fetchers);
            const merged = batches.flat();
            // Sort by year desc
            merged.sort((a, b) => {
                const diff = parseInt(b.year || '0') - parseInt(a.year || '0');
                if (diff !== 0) return diff;
                return Math.random() - 0.5; // randomize ties
            });
            setResults(merged);
            if (merged.length === 0) setError('No results found. Try a different query.');
        } catch (err) {
            setError('Search failed. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, [query, source]);

    const handleImport = async (paper: Paper) => {
        const updated = [{ ...paper, saved: true }, ...savedPapers.filter(p => p.id !== paper.id)];
        setSavedPapers(updated);
        await puterService.kvSet(KV_KEY, updated);
    };

    const handleRemove = async (paper: Paper) => {
        const updated = savedPapers.filter(p => p.id !== paper.id);
        setSavedPapers(updated);
        await puterService.kvSet(KV_KEY, updated);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Explore</h1>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 rounded-full">Beta</span>
                </div>
                <p className="text-zinc-400">Discover papers from arXiv, OpenAlex, and Semantic Scholar. Import them into your knowledge base, and generate citations instantly.</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-1 bg-zinc-900/50 border border-white/5 p-1 rounded-xl w-fit">
                {(['search', 'saved'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize flex items-center gap-2 ${activeTab === tab ? 'bg-white/10 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        {tab === 'search' ? <Search className="w-3.5 h-3.5" /> : <BookMarked className="w-3.5 h-3.5" />}
                        {tab === 'search' ? 'Discover' : `Knowledge Base`}
                        {tab === 'saved' && savedPapers.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-full">{savedPapers.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search Tab */}
            {activeTab === 'search' && (
                <div className="space-y-6">
                    {/* Search bar */}
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search papers, titles, authors, topics…"
                                className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-zinc-600 text-sm"
                            />
                            {query && (
                                <button type="button" onClick={() => { setQuery(''); setResults([]); setError(null); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex bg-zinc-900 border border-white/10 rounded-xl p-1 gap-1">
                            {(['all', 'arxiv', 'openalex', 'semanticscholar'] as SourceFilter[]).map(s => (
                                <button key={s} type="button" onClick={() => setSource(s)}
                                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${source === s ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    {s === 'all' ? 'All Sources' : s === 'arxiv' ? 'arXiv' : s === 'openalex' ? 'OpenAlex' : 'Semantic Scholar'}
                                </button>
                            ))}
                        </div>

                        <button type="submit" disabled={loading || !query.trim()}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Search
                        </button>
                    </form>

                    {/* Loading */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="relative">
                                <div className="w-14 h-14 border-4 border-indigo-500/20 rounded-full animate-pulse" />
                                <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium">Searching across sources…</p>
                                <p className="text-zinc-500 text-sm mt-1">Querying arXiv, OpenAlex, and Semantic Scholar simultaneously</p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && !loading && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Empty state & Recommendations */}
                    {!loading && !error && results.length === 0 && (
                        <div className="space-y-8">
                            <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-zinc-900/20">
                                <Telescope className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">Ready to explore</h3>
                                <p className="text-zinc-500 max-w-sm mx-auto text-sm">Search for research papers from arXiv, OpenAlex, and Semantic Scholar. Import any paper into your knowledge base.</p>
                            </div>

                            {loadingRecs ? (
                                <div className="space-y-4 animate-pulse">
                                    <div className="h-6 w-48 bg-zinc-800 rounded"></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[1, 2].map(i => <div key={i} className="h-48 bg-zinc-900 border border-white/5 rounded-2xl"></div>)}
                                    </div>
                                </div>
                            ) : recommendations.length > 0 ? (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles className="w-4 h-4 text-amber-400" />
                                        <h3 className="text-white font-medium">Recommended based on your searches</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {recommendations.map(paper => (
                                            <PaperCard
                                                key={paper.id}
                                                paper={paper}
                                                isSaved={savedIds.has(paper.id)}
                                                onImport={handleImport}
                                                onRemove={handleRemove}
                                                onCite={setCitingPaper}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Results */}
                    {results.length > 0 && !loading && (
                        <div>
                            <p className="text-zinc-500 text-sm mb-4">{results.length} results for <span className="text-white font-medium">"{query}"</span></p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {results.map(paper => (
                                    <PaperCard
                                        key={paper.id}
                                        paper={paper}
                                        isSaved={savedIds.has(paper.id)}
                                        onImport={handleImport}
                                        onRemove={handleRemove}
                                        onCite={setCitingPaper}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Knowledge Base Tab */}
            {activeTab === 'saved' && (
                <div className="space-y-4">
                    {savedPapers.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-zinc-900/20">
                            <Bookmark className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">No papers saved yet</h3>
                            <p className="text-zinc-500 text-sm max-w-sm mx-auto">Search for papers and click <strong>Import</strong> to add them here.</p>
                            <button onClick={() => setActiveTab('search')}
                                className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Search className="w-4 h-4" />
                                Start Searching
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {savedPapers.map(paper => (
                                <PaperCard
                                    key={paper.id}
                                    paper={paper}
                                    isSaved={true}
                                    onImport={handleImport}
                                    onRemove={handleRemove}
                                    onCite={setCitingPaper}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Citation Modal */}
            {citingPaper && (
                <QuickCiteModal
                    meta={paperToMeta(citingPaper)}
                    onClose={() => setCitingPaper(null)}
                />
            )}
        </div>
    );
}
