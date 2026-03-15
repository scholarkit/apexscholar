/**
 * Minimal dev server — no SQLite, no file-upload API.
 * All data is handled client-side via Puter.js.
 */
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import OAuth from 'oauth-1.0a';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const oauth = new OAuth({
  consumer: {
    key: process.env.ZOTERO_CLIENT_KEY || '',
    secret: process.env.ZOTERO_CLIENT_SECRET || ''
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

const execPromise = promisify(exec);

const PORT = 3000;

// GitHub Configuration from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = 'scholarkit';
const GITHUB_REPO = 'LaTex';

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

  app.get("/api/resolve-pdf", async (req, res) => {
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

  app.post("/api/compile", async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Missing content" });

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      return res.status(500).json({
        error: "GitHub configuration missing",
        details: "Ensure GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO are set in .env"
      });
    }

    try {
      console.log(`Dispatching GitHub Workflow for LaTeX compilation...`);

      // 1. Dispatch Workflow
      const dispatchRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/compile.yml/dispatches`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GITHUB_TOKEN}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
          },
          body: JSON.stringify({
            ref: "main",
            inputs: { tex: content }
          })
        }
      );

      if (!dispatchRes.ok) {
        const error = await dispatchRes.text();
        throw new Error(`GitHub Dispatch Failed: ${error}`);
      }

      // 2. Poll for the specific run
      await new Promise(r => setTimeout(r, 4000));

      let runId = null;
      let status = "queued";
      let attempts = 0;
      const MAX_ATTEMPTS = 40;

      while (attempts < MAX_ATTEMPTS) {
        const runsRes = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs?workflow=compile.yml&event=workflow_dispatch&per_page=1`,
          {
            headers: {
              "Authorization": `Bearer ${GITHUB_TOKEN}`,
              "Accept": "application/vnd.github+json"
            }
          }
        );
        const runsData = await runsRes.json();
        const latestRun = runsData.workflow_runs?.[0];

        if (latestRun) {
          runId = latestRun.id;
          status = latestRun.status;

          if (status === "completed") {
            if (latestRun.conclusion !== "success") {
              throw new Error(`Workflow failed with conclusion: ${latestRun.conclusion}`);
            }
            break;
          }
        }

        console.log(`Polling workflow run... Status: ${status} (Attempt ${attempts + 1}/${MAX_ATTEMPTS})`);
        await new Promise(r => setTimeout(r, 3000));
        attempts++;
      }

      if (status !== "completed") {
        throw new Error("Workflow timed out or failed to complete.");
      }
      await new Promise(r => setTimeout(r, 3000));
      // 3. Get Artifacts
      console.log(`Retrieving artifact for Run ID: ${runId}`);
      const artifactsRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${runId}/artifacts`,
        {
          headers: {
            "Authorization": `Bearer ${GITHUB_TOKEN}`,
          }
        }
      );
      const artifactsText = await artifactsRes.text();
      const artifactsData = JSON.parse(artifactsText);
      const artifact = artifactsData.artifacts?.find((a: any) => a.name === "pdf");

      if (!artifact) {
        throw new Error("Compiled PDF artifact not found.");
      }

      // 4. Download and Extract PDF
      const downloadRes = await fetch(artifact.archive_download_url, {
        headers: { "Authorization": `Bearer ${GITHUB_TOKEN}` }
      });
      const buffer = await downloadRes.arrayBuffer();

      const zip = new AdmZip(Buffer.from(buffer));
      const zipEntries = zip.getEntries();
      const pdfEntry = zipEntries.find(e => e.entryName.endsWith(".pdf"));

      if (!pdfEntry) {
        throw new Error("manuscript.pdf not found in artifact ZIP.");
      }

      res.set("Content-Type", "application/pdf");
      res.send(pdfEntry.getData());

    } catch (err) {
      console.error('LaTeX compilation error:', err);
      res.status(500).json({ error: "LaTeX compilation failed", details: (err as any).message });
    }
  });

  // ── Zotero Endpoints ─────────────────────────────────────

  app.post("/api/zotero/request-token", async (req, res) => {
    try {
      const { callbackUrl } = req.body;
      const request_data = {
        url: 'https://www.zotero.org/oauth/request',
        method: 'POST',
        data: { oauth_callback: callbackUrl },
      };

      const response = await fetch(request_data.url, {
        method: request_data.method,
        headers: oauth.toHeader(oauth.authorize(request_data)) as unknown as Record<string, string>,
      });

      if (!response.ok) throw new Error(`Failed to get request token: ${response.statusText}`);

      const text = await response.text();
      const params = new URLSearchParams(text);
      res.json({
        token: params.get('oauth_token'),
        secret: params.get('oauth_token_secret'),
        url: `https://www.zotero.org/oauth/authorize?oauth_token=${params.get('oauth_token')}&library_access=1&notes_access=1&write_access=1`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/zotero/access-token", async (req, res) => {
    try {
      const { oauthToken, requestTokenSecret, oauthVerifier } = req.body;
      const request_data = {
        url: 'https://www.zotero.org/oauth/access',
        method: 'POST',
        data: { oauth_verifier: oauthVerifier },
      };

      const token = {
        key: oauthToken,
        secret: requestTokenSecret,
      };

      const response = await fetch(request_data.url, {
        method: request_data.method,
        headers: oauth.toHeader(oauth.authorize(request_data, token)) as unknown as Record<string, string>,
      });

      if (!response.ok) throw new Error(`Failed to get access token: ${response.statusText}`);

      const text = await response.text();
      const params = new URLSearchParams(text);

      res.json({
        userId: params.get('userID'),
        apiKey: params.get('oauth_token'),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/zotero/api", async (req, res) => {
    try {
      const { endpoint, credentials, params } = req.body;

      const url = new URL(`https://api.zotero.org/users/${credentials.userId}/${endpoint}`);
      if (params) {
        Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value as string));
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Zotero-API-Key': credentials.apiKey,
          'Zotero-API-Version': '3',
        },
      });

      if (!response.ok) throw new Error(`Zotero API Error: ${response.statusText}`);

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Supabase Auth Endpoints ─────────────────────────────────────

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, display_name, options } = req.body;

      // Auto-confirm email using Admin API and set display_name in metadata
      const { data: adminData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            ...options?.data,
            display_name: display_name
        }
      });
      if (createError) throw createError;

      // Automatically sign them in to generate the JWT session
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { error } = await supabaseAdmin.auth.admin.signOut(token);
        if (error) console.error("Admin signout error:", error);
      }
      res.json({ message: "Logged out successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });

      const token = authHeader.replace('Bearer ', '');
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error) throw error;
      res.json({ user: data.user });
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  });

  // ── Auth Middleware ─────────────────────────────────────────────────
  const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) return res.status(401).json({ error: "Unauthorized access" });
    (req as any).user = userData.user;
    next();
  };

  // ── Supabase KV Store Endpoints ─────────────────────────────────────
  // Requires a table named `kv_store` with columns: id (uuid), user_id (uuid, nullable), key (text), value (jsonb)

  app.get("/api/kv/:key", requireAuth, async (req, res) => {
    try {
      const { key } = req.params;
      const user = (req as any).user;
      const { data, error } = await supabaseAdmin
        .from('kv_store')
        .select('*')
        .eq('key', key)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(200).json({ value: null });

      res.json({ value: data.value });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/kv", requireAuth, async (req, res) => {
    try {
      const { key, value } = req.body;
      const user = (req as any).user;
      if (!key) return res.status(400).json({ error: "Missing key" });

      const { data, error } = await supabaseAdmin
        .from('kv_store')
        .upsert(
          { key, value, user_id: user.id, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,key' }
        )
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/kv/:key", requireAuth, async (req, res) => {
    try {
      const { key } = req.params;
      const user = (req as any).user;
      const { error } = await supabaseAdmin
        .from('kv_store')
        .delete()
        .eq('key', key)
        .eq('user_id', user.id);

      if (error) throw error;
      res.json({ success: true, message: "Key deleted" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── OpenRouter AI Proxy ─────────────────────────────────────────────

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });

      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !userData?.user) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const openrouterApiKey = process.env.OPENROUTER_API_KEY;
      if (!openrouterApiKey) {
        return res.status(500).json({ error: "OPENROUTER_API_KEY missing in .env" });
      }

      const { messages, options } = req.body;
      const model = options?.model || "google/gemini-2.5-flash"; // default fallback

      const formattedMessages = messages.map((m: string) => ({
        role: "user",
        content: m,
      }));

      const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Apex Scholar",
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          response_format: {
            type: options?.type || "text",
          },
          stream: options?.stream || false,
        }),
      });

      if (!openRouterRes.ok) {
        const errText = await openRouterRes.text();
        console.error("OpenRouter Error:", errText);
        return res.status(openRouterRes.status).json({ error: "OpenRouter API request failed" });
      }

      if (options?.stream) {
        res.set({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        openRouterRes.body?.pipeTo(new WritableStream({
          write(chunk) {
            res.write(chunk);
          },
          close() {
            res.end();
          }
        }));
      } else {
        const data = await openRouterRes.json();
        // Return in a unified format
        const content = data.choices[0]?.message?.content || "";
        res.json({ message: { content } });
      }

    } catch (err: any) {
      console.error("AI Chat Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Supabase Storage Proxy ──────────────────────────────────────────

  // Middleware is now defined above for KV Store too.

  app.post("/api/storage/write", requireAuth, express.raw({ type: '*/*', limit: '100mb' }), async (req, res) => {
    try {
      const user = (req as any).user;
      let pathUrl = req.query.path as string;
      if (!pathUrl) return res.status(400).json({ error: 'Missing path query parameter' });
      pathUrl = `${user.id}/${pathUrl}`;

      // Ensure user isolates their files if needed, but for now we follow the path strictly.
      // E.g. path format should be validated.
      const contentType = req.headers['content-type'] || 'application/octet-stream';
      const fileBuffer = req.body;

      const { data, error } = await supabaseAdmin.storage
        .from('apexscholar-resources')
        .upload(pathUrl, fileBuffer, {
          contentType,
          upsert: true
        });

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      console.error("Storage write error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/storage/read", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      let pathUrl = req.query.path as string;
      if (!pathUrl) return res.status(400).json({ error: 'Missing path query parameter' });
      pathUrl = `${user.id}/${pathUrl}`;

      // Just return a signed URL so the frontend can fetch the file directly
      const { data, error } = await supabaseAdmin.storage
        .from('apexscholar-resources')
        .createSignedUrl(pathUrl, 3600); // 1 hour expiry

      if (error) throw error;
      res.json({ success: true, url: data.signedUrl });
    } catch (err: any) {
      console.error("Storage read error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/storage/delete", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      let pathUrl = req.query.path as string;
      if (!pathUrl) return res.status(400).json({ error: 'Missing path query parameter' });
      pathUrl = `${user.id}/${pathUrl}`;

      const { data, error } = await supabaseAdmin.storage
        .from('apexscholar-resources')
        .remove([pathUrl]);

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/storage/list", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const rawPathUrl = (req.query.path as string) || '';
      const pathUrl = rawPathUrl ? `${user.id}/${rawPathUrl}` : user.id;
      
      const { data, error } = await supabaseAdmin.storage
        .from('apexscholar-resources')
        .list(pathUrl);

      if (error) throw error;

      // Map to puter.fs.list format
      const mappedConfig = data.map(item => ({
         name: item.name,
         is_dir: !item.metadata, // folders typically don't have metadata size in Supabase list
         size: item.metadata?.size || 0,
         created: item.created_at,
         modified: item.updated_at,
         path: rawPathUrl ? `${rawPathUrl}/${item.name}` : item.name
      }));

      res.json({ success: true, data: mappedConfig });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/storage/stat", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      let pathUrl = req.query.path as string;
      if (!pathUrl) return res.status(400).json({ error: 'Missing path query parameter' });
      const originalPathUrl = pathUrl;
      pathUrl = `${user.id}/${pathUrl}`;

      // Supabase storage api doesn't natively expose 'stat' for a specific file outside of list or download.
      // We can use list on the exact path prefix but usually bucket.list might list the directory.
      // Easiest is to just check if it exists or fallback gracefully.
      const dirIndex = pathUrl.lastIndexOf('/');
      const dirPath = dirIndex > -1 ? pathUrl.substring(0, dirIndex) : '';
      const filename = dirIndex > -1 ? pathUrl.substring(dirIndex + 1) : pathUrl;

      const { data, error } = await supabaseAdmin.storage
        .from('apexscholar-resources')
        .list(dirPath, { search: filename });

      if (error) throw error;
      const file = data.find(f => f.name === filename);
      
      if (!file) throw new Error("File not found");

      res.json({ 
        success: true, 
        data: {
          name: file.name,
          is_dir: false, // assumes stat is only files mostly
          size: file.metadata?.size || 0,
          created: file.created_at,
          modified: file.updated_at,
          path: originalPathUrl
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Then, define the Vite/Static fallback logic
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== 'production') {
      import('vite').then(async ({ createServer: createViteServer }) => {
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        // This must come AFTER your API routes
        app.use(vite.middlewares);
        
        app.listen(PORT, '0.0.0.0', () => {
          console.log(`Server running on http://localhost:${PORT}`);
        });
      });
    } else {
      app.use(express.static('dist'));
      // The wildcard '*' MUST be the very last route
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve('dist/index.html'));
      });
      
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  }

export default app;
