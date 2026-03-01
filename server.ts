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

  app.get("/api/scholar", async (req, res) => {
    try {
      const q: any = req.query.q || "";
      const apiKey = process.env.SERPAPI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "SERPAPI_API_KEY missing in .env" });
      }
      const url = `https://serpapi.com/search.json?engine=google_scholar&q=${encodeURIComponent(q)}&api_key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Google Scholar fetch failed" });
    }
  });

  app.get("/api/pubmed", async (req, res) => {
    try {
      const q: any = req.query.q || "ai";
      const apiKey = process.env.NCBI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "NCBI_API_KEY missing in .env" });
      }

      // Step 1: Search for IDs
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(q)}&retmode=json&retmax=12&api_key=${apiKey}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      const ids = searchData?.esearchresult?.idlist || [];

      if (!ids || ids.length === 0) {
        res.set("Content-Type", "text/xml");
        return res.send("<?xml version=\"1.0\" ?><PubmedArticleSet></PubmedArticleSet>");
      }

      // Step 2: Fetch full XML data for those IDs
      const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml&api_key=${apiKey}`;
      const fetchRes = await fetch(fetchUrl);
      const xml = await fetchRes.text();

      res.set("Content-Type", "text/xml");
      res.send(xml);
    } catch (err) {
      res.status(500).json({ error: "PubMed fetch failed" });
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
