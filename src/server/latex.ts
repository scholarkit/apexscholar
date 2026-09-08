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

// Compile LaTeX content directly to PDF
latexRouter.post('/compile', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid LaTeX content' });
  }

  try {
    console.log('[Tectonic] Starting LaTeX compilation...');
    const startTime = Date.now();

    const result = await compile({
      tex: content,
      returnBuffer: true,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.status !== 'success' || !result.pdfBuffer) {
      console.error(`[Tectonic] Compilation failed after ${elapsed}s:`, result.stderr || result.error);
      return res.status(400).json({
        error: 'LaTeX compilation failed',
        details: result.stderr || result.error || result.stdout || 'Unknown error occurred during compilation',
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

