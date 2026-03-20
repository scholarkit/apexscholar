import { useState } from 'react';
import { X, Copy, Check, Quote } from 'lucide-react';
import { CitationMetadata, CitationFormat, formatCitation } from '../lib/citationPipeline';

interface QuickCiteModalProps {
    meta: CitationMetadata;
    onClose: () => void;
}

const FORMAT_LABELS: { id: CitationFormat; label: string }[] = [
    { id: 'bibtex', label: 'BibTeX' },
    { id: 'apa', label: 'APA 7th' },
    { id: 'mla', label: 'MLA 9th' },
    { id: 'chicago', label: 'Chicago' },
];

export default function QuickCiteModal({ meta, onClose }: QuickCiteModalProps) {
    const [format, setFormat] = useState<CitationFormat>('bibtex');
    const [copied, setCopied] = useState(false);

    const citation = formatCitation(meta, format);

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
                className="w-full max-w-xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b    border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <Quote className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-base">Generate Citation</h2>
                            <p className="text-zinc-500 text-xs mt-0.5 truncate max-w-[280px]">{meta.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Metadata summary */}
                <div className="px-6 pt-5 pb-2">
                    <div className="p-3 rounded-xl bg-black border    border-[var(--color-border)] space-y-1">
                        <p className="text-white text-sm font-medium leading-snug">{meta.title}</p>
                        {meta.authors.length > 0 && (
                            <p className="text-zinc-400 text-xs">{meta.authors.join(', ')}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                            {meta.year && <span>{meta.year}</span>}
                            {meta.journal && <span>• {meta.journal}</span>}
                            {meta.doi && <span className="font-mono">• doi:{meta.doi}</span>}
                        </div>
                    </div>
                </div>

                {/* Format Tabs */}
                <div className="flex gap-1 px-6 pt-3">
                    {FORMAT_LABELS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFormat(f.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${format === f.id
                                ? 'bg-indigo-500 text-white  '
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Citation Output */}
                <div className="px-6 pt-3 pb-6">
                    <pre className="w-full p-4 rounded-xl bg-black border    border-[var(--color-border)] text-zinc-300 text-xs font-mono whitespace-pre-wrap break-all leading-relaxed min-h-[80px]">
                        {citation}
                    </pre>
                    <button
                        onClick={handleCopy}
                        className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${copied
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-indigo-500 hover:bg-indigo-600 text-white  '
                            }`}
                    >
                        {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Citation</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
