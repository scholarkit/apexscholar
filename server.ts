/**
 * Minimal dev server — no SQLite, no file-upload API.
 * All data is handled client-side via Puter.js.
 */
import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. First, define specific API routes
  app.get("/api/arxiv", async (req, res) => {
    try {
      const q: any = req.query.q || "ai";
      const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=10`;
      const response = await fetch(url);
      const xml = await response.text();

      // Set content type so the browser knows it's XML
      res.set("Content-Type", "text/xml");
      res.send(xml);
    } catch (err) {
      res.status(500).json({ error: "arXiv fetch failed" });
    }
  });

  // 2. Then, define the Vite/Static fallback logic
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // This must come AFTER your API routes
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    // The wildcard '*' MUST be the very last route
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
