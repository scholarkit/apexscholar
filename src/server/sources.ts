import { Router } from 'express';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

export const sourcesRouter = Router();

sourcesRouter.get("/arxiv", async (req, res) => {
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

sourcesRouter.get("/scholar", async (req, res) => {
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

sourcesRouter.get("/pubmed", async (req, res) => {
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

sourcesRouter.get("/resolve-pdf", async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).json({ error: "Missing url" });

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      redirect: 'follow'
    });

    if (!response.ok) return res.status(500).json({ error: "Failed to fetch target URL" });

    const finalUrl = response.url;
    const contentType = response.headers.get('content-type')?.toLowerCase() || "";

    // If already a PDF, or redirects to one
    if (finalUrl.toLowerCase().endsWith('.pdf') || contentType.includes('application/pdf')) {
      return res.json({ pdfUrl: finalUrl });
    }

    // If not HTML/Text, we can't parse it with cheerio
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return res.json({ pdfUrl: "" });
    }

    const html = await response.text();

    const $ = (await import('cheerio')).load(html);

    let pdfUrl = $('meta[name="citation_pdf_url"]').attr('content') || "";

    if (!pdfUrl) {
      const ogUrl = $('meta[property="og:url"]').attr('content');
      if (ogUrl && ogUrl.includes('/abs/')) {
        pdfUrl = ogUrl.replace('/abs/', '/pdf/') + ".pdf";
      }
    }

    // 2. Link tags
    if (!pdfUrl) {
      pdfUrl = $('link[type="application/pdf"]').attr('href') ||
        $('link[rel="alternate"][href$=".pdf"]').attr('href') || "";
    }

    // 3. Anchor tags
    if (!pdfUrl) {
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().toLowerCase();
        if (href && (href.toLowerCase().endsWith('.pdf') || text.includes('download pdf'))) {
          pdfUrl = href;
          return false;
        }
      });
    }

    if (pdfUrl && !pdfUrl.startsWith('http')) {
      const base = new URL(targetUrl).origin;
      pdfUrl = new URL(pdfUrl, base).href;
    }

    res.json({ pdfUrl });
  } catch (err) {
    console.error('PDF resolution error:', err);
    res.status(500).json({ error: "PDF resolution failed" });
  }
});

