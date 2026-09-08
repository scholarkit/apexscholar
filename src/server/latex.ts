import { Router } from 'express';
import { compile, isAvailable, getVersion } from 'node-latex-compiler';
import { requireAuth } from './middleware.ts';

export const latexRouter = Router();

// Endpoint to check Tectonic engine status & version
latexRouter.get('/status', async (_req, res) => {
  try {
    const available = isAvailable();
    const version = available ? await getVersion() : null;
    res.json({
      engine: 'tectonic',
      available,
      version: version || 'unknown',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to inspect LaTeX engine status', details: (err as Error).message });
  }
});

// Clean platform-specific warnings (like Windows Fontconfig) from error logs
function cleanLatexErrorMessage(msg: string): string {
  return msg
    .split('\n')
    .filter((line) => !line.trim().startsWith('Fontconfig error:'))
    .join('\n')
    .trim();
}

/**
 * Normalizes LaTeX content before compilation to prevent common syntax conflicts:
 * - Duplicate \documentclass declarations (e.g. from stitched sections)
 * - \usepackage declarations located after \begin{document} (which causes "Can be used only in preamble")
 * - Multiple or misplaced \begin{document} / \end{document} tags
 */
export function normalizeLatexDocument(content: string, defaultTitle = 'Manuscript'): string {
  const text = content.trim();
  if (!text) return '';

  // Extract all documentclass statements
  const docClassMatches = text.match(/^[ \t]*\\documentclass(?:\[[^\]]*\])?\{[^}]+\}.*$/gm) || [];
  const chosenDocClass = docClassMatches[0]?.trim() || '\\documentclass[11pt]{article}';

  // Extract all \usepackage lines from anywhere in the document
  const packageRegex = /^[ \t]*\\usepackage(?:\[[^\]]*\])?\{[^}]+\}.*$/gm;
  const packages = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = packageRegex.exec(text)) !== null) {
    packages.add(match[0].trim());
  }

  // Remove all \documentclass and \usepackage lines from body
  let body = text
    .replace(/^[ \t]*\\documentclass(?:\[[^\]]*\])?\{[^}]+\}.*$/gm, '')
    .replace(/^[ \t]*\\usepackage(?:\[[^\]]*\])?\{[^}]+\}.*$/gm, '');

  // Extract preamble commands that were before the first \begin{document}
  let preambleExtra = '';
  if (body.includes('\\begin{document}')) {
    const firstBeginDocIdx = body.indexOf('\\begin{document}');
    preambleExtra = body.slice(0, firstBeginDocIdx).trim();
    body = body.slice(firstBeginDocIdx + '\\begin{document}'.length);
  }

  // Strip all remaining \begin{document} and \end{document} from body
  body = body
    .replace(/\\begin\{document\}/g, '')
    .replace(/\\end\{document\}/g, '')
    .trim();

  // Ensure essential packages are present if no packages exist
  const essential = ['amsmath', 'amssymb', 'graphicx'];
  for (const pkg of essential) {
    const hasPkg = Array.from(packages).some(
      (p) => p.includes(`{${pkg}}`) || p.includes(`,${pkg}`) || p.includes(`${pkg},`)
    );
    if (!hasPkg) {
      packages.add(`\\usepackage{${pkg}}`);
    }
  }

  // Title / Author check: if not in preambleExtra or body, supply basic title
  let titleBlock = '';
  if (!preambleExtra.includes('\\title') && !body.includes('\\title')) {
    titleBlock = `\\title{${defaultTitle}}\n\\author{}\n\\date{}\n`;
  }

  const parts = [
    chosenDocClass,
    Array.from(packages).join('\n'),
    preambleExtra,
    titleBlock.trim(),
    '\\begin{document}\n',
    body,
    '\n\\end{document}',
  ].filter(Boolean);

  return parts.join('\n\n').trim();
}

// Compile LaTeX content directly to PDF
latexRouter.post('/compile', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid LaTeX content' });
  }

  try {
    console.log('[Tectonic] Starting LaTeX compilation...');
    const startTime = Date.now();

    // Automatically normalize document to avoid preamble collision & duplicate tags
    const normalizedContent = normalizeLatexDocument(content);

    const result = await compile({
      tex: normalizedContent,
      returnBuffer: true,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.status !== 'success' || !result.pdfBuffer) {
      const cleanedErr = cleanLatexErrorMessage(
        result.stderr || result.error || result.stdout || 'Unknown error occurred during compilation'
      );
      console.error(`[Tectonic] Compilation failed after ${elapsed}s:`, cleanedErr);
      return res.status(400).json({
        error: 'LaTeX compilation failed',
        details: cleanedErr,
      });
    }

    console.log(`[Tectonic] Compilation successful in ${elapsed}s (${result.pdfBuffer.length} bytes)`);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="manuscript.pdf"',
      'Content-Length': result.pdfBuffer.length.toString(),
    });

    res.send(result.pdfBuffer);
  } catch (err) {
    console.error('[Tectonic] Compilation exception:', err);
    res.status(500).json({
      error: 'LaTeX compilation failed',
      details: (err as Error).message || 'Unexpected server error',
    });
  }
});

