import {
    Search, BookOpen, Globe, Sparkles, Download, Quote, BookMarked,
    Calendar, Users, Hash, ExternalLink, Loader2, AlertCircle, X, Bookmark, CheckCircle2, Telescope, Library, GraduationCap, Lightbulb, Network, ChevronDown
} from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import { puterService } from '../lib/puter';
import { CitationMetadata } from '../lib/citationPipeline';
import QuickCiteModal from '../components/QuickCiteModal';
import { useCallback, useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Constants ─────────────────────────────────────────────────────────────────
const INSIGHTS_KV_KEY = 'research_paper_insights';
const KG_KV_KEY = 'research_knowledge_graph';

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
    source: 'arxiv' | 'openalex' | 'semanticscholar' | 'googlescholar' | 'pubmed';
    saved?: boolean;
}

export interface PaperInsight {
    paperId: string;
    problem: string;
    task: string;
    domain: string;
    method: string;
    keyIdeas: string[];
    assumptions: string[];
    limitations: string[];
    contributions: string[];
    datasets: string[];
    metrics: string[];
    futureWork: string[];
    confidence: number;
    userEdited?: boolean;
}

export interface KGNode {
    id: string;
    type: 'problem' | 'method' | 'dataset' | 'metric' | 'domain' | 'idea';
    label: string;
    paperIds: string[];
}

export interface KGEdge {
    id: string;
    source: string;
    target: string;
    relation: 'uses' | 'improves' | 'evaluates' | 'applies_to';
}

export interface KGGraph {
    nodes: KGNode[];
    edges: KGEdge[];
}

type SourceFilter = 'all' | 'arxiv' | 'openalex' | 'semanticscholar' | 'googlescholar' | 'pubmed';

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
// ─── Google Scholar API ────────────────────────────────────────────────────────

async function searchGoogleScholar(query: string): Promise<Paper[]> {
    try {
        const res = await fetch("/api/scholar?q=" + encodeURIComponent(query));
        if (!res.ok) return [];
        const data = await res.json();
        return (data.organic_results || []).map((w: any) => {
            const pubInfo = w.publication_info?.summary || "";
            const parts = pubInfo.split(" - ");
            let authors: string[] = [];
            let year = "";
            let journal = "";

            if (parts.length > 0) {
                authors = parts[0].split(",").map((a: string) => a.trim().replace(/…$/, "").trim()).filter(Boolean);
            }
            if (parts.length > 1) {
                const journalYear = parts[1];
                const yearMatch = journalYear.match(/\b(19|20)\d{2}\b/);
                if (yearMatch) {
                    year = yearMatch[0];
                    journal = journalYear.replace(year, "").replace(/,\s*$/, "").trim();
                } else {
                    journal = journalYear;
                }
            }

            return {
                id: `gs:${w.result_id}`,
                title: w.title || 'Untitled',
                authors: authors,
                year: year,
                abstract: w.snippet || '',
                url: w.link,
                journal: journal,
                source: 'googlescholar' as const,
            };
        });
    } catch {
        return [];
    }
}

// ─── PubMed API ────────────────────────────────────────────────────────────────

async function searchPubmed(query: string): Promise<Paper[]> {
    try {
        const res = await fetch("/api/pubmed?q=" + encodeURIComponent(query));
        if (!res.ok) return [];
        const text = await res.text();
        const xml = new DOMParser().parseFromString(text, 'text/xml');
        const articles = Array.from(xml.querySelectorAll('PubmedArticle'));

        return articles.map(article => {
            const pmid = article.querySelector('PMID')?.textContent || '';
            const title = article.querySelector('ArticleTitle')?.textContent?.replace(/\s+/g, ' ').trim() || 'Untitled';

            const authorEls = article.querySelectorAll('AuthorList Author');
            const authors = Array.from(authorEls).map(a => {
                const last = a.querySelector('LastName')?.textContent || '';
                const format = a.querySelector('ForeName')?.textContent || a.querySelector('Initials')?.textContent || '';
                return `${format} ${last}`.trim();
            }).filter(Boolean);

            const year = article.querySelector('PubDate Year')?.textContent || article.querySelector('DateRevised Year')?.textContent || '';

            const abstractEls = article.querySelectorAll('AbstractText');
            // Select all abstract text chunks and combine them
            const abstract = Array.from(abstractEls).map(a => a.textContent?.trim()).filter(Boolean).join('\n\n') || '';

            const doiEl = article.querySelector('ArticleId[IdType="doi"]');
            const doi = doiEl?.textContent?.trim();

            const journal = article.querySelector('Journal Title')?.textContent || '';

            return {
                id: `pubmed:${pmid}`,
                title,
                authors,
                year,
                abstract,
                doi: doi || undefined,
                url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
                journal,
                source: 'pubmed' as const,
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

// ─── Insight Extraction Logic ──────────────────────────────────────────────────

export const INSIGHT_PROMPT = `
You are a research assistant.

Extract structured research insights ONLY from the abstract.

Return STRICT JSON.

{
  "problem": "",
  "task": "",
  "domain": "",
  "method": "",
  "keyIdeas": [],
  "assumptions": [],
  "limitations": [],
  "contributions": [],
  "datasets": [],
  "metrics": [],
  "futureWork": [],
  "confidence": 0
}

Rules:
- Do not hallucinate.
- Use empty values if missing.
- Confidence = 0 to 1.
`;

export function safeParseJSON(text: string) {
    try {
        return JSON.parse(text);
    } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid LLM output");
        return JSON.parse(jsonMatch[0]);
    }
}

export function normalizeInsight(data: any, paperId: string): PaperInsight {
    return {
        paperId,
        problem: data.problem ?? "",
        task: data.task ?? "",
        domain: data.domain ?? "",
        method: data.method ?? "",
        keyIdeas: data.keyIdeas ?? [],
        assumptions: data.assumptions ?? [],
        limitations: data.limitations ?? [],
        contributions: data.contributions ?? [],
        datasets: data.datasets ?? [],
        metrics: data.metrics ?? [],
        futureWork: data.futureWork ?? [],
        confidence: Number(data.confidence ?? 0),
    };
}

export async function extractInsight(paper: Paper): Promise<PaperInsight> {
    const input = `\nTitle: ${paper.title}\nAbstract: ${paper.abstract}\n`;

    // Check if puter.ai.chat exists
    if (!window.puter?.ai?.chat) {
        throw new Error("Puter AI not available.");
    }

    const res = await window.puter.ai.chat(INSIGHT_PROMPT + input, {
        temperature: 0.1,
        model: 'minimax-m2.5',
    });

    const parsed = safeParseJSON(res?.message?.content || "{}");
    return normalizeInsight(parsed, paper.id);
}

// ─── Knowledge Graph Logic ─────────────────────────────────────────────────────

export function extractEntities(insight: PaperInsight) {
    return {
        problems: insight.problem ? [insight.problem] : [],
        methods: insight.method ? [insight.method] : [],
        datasets: insight.datasets || [],
        metrics: insight.metrics || [],
        domains: insight.domain ? [insight.domain] : [],
        ideas: insight.keyIdeas || [],
    };
}

export async function compressConcepts(insight: PaperInsight): Promise<PaperInsight> {
    const COMPRESS_PROMPT = `
You are a concept extraction engine for a Knowledge Graph. 
I will give you a verbose JSON insight extracted from a research paper.
Your job is to COMPRESS every text field into ultra-concise, noun-based conceptual phrases (ideally 1 to 3 words max). 

For example:
"problem": "we address the issue of slow training speeds in deep neural networks" -> "slow training"
"method": "we propose a novel attention-based mechanism that is bidirectional" -> "bidirectional attention"
"domain": "natural language processing for clinical documents" -> "clinical nlp"
"datasets": ["we evaluate on the widely used GLUE benchmark", "SQuAD v2.0 dataset"] -> ["GLUE", "SQuAD v2.0"]

If a field is empty, return it empty. Do NOT summarize abstractly; extract the specific core entity names.
Return STRICT JSON matching the schema I provide.

Input JSON to compress:
${JSON.stringify({
        problem: insight.problem,
        method: insight.method,
        domain: insight.domain,
        datasets: insight.datasets,
        metrics: insight.metrics,
        keyIdeas: insight.keyIdeas
    }, null, 2)}
`;

    if (!window.puter?.ai?.chat) return insight; // Fallback to raw if no AI

    try {
        const res = await window.puter.ai.chat(COMPRESS_PROMPT, {
            temperature: 0.1,
            model: 'claude-3-5-sonnet'
        });
        const parsed = safeParseJSON(res?.message?.content || "{}");

        // Return a hybrid: keep original insight structure but overwrite string fields with compressed versions
        return {
            ...insight,
            problem: parsed.problem || insight.problem,
            method: parsed.method || insight.method,
            domain: parsed.domain || insight.domain,
            datasets: Array.isArray(parsed.datasets) && parsed.datasets.length ? parsed.datasets : insight.datasets,
            metrics: Array.isArray(parsed.metrics) && parsed.metrics.length ? parsed.metrics : insight.metrics,
            keyIdeas: Array.isArray(parsed.keyIdeas) && parsed.keyIdeas.length ? parsed.keyIdeas : insight.keyIdeas
        };
    } catch (e) {
        console.error("Compression failed, using raw strings", e);
        return insight;
    }
}

export function normalize(text: string) {
    if (!text) return '';
    return text.trim().toLowerCase();
}

export function upsertNode(
    graph: KGGraph,
    type: KGNode['type'],
    label: string,
    paperId: string
): KGNode {
    const key = normalize(label);
    if (!key) return null as any;

    let node = graph.nodes.find(
        (n) => n.type === type && normalize(n.label) === key
    );

    if (!node) {
        node = {
            id: crypto.randomUUID(),
            type,
            label,
            paperIds: [paperId],
        };
        graph.nodes.push(node);
    } else {
        if (!node.paperIds.includes(paperId)) {
            node.paperIds.push(paperId);
        }
    }

    return node;
}

export function connect(
    graph: KGGraph,
    source: KGNode,
    target: KGNode,
    relation: KGEdge['relation']
) {
    if (!source || !target) return;
    const exists = graph.edges.find(
        (e) =>
            e.source === source.id &&
            e.target === target.id &&
            e.relation === relation
    );

    if (!exists) {
        graph.edges.push({
            id: crypto.randomUUID(),
            source: source.id,
            target: target.id,
            relation,
        });
    }
}

export function updateGraphFromInsight(
    graph: KGGraph,
    insight: PaperInsight
) {
    const entities = extractEntities(insight);

    const problemNode = entities.problems.length > 0
        ? upsertNode(graph, 'problem', entities.problems[0], insight.paperId)
        : null;

    const methodNode = entities.methods.length > 0
        ? upsertNode(graph, 'method', entities.methods[0], insight.paperId)
        : null;

    if (methodNode && problemNode) {
        connect(graph, methodNode, problemNode, 'applies_to');
    }

    if (methodNode) {
        entities.datasets.forEach((d) => {
            if (!d) return;
            const datasetNode = upsertNode(graph, 'dataset', d, insight.paperId);
            connect(graph, methodNode, datasetNode, 'uses');
        });

        entities.metrics.forEach((m) => {
            if (!m) return;
            const metricNode = upsertNode(graph, 'metric', m, insight.paperId);
            connect(graph, methodNode, metricNode, 'evaluates');
        });
    }
}

// ─── Research Gap Detection ───────────────────────────────────────────────────

export interface ResearchGap {
    method: string;
    domain: string;
}

export function detectGaps(graph: KGGraph): ResearchGap[] {
    const gaps: ResearchGap[] = [];

    const methods = graph.nodes.filter((n) => n.type === "method");
    const domains = graph.nodes.filter((n) => n.type === "domain");

    methods.forEach((m) => {
        domains.forEach((d) => {
            const exists = graph.edges.find(
                (e) =>
                    e.source === m.id &&
                    e.target === d.id &&
                    e.relation === "applies_to"
            );

            if (!exists) {
                gaps.push({
                    method: m.label,
                    domain: d.label,
                });
            }
        });
    });

    return gaps;
}

// ─── Insight Panel Component ───────────────────────────────────────────────────

function InsightPanel({
    insight,
    onSave,
    isOpen,
    setIsOpen,
    isEditing,
    setIsEditing
}: {
    insight: PaperInsight,
    onSave: (i: PaperInsight) => void,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
    isEditing: boolean,
    setIsEditing: (editing: boolean) => void
}) {
    const [localInsight, setLocalInsight] = useState<PaperInsight>(insight);

    useEffect(() => {
        setLocalInsight(insight);
    }, [insight]);

    const handleFieldChange = (field: keyof PaperInsight, value: string | string[]) => {
        let finalValue = value;
        if (Array.isArray(localInsight[field]) && typeof value === 'string') {
            finalValue = value.split('\n').map(s => s.trim()).filter(Boolean);
        }
        setLocalInsight({ ...localInsight, [field]: finalValue, userEdited: true });
    };

    const handleSaveEdits = () => {
        onSave(localInsight);
        setIsEditing(false);
    };

    if (!isOpen) return null;

    return (
        <div className="mt-3 bg-black border border-indigo-500/30 rounded-xl overflow-hidden shadow-xl">
            <div className="bg-indigo-500/10 px-4 py-3 border-b border-indigo-500/20 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#3B82F6]" />
                    <h4 className="text-sm font-semibold text-white">AI Insight</h4>
                </div>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <button onClick={handleSaveEdits} className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-md hover:bg-emerald-500/30 transition-colors">Save</button>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="text-xs px-2 py-1 bg-white/10 text-zinc-300 rounded-md hover:bg-white/20 transition-colors">Edit</button>
                    )}
                    <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white p-1 rounded-md"><X className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto custom-scrollbar text-sm">
                {/* Metadata */}
                <div className="flex gap-4 mb-4 border-b border-[#1f2937] pb-4">
                    <div className="flex-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-500">Domain</span>
                        {isEditing ? (
                            <input value={localInsight.domain} onChange={e => handleFieldChange('domain', e.target.value)} className="w-full bg-zinc-900 border border-white/10 p-1 text-xs text-white rounded outline-none" />
                        ) : <p className="text-zinc-300 font-medium">{localInsight.domain || '—'}</p>}
                    </div>
                    <div className="flex-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-500">Task</span>
                        {isEditing ? (
                            <input value={localInsight.task} onChange={e => handleFieldChange('task', e.target.value)} className="w-full bg-zinc-900 border border-white/10 p-1 text-xs text-white rounded outline-none" />
                        ) : <p className="text-zinc-300 font-medium">{localInsight.task || '—'}</p>}
                    </div>
                </div>

                {/* Core Text Fields */}
                {(['problem', 'method'] as const).map(field => (
                    <div key={field}>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">{field}</span>
                        {isEditing ? (
                            <textarea value={localInsight[field] as string} onChange={e => handleFieldChange(field, e.target.value)} className="w-full bg-zinc-900 border border-white/10 p-2 text-xs text-white rounded outline-none min-h-[60px]" />
                        ) : <p className="text-white bg-white/5 p-2 rounded-lg leading-relaxed text-xs">{localInsight[field] as string || '—'}</p>}
                    </div>
                ))}

                {/* Array Fields */}
                {(['keyIdeas', 'contributions', 'limitations', 'datasets'] as const).map(field => {
                    const arr = localInsight[field] as string[];
                    if (!isEditing && (!arr || arr.length === 0)) return null;
                    return (
                        <div key={field}>
                            <span className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                            {isEditing ? (
                                <textarea
                                    value={arr.join('\n')}
                                    onChange={e => handleFieldChange(field, e.target.value)}
                                    placeholder="One item per line..."
                                    className="w-full bg-zinc-900 border border-white/10 p-2 text-xs text-white rounded outline-none min-h-[80px]"
                                />
                            ) : (
                                <ul className="list-disc pl-4 space-y-1 mt-1">
                                    {arr.map((item, i) => (
                                        <li key={i} className="text-zinc-400 text-xs">{item}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Result Card ───────────────────────────────────────────────────────────────

interface PaperCardProps {
    paper: Paper;
    isSaved: boolean;
    insight?: PaperInsight;
    onImport: (p: Paper) => void;
    onRemove: (p: Paper) => void;
    onCite: (p: Paper) => void;
    onSaveInsight?: (i: PaperInsight) => void;
}

function PaperCard({ paper, isSaved, insight, onImport, onRemove, onCite, onSaveInsight }: PaperCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [isInsightOpen, setIsInsightOpen] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractError, setExtractError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const truncated = paper.abstract.length > 200 && !expanded;
    const abstract = truncated ? paper.abstract.slice(0, 200) + '…' : paper.abstract;

    const handleExtract = async () => {
        if (!onSaveInsight) return;
        setIsExtracting(true);
        setExtractError(null);
        try {
            const res = await extractInsight(paper);
            onSaveInsight(res);
            setIsInsightOpen(true);
        } catch (e: any) {
            setExtractError(e.message || "Extraction failed");
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <div className="bg-zinc-900/40 border border-[#1f2937] rounded-2xl p-2.5 sm:p-5 hover:bg-zinc-900/60 transition-colors group flex flex-col gap-3">
            {/* Source badge + year */}
            <div className="flex items-center justify-between gap-2">
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${paper.source === 'arxiv' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                    paper.source === 'openalex' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                        paper.source === 'googlescholar' ? 'text-[#3B82F6] bg-indigo-500/10 border-indigo-500/20' :
                            paper.source === 'pubmed' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                                'text-teal-400 bg-teal-500/10 border-teal-500/20'
                    }`}>
                    {paper.source === 'arxiv' ? <Sparkles className="w-2.5 h-2.5" /> :
                        paper.source === 'openalex' ? <Globe className="w-2.5 h-2.5" /> :
                            paper.source === 'googlescholar' ? <GraduationCap className="w-2.5 h-2.5" /> :
                                paper.source === 'pubmed' ? <BookMarked className="w-2.5 h-2.5" /> :
                                    <Library className="w-2.5 h-2.5" />}
                    {paper.source === 'arxiv' ? 'arXiv' :
                        paper.source === 'openalex' ? 'OpenAlex' :
                            paper.source === 'googlescholar' ? 'Google Scholar' :
                                paper.source === 'pubmed' ? 'PubMed' : 'Semantic Scholar'}
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
                        <button onClick={() => setExpanded(!expanded)} className="text-xs text-[#3B82F6] hover:text-indigo-300 mt-1">
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
            <div className="mt-auto pt-3 border-t border-[#1f2937] flex flex-wrap items-center gap-2">
                {paper.url && (
                    <a href={paper.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-1 sm:px-2 py-1 sm:py-1.5 rounded-lg hover:bg-white/5"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open
                    </a>
                )}
                <button onClick={() => onCite(paper)}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 px-1 sm:px-2 py-1 sm:py-1.5 rounded-lg transition-colors"
                >
                    <Quote className="w-3.5 h-3.5" />
                    Cite
                </button>

                {isSaved && onSaveInsight && (
                    <>
                        {insight ? (
                            <button onClick={() => setIsInsightOpen(!isInsightOpen)} className={`flex items-center gap-1.5 text-xs px-1 sm:px-2 py-1 sm:py-1.5 rounded-lg transition-colors ${isInsightOpen ? 'text-white bg-indigo-500' : 'text-[#3B82F6] hover:text-indigo-300 hover:bg-indigo-400/10'}`}>
                                <Lightbulb className={isInsightOpen ? "text-amber-200 w-3.5 h-3.5" : "text-amber-400 w-3.5 h-3.5"} />
                                {isInsightOpen ? "Hide Insight" : "View Insight"}
                            </button>
                        ) : (
                            <button onClick={handleExtract} disabled={isExtracting} className="flex items-center gap-1.5 text-xs text-[#3B82F6] hover:text-indigo-300 hover:bg-indigo-400/10 px-1 sm:px-2 py-1 sm:py-1.5 rounded-lg transition-colors disabled:opacity-50">
                                {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                {isExtracting ? "Extracting..." : "Extract Insight"}
                            </button>
                        )}
                    </>
                )}

                {isSaved ? (
                    <button onClick={() => onRemove(paper)}
                        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-red-400 hover:bg-red-400/10 px-1 sm:px-2 py-1 sm:py-1.5 rounded-lg transition-colors ml-auto"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Saved
                    </button>
                ) : (
                    <button onClick={() => onImport(paper)}
                        className="flex items-center gap-1.5 text-xs text-[#3B82F6] hover:text-indigo-300 hover:bg-indigo-400/10 px-1 sm:px-2 py-1 sm:py-1.5 rounded-lg transition-colors ml-auto"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Import
                    </button>
                )}
            </div>

            {/* Extracted error message if any */}
            {extractError && (
                <div className="mt-2 text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
                    {extractError}
                </div>
            )}

            {/* Insight Integration */}
            {isSaved && onSaveInsight && insight && isInsightOpen && (
                <InsightPanel
                    insight={insight}
                    onSave={onSaveInsight}
                    isOpen={isInsightOpen}
                    setIsOpen={setIsInsightOpen}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                />
            )}
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
    const [savedInsights, setSavedInsights] = useState<Record<string, PaperInsight>>({});
    const [graph, setGraph] = useState<KGGraph>({ nodes: [], edges: [] });
    const [loading, setLoading] = useState(false);
    const [isRebuildingGraph, setIsRebuildingGraph] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [citingPaper, setCitingPaper] = useState<Paper | null>(null);
    const [activeTab, setActiveTab] = useState<'search' | 'saved' | 'graph'>('search');

    // Graph interaction state
    const [selectedNode, setSelectedNode] = useState<KGNode | null>(null);

    const [recentQueries, setRecentQueries] = useState<string[]>([]);
    const [recommendations, setRecommendations] = useState<Paper[]>([]);
    const [loadingRecs, setLoadingRecs] = useState(false);

    // Gap Analysis State
    const [detectedGaps, setDetectedGaps] = useState<ResearchGap[]>([]);
    const [gapInsights, setGapInsights] = useState<string>('');
    const [isIdentifyingGap, setIsIdentifyingGap] = useState(false);

    useEffect(() => {
        puterService.kvGet(KV_KEY).then((data: Paper[] | null) => setSavedPapers(data || []));
        puterService.kvGet(INSIGHTS_KV_KEY).then((data: Record<string, PaperInsight> | null) => setSavedInsights(data || {}));
        puterService.kvGet(KG_KV_KEY).then((data: KGGraph | null) => setGraph(data || { nodes: [], edges: [] }));

        puterService.kvGet('research_explore_history').then((data: string[] | null) => {
            const history = data || [];
            setRecentQueries(history);
            if (history.length > 0) {
                const pick = history[Math.floor(Math.random() * history.length)];
                setLoadingRecs(true);
                Promise.all([
                    searchArxiv(pick).catch(() => []),
                    searchOpenAlex(pick).catch(() => []),
                    searchSemanticScholar(pick).catch(() => []),
                    searchGoogleScholar(pick).catch(() => []),
                    searchPubmed(pick).catch(() => [])
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
            if (source === 'all' || source === 'googlescholar') fetchers.push(searchGoogleScholar(query).catch(() => []));
            if (source === 'all' || source === 'pubmed') fetchers.push(searchPubmed(query).catch(() => []));
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

        // Optionally remove insight
        const newInsights = { ...savedInsights };
        delete newInsights[paper.id];
        setSavedInsights(newInsights);
        await puterService.kvSet(INSIGHTS_KV_KEY, newInsights);
    };

    const handleIdentifyGap = async () => {
        if (graph.nodes.length < 2) return;

        setIsIdentifyingGap(true);
        const gaps = detectGaps(graph);
        setDetectedGaps(gaps);

        try {
            const graphContext = JSON.stringify({
                nodes: graph.nodes.map(n => ({ type: n.type, label: n.label })),
                edges: graph.edges.map(e => {
                    const src = graph.nodes.find(n => n.id === e.source)?.label;
                    const tgt = graph.nodes.find(n => n.id === e.target)?.label;
                    return `${src} ${e.relation} ${tgt}`;
                })
            });

            const prompt = `
            Analyze this Research Knowledge Graph and identify high-value research opportunities (gaps).
            
            GRAPH DATA:
            ${graphContext}
            
            DETECTED STRUCTURAL GAPS (Methods not yet applied to Domains):
            ${JSON.stringify(gaps.slice(0, 10))}
            
            Provide:
            1. Top 3 "High-Value" Gaps: Why are they promising?
            2. 2-3 Hypothesis Suggestions: Specific research questions to explore.
            
            Return STRICT Markdown. Keep it concise.
            `;

            const response = await window.puter.ai.chat(prompt, { model: 'gpt-4o' });
            let cleanResponse = response.toString().trim();
            // Strip markdown code block fences if present
            if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/^```[a-z]*\n/i, '').replace(/```$/g, '').trim();
            }
            setGapInsights(cleanResponse);
        } catch (err) {
            console.error(err);
            setGapInsights("Failed to generate AI insights. Please try again.");
        } finally {
            setIsIdentifyingGap(false);
        }
    };

    const handleSaveInsight = async (insight: PaperInsight) => {
        // 1. Save original verbose insight
        const updatedInsights = { ...savedInsights, [insight.paperId]: insight };
        setSavedInsights(updatedInsights);
        await puterService.kvSet(INSIGHTS_KV_KEY, updatedInsights);

        // 2. Rebuild graph from all insights using concept compression
        setIsRebuildingGraph(true);
        try {
            const newGraph: KGGraph = { nodes: [], edges: [] };

            // Compress all sequentially or in parallel (parallel might hit rate limits, but we try Promise.all)
            const insightList = Object.values(updatedInsights);
            const compressedInsights = await Promise.all(
                insightList.map(i => compressConcepts(i))
            );

            compressedInsights.forEach(compressed => updateGraphFromInsight(newGraph, compressed));

            setGraph(newGraph);
            await puterService.kvSet(KG_KV_KEY, newGraph);
        } catch (e) {
            console.error("Failed to build compressed graph", e);
        } finally {
            setIsRebuildingGraph(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white">Explore</h1>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/15 text-[#3B82F6] border border-indigo-500/25 rounded-full">Beta</span>
                </div>
                <p className="text-xs sm:text-base text-zinc-400">Discover papers from arXiv, OpenAlex, Google Scholar and Semantic Scholar. Import them into your knowledge base, and generate citations instantly.</p>
            </header>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 bg-zinc-900/50 border border-[#1f2937] p-1 rounded-xl w-fit">
                {(['search', 'saved', 'graph'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`w-full sm:w-fit px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize flex items-center gap-2 ${activeTab === tab ? 'bg-white/10 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        {tab === 'search' ? <Search className="w-3.5 h-3.5" /> :
                            tab === 'saved' ? <BookMarked className="w-3.5 h-3.5" /> :
                                <Network className="w-3.5 h-3.5" />}
                        {tab === 'search' ? 'Discover' :
                            tab === 'saved' ? 'Knowledge Base' :
                                'Reasoning Graph'}
                        {tab === 'saved' && savedPapers.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-500/20 text-[#3B82F6] rounded-full">{savedPapers.length}</span>
                        )}
                        {tab === 'graph' && graph.nodes.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">{graph.nodes.length}</span>
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

                        <div className="relative group min-w-[160px]">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-hover:text-[#3B82F6] transition-colors pointer-events-none" />
                            <select
                                value={source}
                                onChange={(e) => setSource(e.target.value as SourceFilter)}
                                className="w-full appearance-none pl-11 pr-10 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm cursor-pointer hover:bg-zinc-800 transition-colors"
                            >
                                <option value="all" className="bg-zinc-900">All Sources</option>
                                <option value="arxiv" className="bg-zinc-900">arXiv</option>
                                <option value="openalex" className="bg-zinc-900">OpenAlex</option>
                                <option value="semanticscholar" className="bg-zinc-900">Semantic Scholar</option>
                                <option value="googlescholar" className="bg-zinc-900">Google Scholar</option>
                                <option value="pubmed" className="bg-zinc-900">PubMed</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none transition-transform group-hover:translate-y-[-40%]" />
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
                                <p className="text-zinc-500 text-sm mt-1">Querying arXiv, OpenAlex, Google Scholar and Semantic Scholar simultaneously</p>
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
                                <p className="text-xs sm:text-base text-zinc-500 max-w-sm mx-auto text-sm">Search for research papers from arXiv, OpenAlex, Google Scholar, PubMed and Semantic Scholar. Import any paper into your knowledge base.</p>
                            </div>

                            {loadingRecs ? (
                                <div className="space-y-4 animate-pulse">
                                    <div className="h-6 w-48 bg-zinc-800 rounded"></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[1, 2].map(i => <div key={i} className="h-48 bg-zinc-900 border border-[#1f2937] rounded-2xl"></div>)}
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
                                                insight={savedInsights[paper.id]}
                                                onImport={handleImport}
                                                onRemove={handleRemove}
                                                onCite={setCitingPaper}
                                                onSaveInsight={handleSaveInsight}
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
                                        insight={savedInsights[paper.id]}
                                        onImport={handleImport}
                                        onRemove={handleRemove}
                                        onCite={setCitingPaper}
                                        onSaveInsight={handleSaveInsight}
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
                                    insight={savedInsights[paper.id]}
                                    onImport={handleImport}
                                    onRemove={handleRemove}
                                    onCite={setCitingPaper}
                                    onSaveInsight={handleSaveInsight}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Knowledge Graph Tab */}
            {activeTab === 'graph' && (
                <div className="space-y-4">
                    {isRebuildingGraph && (
                        <div className="flex items-center gap-2 p-3 bg-indigo-500/10 text-[#3B82F6] border border-indigo-500/20 rounded-xl text-sm justify-center mb-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Compressing concepts via AI to build the knowledge graph...
                        </div>
                    )}

                    {graph.nodes.length === 0 && !isRebuildingGraph ? (
                        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-zinc-900/20">
                            <Network className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">Graph is empty</h3>
                            <p className="text-zinc-500 text-sm max-w-sm mx-auto">Extract insights from papers in your Knowledge Base to build the reasoning graph.</p>
                            <button onClick={() => setActiveTab('saved')}
                                className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <BookMarked className="w-4 h-4" />
                                Go to Knowledge Base
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {gapInsights && (
                                <div className="lg:col-span-4 bg-zinc-900/10 border border-indigo-500/30 rounded-xl p-4 shadow-xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="w-4 h-4 text-[#3B82F6]" />
                                        <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Gap Insights</h3>
                                        <button onClick={() => setGapInsights('')} className="ml-auto text-zinc-500 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <div className="prose prose-invert prose-xs max-w-none text-wrap leading-relaxed">
                                        <Markdown remarkPlugins={[remarkGfm]}>{gapInsights}</Markdown>
                                    </div>
                                </div>
                            )}
                            <div className="lg:col-span-3 bg-black border border-white/10 rounded-2xl overflow-hidden relative">
                                {/* Overlay Controls */}
                                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                                    <button
                                        onClick={handleIdentifyGap}
                                        disabled={isIdentifyingGap || graph.nodes.length < 2}
                                        className="bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xl flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        {isIdentifyingGap ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5 text-[#3B82F6]" />}
                                        {isIdentifyingGap ? "Identifying Gaps..." : "Identify Gap"}
                                    </button>
                                </div>
                                <ForceGraph2D
                                    graphData={{ nodes: graph.nodes, links: graph.edges }}
                                    nodeLabel="label"
                                    nodeRelSize={6}
                                    nodeColor={(node: any) => {
                                        if (selectedNode?.id === node.id) return '#fbbf24'; // Amber-400
                                        switch (node.type) {
                                            case 'problem': return '#ef4444'; // Red
                                            case 'method': return '#6366f1'; // Indigo
                                            case 'dataset': return '#10b981'; // Emerald
                                            case 'metric': return '#f59e0b'; // Amber
                                            case 'domain': return '#8b5cf6'; // Violet
                                            default: return '#a1a1aa'; // Zinc
                                        }
                                    }}
                                    linkColor={() => 'rgba(255,255,255,0.1)'}
                                    onNodeClick={(node: any) => setSelectedNode(node)}
                                    // Add basic canvas text drawing for labels
                                    nodeCanvasObjectMode={() => 'after'}
                                    nodeCanvasObject={(node: any, ctx, globalScale) => {
                                        const label = node.label;
                                        const fontSize = 12 / globalScale;
                                        ctx.font = `${fontSize}px Sans-Serif`;
                                        const textWidth = ctx.measureText(label).width;
                                        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                                        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                                        ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'middle';
                                        ctx.fillStyle = node.color || '#fff';
                                        ctx.fillText(label, node.x, node.y);
                                    }}
                                />
                                <div className="absolute top-4 left-4 flex flex-col gap-2 bg-zinc-900/80 backdrop-blur border border-white/10 p-3 rounded-xl">
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Legend</span>
                                    {['problem', 'method', 'dataset', 'metric', 'domain'].map(type => (
                                        <div key={type} className="flex items-center gap-2 text-xs text-zinc-300">
                                            <div className="w-3 h-3 rounded-full" style={{
                                                backgroundColor: type === 'problem' ? '#ef4444' :
                                                    type === 'method' ? '#6366f1' :
                                                        type === 'dataset' ? '#10b981' :
                                                            type === 'metric' ? '#f59e0b' : '#8b5cf6'
                                            }} />
                                            <span className="capitalize">{type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-zinc-900/40 border border-[#1f2937] rounded-2xl p-5 overflow-y-auto space-y-4">
                                {selectedNode ? (
                                    <div className="space-y-6">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#3B82F6]">{selectedNode.type}</span>
                                            <h3 className="text-xl font-bold text-white mt-1 leading-snug">{selectedNode.label}</h3>
                                        </div>

                                        <div>
                                            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Papers in Knowledge Base ({selectedNode.paperIds.length})</h4>
                                            <div className="space-y-3">
                                                {selectedNode.paperIds.map(pid => {
                                                    const p = savedPapers.find(sp => sp.id === pid);
                                                    if (!p) return null;
                                                    return (
                                                        <div key={pid} className="bg-zinc-900/80 border border-[#1f2937] p-3 rounded-xl">
                                                            <div className="text-xs text-zinc-400 mb-1">{p.year}</div>
                                                            <div className="text-sm font-medium text-white leading-snug">{p.title}</div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-zinc-500 text-sm">
                                        <Network className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                                        Click on a node in the graph to see related papers.
                                    </div>
                                )}
                            </div>
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
