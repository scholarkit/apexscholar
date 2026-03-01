import { useState, useEffect } from 'react';
import { X, Copy, Check, Quote, Loader2, Sparkles, Search, Globe, FileText, AlertCircle } from 'lucide-react';
import { Resource } from '../lib/puter';
import {
    extractCitationMetadata,
    formatCitation,
    CitationMetadata,
    CitationFormat,
} from '../lib/citationPipeline';

interface CitationModalProps {
    resource: Resource;
    downloadUrl: string;
    onClose: () => void;
}

const FORMAT_LABELS: { id: CitationFormat; label: string }[] = [
    { id: 'bibtex', label: 'BibTeX' },
    { id: 'apa', label: 'APA 7th' },
    { id: 'mla', label: 'MLA 9th' },
    { id: 'chicago', label: 'Chicago' },
];

const SOURCE_BADGE: Record<CitationMetadata['source'], { label: string; color: string; icon: React.ReactNode }> = {
    doi_crossref: { label: 'CrossRef DOI', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <Globe className="w-3 h-3" /> },
    doi_openalex: { label: 'OpenAlex DOI', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: <Globe className="w-3 h-3" /> },
    ai: { label: 'AI Extracted', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: <Sparkles className="w-3 h-3" /> },
    filename: { label: 'Filename Only', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20', icon: <FileText className="w-3 h-3" /> },
};

type Step = { label: string; icon: React.ReactNode; done: boolean };

function PipelineStep({ label, icon, done, active }: Step & { active: boolean }) {
    return (
        <div className={`flex items-center gap-2 text-xs transition-all duration-300 ${done ? 'text-emerald-400' : active ? 'text-indigo-400' : 'text-zinc-600'}`}>
            <span className={`flex-shrink-0 ${active && !done ? 'animate-pulse' : ''}`}>{icon}</span>
            {label}
        </div>
    );
}

export default function CitationModal({ resource, downloadUrl, onClose }: CitationModalProps) {
    const [format, setFormat] = useState<CitationFormat>('bibtex');
    const [copied, setCopied] = useState(false);
    const [meta, setMeta] = useState<CitationMetadata | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [stepIndex, setStepIndex] = useState(0);

    const steps: Omit<Step, 'done'>[] = [
        { label: 'Parsing PDF content', icon: <FileText className="w-3 h-3" /> },
        { label: 'Detecting DOI', icon: <Search className="w-3 h-3" /> },
        { label: 'Looking up metadata', icon: <Globe className="w-3 h-3" /> },
        { label: 'AI analysis fallback', icon: <Sparkles className="w-3 h-3" /> },
    ];

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            try {
                setStepIndex(0);
                // Simulate progress ticks while the async pipeline runs
                const ticker = setInterval(() => {
                    setStepIndex(i => Math.min(i + 1, steps.length - 1));
                }, 1800);

                const result = await extractCitationMetadata(resource.name, resource.type, downloadUrl);

                clearInterval(ticker);
                if (!cancelled) {
                    setStepIndex(steps.length); // all done
                    setMeta(result);
                }
            } catch (err: any) {
                if (!cancelled) setError(err?.message || 'Extraction failed');
            }
        };

        run();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const citation = meta ? formatCitation(meta, format) : '';
    const badge = meta ? SOURCE_BADGE[meta.source] : null;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(citation);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                            <Quote className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-base">Citation Engine</h2>
                            <p className="text-zinc-500 text-xs mt-0.5 truncate max-w-[280px]">{resource.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Loading state */}
                {!meta && !error && (
                    <div className="px-3 sm:px-6 py-3 sm:py-4 space-y-5">
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
                            <span className="text-white font-medium text-sm">Extracting metadata...</span>
                        </div>
                        <div className="space-y-2.5 pl-8">
                            {steps.map((s, i) => (
                                <PipelineStep
                                    key={s.label}
                                    label={s.label}
                                    icon={s.icon}
                                    done={i < stepIndex}
                                    active={i === stepIndex}
                                />
                            ))}
                        </div>
                        <p className="text-zinc-600 text-xs pl-8">This may take a few seconds for large PDFs or DOI lookups.</p>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="px-6 py-8 flex flex-col items-center gap-3 text-center">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <p className="text-white font-medium">Extraction failed</p>
                        <p className="text-zinc-500 text-sm">{error}</p>
                        <button onClick={onClose} className="mt-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm">Close</button>
                    </div>
                )}

                {/* Result */}
                {meta && (
                    <>
                        {/* Metadata summary */}
                        <div className="px-6 pt-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 flex-1 min-w-0">
                                    <p className="text-white font-semibold text-sm leading-snug truncate">{meta.title}</p>
                                    {meta.authors.length > 0 && (
                                        <p className="text-zinc-400 text-xs truncate">{meta.authors.join(', ')}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                                        {meta.year && <span>{meta.year}</span>}
                                        {meta.journal && <span>• {meta.journal}</span>}
                                        {meta.doi && <span className="font-mono truncate max-w-[180px]">• {meta.doi}</span>}
                                    </div>
                                </div>
                                {badge && (
                                    <span className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${badge.color}`}>
                                        {badge.icon}
                                        {badge.label}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Format tabs */}
                        <div className="flex gap-1 px-6 pt-4">
                            {FORMAT_LABELS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFormat(f.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${format === f.id
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Citation output */}
                        <div className="px-3 sm:px-6 pt-1 sm:pt-3 pb-1 sm:pb-6">
                            <pre className="w-full p-4 rounded-xl bg-zinc-950 border border-white/5 text-zinc-300 text-xs font-mono whitespace-pre-wrap break-all leading-relaxed min-h-[80px]">
                                {citation}
                            </pre>
                            <button
                                onClick={handleCopy}
                                className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${copied
                                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                    }`}
                            >
                                {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Citation</>}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
