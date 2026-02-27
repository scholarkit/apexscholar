/**
 * Citation Generation Pipeline
 *
 * 1. Extract embedded PDF metadata (title, author, etc.)
 * 2. Extract text from first ~3 pages
 * 3. Detect DOI via regex across all text
 * 4. DOI lookup: CrossRef (primary) → OpenAlex (fallback)
 * 5. AI fallback via Puter.js if DOI missing or metadata incomplete
 * 6. Return structured CitationMetadata for formatting
 */

import * as pdfjsLib from 'pdfjs-dist';

// Vite/ESM worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CitationMetadata {
  title: string;
  authors: string[];
  year: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  publisher?: string;
  url?: string;
  type: 'article' | 'misc';
  /** How the metadata was ultimately sourced */
  source: 'doi_crossref' | 'doi_openalex' | 'ai' | 'filename';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DOI_REGEX = /\b(10\.\d{4,}\/[^\s"<>{}|\\^`\[\]]+)/g;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getFormattedDate(dateStr: string) {
  const d = new Date(dateStr);
  return { year: d.getFullYear(), month: MONTH_NAMES[d.getMonth()], day: d.getDate() };
}

function citationKey(authors: string[], year: string) {
  const first = authors[0]?.split(/\s+/).pop()?.replace(/[^a-zA-Z]/g, '') || 'anon';
  return `${first.toLowerCase()}${year}`;
}

// ─── Step 1 & 2: PDF text + embedded metadata ─────────────────────────────────

async function extractPdfContent(url: string): Promise<{ text: string; embeddedTitle?: string; embeddedAuthor?: string }> {
  try {
    const loadingTask = pdfjsLib.getDocument({ url, withCredentials: false });
    const pdf = await loadingTask.promise;

    // Embedded metadata
    const metaResult = await pdf.getMetadata().catch(() => null);
    const info = (metaResult?.info as any) || {};
    const embeddedTitle = typeof info.Title === 'string' && info.Title.trim() ? info.Title.trim() : undefined;
    const embeddedAuthor = typeof info.Author === 'string' && info.Author.trim() ? info.Author.trim() : undefined;

    // Text from first 3 pages
    const maxPages = Math.min(pdf.numPages, 3);
    const pageTexts: string[] = [];
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item: any) => item.str).join(' '));
    }

    return { text: pageTexts.join('\n\n'), embeddedTitle, embeddedAuthor };
  } catch (err) {
    console.warn('[CitationPipeline] PDF parsing failed:', err);
    return { text: '' };
  }
}

// ─── Step 3: DOI detection ────────────────────────────────────────────────────

function detectDoi(text: string): string | null {
  const matches = [...text.matchAll(new RegExp(DOI_REGEX.source, 'g'))];
  if (!matches.length) return null;
  // Prefer DOIs in the first match (likely header/abstract area)
  let doi = matches[0][1];
  // Clean trailing punctuation that often gets swept up
  doi = doi.replace(/[.,;)\]]+$/, '');
  doi = doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
  return doi;
}

// ─── Step 4: DOI API lookup ───────────────────────────────────────────────────

async function lookupCrossRef(doi: string): Promise<Partial<CitationMetadata> | null> {
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { 'User-Agent': 'ResearchDashboardPro/1.0 (mailto:app@research.pro)' },
    });
    if (!res.ok) {
      console.warn(`[CitationPipeline] CrossRef returned ${res.status} for DOI: ${doi}`);
      return null;
    }
    const { message } = await res.json();

    const authors = (message.author || []).map((a: any) =>
      [a.given, a.family].filter(Boolean).join(' ')
    );
    const year = message.published?.['date-parts']?.[0]?.[0]?.toString()
      || message['published-print']?.['date-parts']?.[0]?.[0]?.toString()
      || '';
    const title = (message.title || [])[0] || '';
    const journal = (message['container-title'] || [])[0];
    const volume = message.volume;
    const issue = message.issue;
    const pages = message.page;
    const publisher = message.publisher;
    const url = message.URL || `https://doi.org/${doi}`;

    return { title, authors, year, journal, volume, issue, pages, doi, publisher, url, type: 'article', source: 'doi_crossref' };
  } catch {
    return null;
  }
}

async function lookupOpenAlex(doi: string): Promise<Partial<CitationMetadata> | null> {
  try {
    const res = await fetch(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}?select=title,authorships,publication_year,primary_location,biblio`);
    if (!res.ok) {
      console.warn(`[CitationPipeline] OpenAlex returned ${res.status} for DOI: ${doi}`);
      return null;
    }
    const data = await res.json();

    const authors = (data.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean);
    const year = data.publication_year?.toString() || '';
    const title = data.title || '';
    const journal = data.primary_location?.source?.display_name;
    const volume = data.biblio?.volume;
    const issue = data.biblio?.issue;
    const pages = data.biblio?.first_page && data.biblio?.last_page
      ? `${data.biblio.first_page}–${data.biblio.last_page}`
      : data.biblio?.first_page;
    const url = data.doi ? `https://doi.org/${doi}` : undefined;

    return { title, authors, year, journal, volume, issue, pages, doi, url, type: 'article', source: 'doi_openalex' };
  } catch {
    return null;
  }
}

function isMetadataSufficient(m: Partial<CitationMetadata>): boolean {
  return !!(m.title && m.authors?.length && m.year);
}

// ─── Step 5: AI fallback via Puter.js ────────────────────────────────────────

async function aiExtractMetadata(text: string, filename: string): Promise<Partial<CitationMetadata>> {
  const puter = window.puter;
  try {
    const snippet = text.slice(0, 3000); // keep prompt manageable
    const prompt = `You are a citation metadata extractor. Given the text from the first page of an academic paper (or a filename if no text is available), extract the following fields as a JSON object. Return ONLY valid JSON, no markdown, no explanation.

Fields to extract:
- title (string)
- authors (array of strings, "First Last" format)
- year (string, 4-digit)
- journal (string or null)
- volume (string or null)
- issue (string or null)
- pages (string or null, e.g. "123-145")
- publisher (string or null)
- doi (string or null)

Filename: ${filename}
First-page text:
${snippet || '(no text available, use filename only)'}

JSON:`;

    const response = await puter.ai.chat(prompt);
    const raw = typeof response === 'string' ? response : response?.message?.content || '';
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      title: parsed.title || filename.replace(/\.[^.]+$/, ''),
      authors: Array.isArray(parsed.authors) ? parsed.authors.filter(Boolean) : [],
      year: parsed.year || new Date().getFullYear().toString(),
      journal: parsed.journal || undefined,
      volume: parsed.volume || undefined,
      issue: parsed.issue || undefined,
      pages: parsed.pages || undefined,
      publisher: parsed.publisher || undefined,
      doi: parsed.doi || undefined,
      type: 'article',
      source: 'ai',
    };
  } catch (err) {
    console.warn('[CitationPipeline] AI extraction failed:', err);
    return { title: filename.replace(/\.[^.]+$/, ''), authors: [], year: new Date().getFullYear().toString(), type: 'misc', source: 'filename' };
  }
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

export async function extractCitationMetadata(
  resourceName: string,
  resourceType: string,
  downloadUrl: string,
): Promise<CitationMetadata> {
  const isPdf = resourceType.includes('pdf') || resourceName.toLowerCase().endsWith('.pdf');

  let pdfText = '';
  let embeddedTitle: string | undefined;
  let embeddedAuthor: string | undefined;

  // Step 1 & 2 — PDF only
  if (isPdf && downloadUrl) {
    const pdfResult = await extractPdfContent(downloadUrl);
    pdfText = pdfResult.text;
    embeddedTitle = pdfResult.embeddedTitle;
    embeddedAuthor = pdfResult.embeddedAuthor;
  }

  // Step 3 — DOI detection
  const doi = detectDoi(pdfText) || undefined;

  // Step 4 — DOI lookup
  let doiMeta: Partial<CitationMetadata> | null = null;
  if (doi) {
    doiMeta = await lookupCrossRef(doi);
    if (!doiMeta || !isMetadataSufficient(doiMeta)) {
      doiMeta = await lookupOpenAlex(doi);
    }
  }

  if (doiMeta && isMetadataSufficient(doiMeta)) {
    return fillDefaults(doiMeta, resourceName);
  }

  // Step 5 — AI fallback, seeded with any embedded PDF metadata
  let textForAI = pdfText;
  if (embeddedTitle) textForAI = `Title: ${embeddedTitle}\nAuthor: ${embeddedAuthor || ''}\n\n` + textForAI;

  const aiMeta = await aiExtractMetadata(textForAI, resourceName);

  // Merge: prefer DOI for doi field even if lookup was incomplete
  if (doi && !aiMeta.doi) aiMeta.doi = doi;

  return fillDefaults(aiMeta, resourceName);
}

function fillDefaults(m: Partial<CitationMetadata>, filename: string): CitationMetadata {
  return {
    title: m.title || filename.replace(/\.[^.]+$/, ''),
    authors: m.authors?.length ? m.authors : ['Unknown Author'],
    year: m.year || new Date().getFullYear().toString(),
    journal: m.journal,
    volume: m.volume,
    issue: m.issue,
    pages: m.pages,
    doi: m.doi,
    publisher: m.publisher,
    url: m.url,
    type: m.type || 'misc',
    source: m.source || 'filename',
  };
}

// ─── Citation Formatting ──────────────────────────────────────────────────────

export type CitationFormat = 'bibtex' | 'apa' | 'mla' | 'chicago';

export function formatCitation(meta: CitationMetadata, format: CitationFormat): string {
  const { title, authors, year, journal, volume, issue, pages, doi, publisher } = meta;
  const key = citationKey(authors, year);
  const doiStr = doi ? `https://doi.org/${doi}` : (meta.url || '');
  const authorsStr = authors.join(', ');
  const firstAuthorMLA = authors.length > 0
    ? (() => { const parts = authors[0].split(' '); return parts.length > 1 ? `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}` : parts[0]; })()
    : 'Unknown Author';

  switch (format) {
    case 'bibtex': {
      const type = meta.type === 'article' ? 'article' : 'misc';
      const lines: string[] = [
        `@${type}{${key},`,
        `  author    = {${authorsStr}},`,
        `  title     = {${title}},`,
        `  year      = {${year}},`,
      ];
      if (journal) lines.push(`  journal   = {${journal}},`);
      if (volume) lines.push(`  volume    = {${volume}},`);
      if (issue) lines.push(`  number    = {${issue}},`);
      if (pages) lines.push(`  pages     = {${pages}},`);
      if (publisher) lines.push(`  publisher = {${publisher}},`);
      if (doi) lines.push(`  doi       = {${doi}},`);
      if (doiStr) lines.push(`  url       = {${doiStr}},`);
      lines.push('}');
      return lines.join('\n');
    }

    case 'apa': {
      let citation = `${authorsStr}. (${year}). ${title}.`;
      if (journal) {
        citation += ` *${journal}*`;
        if (volume) citation += `, *${volume}*`;
        if (issue) citation += `(${issue})`;
        if (pages) citation += `, ${pages}`;
        citation += '.';
      } else if (publisher) {
        citation += ` ${publisher}.`;
      }
      if (doiStr) citation += ` ${doiStr}`;
      return citation;
    }

    case 'mla': {
      const restAuthors = authors.slice(1).join(', ');
      let authorPart = firstAuthorMLA;
      if (restAuthors) authorPart += `, et al.`;
      let citation = `${authorPart}. "${title}."`;
      if (journal) citation += ` *${journal}*`;
      if (volume) citation += `, vol. ${volume}`;
      if (issue) citation += `, no. ${issue}`;
      citation += `, ${year}`;
      if (pages) citation += `, pp. ${pages}`;
      citation += '.';
      if (doiStr) citation += ` ${doiStr}.`;
      return citation;
    }

    case 'chicago': {
      const chicagoAuthors = authors.length > 1
        ? `${firstAuthorMLA}, and ${authors.slice(1).join(', ')}`
        : firstAuthorMLA;
      let citation = `${chicagoAuthors}. "${title}."`;
      if (journal) {
        citation += ` *${journal}*`;
        if (volume) citation += ` ${volume}`;
        if (issue) citation += `, no. ${issue}`;
        citation += ` (${year})`;
        if (pages) citation += `: ${pages}`;
        citation += '.';
      } else {
        if (publisher) citation += ` ${publisher},`;
        citation += ` ${year}.`;
      }
      if (doiStr) citation += ` ${doiStr}.`;
      return citation;
    }
  }
}
