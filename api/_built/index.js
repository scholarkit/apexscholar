import "./chunk-4VNS5WPM.js";

// src/server/index.ts
import dotenv7 from "dotenv";
import express2 from "express";
import path from "path";

// src/server/zotero.ts
import dotenv from "dotenv";
import OAuth from "oauth-1.0a";
import crypto from "crypto";
import { Router } from "express";
dotenv.config({ path: ".env" });
var zoteroRouter = Router();
var oauth = new OAuth({
  consumer: {
    key: process.env.ZOTERO_CLIENT_KEY || "",
    secret: process.env.ZOTERO_CLIENT_SECRET || ""
  },
  signature_method: "HMAC-SHA1",
  hash_function(base_string, key) {
    return crypto.createHmac("sha1", key).update(base_string).digest("base64");
  }
});
zoteroRouter.post("/request-token", async (req, res) => {
  try {
    const { callbackUrl } = req.body;
    const request_data = {
      url: "https://www.zotero.org/oauth/request",
      method: "POST",
      data: { oauth_callback: callbackUrl }
    };
    const response = await fetch(request_data.url, {
      method: request_data.method,
      headers: oauth.toHeader(oauth.authorize(request_data))
    });
    if (!response.ok) throw new Error(`Failed to get request token: ${response.statusText}`);
    const text = await response.text();
    const params = new URLSearchParams(text);
    res.json({
      token: params.get("oauth_token"),
      secret: params.get("oauth_token_secret"),
      url: `https://www.zotero.org/oauth/authorize?oauth_token=${params.get("oauth_token")}&library_access=1&notes_access=1&write_access=1`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
zoteroRouter.post("/access-token", async (req, res) => {
  try {
    const { oauthToken, requestTokenSecret, oauthVerifier } = req.body;
    const request_data = {
      url: "https://www.zotero.org/oauth/access",
      method: "POST",
      data: { oauth_verifier: oauthVerifier }
    };
    const token = {
      key: oauthToken,
      secret: requestTokenSecret
    };
    const response = await fetch(request_data.url, {
      method: request_data.method,
      headers: oauth.toHeader(oauth.authorize(request_data, token))
    });
    if (!response.ok) throw new Error(`Failed to get access token: ${response.statusText}`);
    const text = await response.text();
    const params = new URLSearchParams(text);
    res.json({
      userId: params.get("userID"),
      apiKey: params.get("oauth_token")
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
zoteroRouter.post("/api", async (req, res) => {
  try {
    const { endpoint, credentials, params } = req.body;
    const url = new URL(`https://api.zotero.org/users/${credentials.userId}/${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
    }
    const response = await fetch(url.toString(), {
      headers: {
        "Zotero-API-Key": credentials.apiKey,
        "Zotero-API-Version": "3"
      }
    });
    if (!response.ok) throw new Error(`Zotero API Error: ${response.statusText}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// src/server/sources.ts
import { Router as Router2 } from "express";
import dotenv2 from "dotenv";
dotenv2.config({ path: ".env" });
var sourcesRouter = Router2();
sourcesRouter.get("/arxiv", async (req, res) => {
  try {
    const q = req.query.q || "ai";
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=10`;
    const response = await fetch(url);
    const xml = await response.text();
    res.set("Content-Type", "text/xml");
    res.send(xml);
  } catch (err) {
    res.status(500).json({ error: "arXiv fetch failed" });
  }
});
sourcesRouter.get("/scholar", async (req, res) => {
  try {
    const q = req.query.q || "";
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
    const q = req.query.q || "ai";
    const apiKey = process.env.NCBI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "NCBI_API_KEY missing in .env" });
    }
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(q)}&retmode=json&retmax=12&api_key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const ids = searchData?.esearchresult?.idlist || [];
    if (!ids || ids.length === 0) {
      res.set("Content-Type", "text/xml");
      return res.send('<?xml version="1.0" ?><PubmedArticleSet></PubmedArticleSet>');
    }
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&retmode=xml&api_key=${apiKey}`;
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
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: "Missing url" });
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      },
      redirect: "follow"
    });
    if (!response.ok) return res.status(500).json({ error: "Failed to fetch target URL" });
    const finalUrl = response.url;
    const contentType = response.headers.get("content-type")?.toLowerCase() || "";
    if (finalUrl.toLowerCase().endsWith(".pdf") || contentType.includes("application/pdf")) {
      return res.json({ pdfUrl: finalUrl });
    }
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return res.json({ pdfUrl: "" });
    }
    const html = await response.text();
    const $ = (await import("./esm-CMFVYXJ3.js")).load(html);
    let pdfUrl = $('meta[name="citation_pdf_url"]').attr("content") || "";
    if (!pdfUrl) {
      const ogUrl = $('meta[property="og:url"]').attr("content");
      if (ogUrl && ogUrl.includes("/abs/")) {
        pdfUrl = ogUrl.replace("/abs/", "/pdf/") + ".pdf";
      }
    }
    if (!pdfUrl) {
      pdfUrl = $('link[type="application/pdf"]').attr("href") || $('link[rel="alternate"][href$=".pdf"]').attr("href") || "";
    }
    if (!pdfUrl) {
      $("a").each((_, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().toLowerCase();
        if (href && (href.toLowerCase().endsWith(".pdf") || text.includes("download pdf"))) {
          pdfUrl = href;
          return false;
        }
      });
    }
    if (pdfUrl && !pdfUrl.startsWith("http")) {
      const base = new URL(targetUrl).origin;
      pdfUrl = new URL(pdfUrl, base).href;
    }
    res.json({ pdfUrl });
  } catch (err) {
    console.error("PDF resolution error:", err);
    res.status(500).json({ error: "PDF resolution failed" });
  }
});

// src/server/latex.ts
import { Router as Router3 } from "express";
import AdmZip from "adm-zip";
import dotenv3 from "dotenv";
dotenv3.config({ path: ".env" });
var latexRouter = Router3();
var GITHUB_TOKEN = process.env.GITHUB_TOKEN;
var GITHUB_OWNER = "scholarkit";
var GITHUB_REPO = "LaTex";
latexRouter.post("/compile", async (req, res) => {
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
    await new Promise((r) => setTimeout(r, 4e3));
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
      await new Promise((r) => setTimeout(r, 3e3));
      attempts++;
    }
    if (status !== "completed") {
      throw new Error("Workflow timed out or failed to complete.");
    }
    await new Promise((r) => setTimeout(r, 3e3));
    console.log(`Retrieving artifact for Run ID: ${runId}`);
    const artifactsRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${runId}/artifacts`,
      {
        headers: {
          "Authorization": `Bearer ${GITHUB_TOKEN}`
        }
      }
    );
    const artifactsText = await artifactsRes.text();
    const artifactsData = JSON.parse(artifactsText);
    const artifact = artifactsData.artifacts?.find((a) => a.name === "pdf");
    if (!artifact) {
      throw new Error("Compiled PDF artifact not found.");
    }
    const downloadRes = await fetch(artifact.archive_download_url, {
      headers: { "Authorization": `Bearer ${GITHUB_TOKEN}` }
    });
    const buffer = await downloadRes.arrayBuffer();
    const zip = new AdmZip(Buffer.from(buffer));
    const zipEntries = zip.getEntries();
    const pdfEntry = zipEntries.find((e) => e.entryName.endsWith(".pdf"));
    if (!pdfEntry) {
      throw new Error("manuscript.pdf not found in artifact ZIP.");
    }
    res.set("Content-Type", "application/pdf");
    res.send(pdfEntry.getData());
  } catch (err) {
    console.error("LaTeX compilation error:", err);
    res.status(500).json({ error: "LaTeX compilation failed", details: err.message });
  }
});

// src/server/auth.ts
import { Router as Router4 } from "express";

// src/server/supabase.ts
import dotenv4 from "dotenv";
import { createClient } from "@supabase/supabase-js";
dotenv4.config({ path: ".env" });
var supabaseUrl = process.env.SUPABASE_URL || "";
var supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
var supabase = createClient(supabaseUrl, supabaseAnonKey);
var supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// src/server/auth.ts
var authRouter = Router4();
authRouter.post("/signup", async (req, res) => {
  try {
    const { email, password, display_name, options } = req.body;
    const { data: adminData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...options?.data,
        display_name
      }
    });
    if (createError) throw createError;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
authRouter.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { error } = await supabaseAdmin.auth.admin.signOut(token);
      if (error) console.error("Admin signout error:", error);
    }
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
authRouter.get("/user", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });
    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error) throw error;
    res.json({ user: data.user });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// src/server/ai.ts
import { Router as Router5 } from "express";
import dotenv5 from "dotenv";
dotenv5.config({ path: ".env" });
var aiRouter = Router5();
aiRouter.post("/chat", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return res.status(500).json({ error: "OPENROUTER_API_KEY missing in .env" });
    }
    const { messages, options } = req.body;
    const model = options?.model || "google/gemini-2.5-flash";
    const formattedMessages = messages.map((m) => ({
      role: "user",
      content: m
    }));
    const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Apex Scholar"
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        response_format: {
          type: options?.type || "text"
        },
        stream: options?.stream || false
      })
    });
    if (!openRouterRes.ok) {
      const errText = await openRouterRes.text();
      console.error("OpenRouter Error:", errText);
      return res.status(openRouterRes.status).json({ error: "OpenRouter API request failed" });
    }
    if (options?.stream) {
      res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
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
      const content = data.choices[0]?.message?.content || "";
      res.json({ message: { content } });
    }
  } catch (err) {
    console.error("AI Chat Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// src/server/supermemory.ts
import dotenv6 from "dotenv";
import { Router as Router6 } from "express";

// src/server/middleware.ts
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return res.status(401).json({ error: "Unauthorized access" });
  req.user = userData.user;
  next();
};
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal server error" });
}

// src/server/supermemory.ts
dotenv6.config({ path: ".env" });
var supermemoryRouter = Router6();
var SUPERMEMORY_BASE = "https://api.supermemory.ai";
supermemoryRouter.post("/add", requireAuth, async (req, res) => {
  try {
    const smKey = process.env.SUPERMEMORY_API_KEY;
    if (!smKey) return res.status(500).json({ error: "SUPERMEMORY_API_KEY missing in .env" });
    const user = req.user;
    const { content, metadata } = req.body;
    if (!content) return res.status(400).json({ error: "Missing content" });
    const response = await fetch(`${SUPERMEMORY_BASE}/v3/documents`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${smKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content,
        containerTags: [user.id],
        metadata: metadata || {}
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("Supermemory add error:", errText);
      return res.status(response.status).json({ error: "Supermemory add failed" });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Memory add error:", err);
    res.status(500).json({ error: err.message });
  }
});
supermemoryRouter.post("/search", requireAuth, async (req, res) => {
  try {
    const smKey = process.env.SUPERMEMORY_API_KEY;
    if (!smKey) return res.status(500).json({ error: "SUPERMEMORY_API_KEY missing in .env" });
    const user = req.user;
    const { q, limit, chunkThreshold, includeSummary } = req.body;
    if (!q) return res.status(400).json({ error: "Missing query (q)" });
    const response = await fetch(`${SUPERMEMORY_BASE}/v3/search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${smKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q,
        containerTags: [user.id],
        limit: limit || 10,
        chunkThreshold: chunkThreshold ?? 0.5,
        includeSummary: includeSummary ?? true,
        includeFullDocs: false
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("Supermemory search error:", errText);
      return res.status(response.status).json({ error: "Supermemory search failed" });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Memory search error:", err);
    res.status(500).json({ error: err.message });
  }
});
supermemoryRouter.post("/profile", requireAuth, async (req, res) => {
  try {
    const smKey = process.env.SUPERMEMORY_API_KEY;
    if (!smKey) return res.status(500).json({ error: "SUPERMEMORY_API_KEY missing in .env" });
    const user = req.user;
    const { q, threshold } = req.body;
    const response = await fetch(`${SUPERMEMORY_BASE}/v4/profile`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${smKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        containerTag: user.id,
        ...q ? { q } : {},
        ...threshold !== void 0 ? { threshold } : {}
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("Supermemory profile error:", errText);
      return res.status(response.status).json({ error: "Supermemory profile failed" });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Memory profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

// src/server/storage.ts
import { Router as Router7 } from "express";
import express from "express";
var storageRouter = Router7();
storageRouter.post("/write", requireAuth, express.raw({ type: "*/*", limit: "100mb" }), async (req, res) => {
  try {
    const user = req.user;
    let pathUrl = req.query.path;
    if (!pathUrl) return res.status(400).json({ error: "Missing path query parameter" });
    pathUrl = `${user.id}/${pathUrl}`;
    const contentType = req.headers["content-type"] || "application/octet-stream";
    const fileBuffer = req.body;
    const { data, error } = await supabaseAdmin.storage.from("apexscholar-resources").upload(pathUrl, fileBuffer, {
      contentType,
      upsert: true
    });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error("Storage write error:", err);
    res.status(500).json({ error: err.message });
  }
});
storageRouter.get("/read", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    let pathUrl = req.query.path;
    if (!pathUrl) return res.status(400).json({ error: "Missing path query parameter" });
    pathUrl = `${user.id}/${pathUrl}`;
    const { data, error } = await supabaseAdmin.storage.from("apexscholar-resources").createSignedUrl(pathUrl, 3600);
    if (error) throw error;
    res.json({ success: true, url: data.signedUrl });
  } catch (err) {
    console.error("Storage read error:", err);
    res.status(500).json({ error: err.message });
  }
});
storageRouter.delete("/delete", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    let pathUrl = req.query.path;
    if (!pathUrl) return res.status(400).json({ error: "Missing path query parameter" });
    pathUrl = `${user.id}/${pathUrl}`;
    const { data, error } = await supabaseAdmin.storage.from("apexscholar-resources").remove([pathUrl]);
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
storageRouter.get("/list", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const rawPathUrl = req.query.path || "";
    const pathUrl = rawPathUrl ? `${user.id}/${rawPathUrl}` : user.id;
    const { data, error } = await supabaseAdmin.storage.from("apexscholar-resources").list(pathUrl);
    if (error) throw error;
    const mappedConfig = data.map((item) => ({
      name: item.name,
      is_dir: !item.metadata,
      // folders typically don't have metadata size in Supabase list
      size: item.metadata?.size || 0,
      created: item.created_at,
      modified: item.updated_at,
      path: rawPathUrl ? `${rawPathUrl}/${item.name}` : item.name
    }));
    res.json({ success: true, data: mappedConfig });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
storageRouter.get("/stat", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    let pathUrl = req.query.path;
    if (!pathUrl) return res.status(400).json({ error: "Missing path query parameter" });
    const originalPathUrl = pathUrl;
    pathUrl = `${user.id}/${pathUrl}`;
    const dirIndex = pathUrl.lastIndexOf("/");
    const dirPath = dirIndex > -1 ? pathUrl.substring(0, dirIndex) : "";
    const filename = dirIndex > -1 ? pathUrl.substring(dirIndex + 1) : pathUrl;
    const { data, error } = await supabaseAdmin.storage.from("apexscholar-resources").list(dirPath, { search: filename });
    if (error) throw error;
    const file = data.find((f) => f.name === filename);
    if (!file) throw new Error("File not found");
    res.json({
      success: true,
      data: {
        name: file.name,
        is_dir: false,
        // assumes stat is only files mostly
        size: file.metadata?.size || 0,
        created: file.created_at,
        modified: file.updated_at,
        path: originalPathUrl
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// src/server/documents.ts
import { Router as Router8 } from "express";
var documentsRouter = Router8();
documentsRouter.get("/documents", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ error: "Missing project_id" });
    const { data, error } = await supabaseAdmin.from("documents").select("*").eq("project_id", project_id).eq("user_id", user.id).order("updated_at", { ascending: false });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
documentsRouter.post("/documents", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { project_id, title, type } = req.body;
    if (!project_id || !title) return res.status(400).json({ error: "Missing project_id or title" });
    const { data, error } = await supabaseAdmin.from("documents").insert({ project_id, user_id: user.id, title, type: type || "thesis" }).select().single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
documentsRouter.put("/documents/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { title, type } = req.body;
    const updates = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    if (title !== void 0) updates.title = title;
    if (type !== void 0) updates.type = type;
    const { data, error } = await supabaseAdmin.from("documents").update(updates).eq("id", id).eq("user_id", user.id).select().single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
documentsRouter.delete("/documents/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("documents").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// src/server/kv.ts
import { Router as Router9 } from "express";
var kvRouter = Router9();
kvRouter.get("/:key", requireAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const user = req.user;
    const { data, error } = await supabaseAdmin.from("kv_store").select("*").eq("key", key).eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(200).json({ value: null });
    res.json({ value: data.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
kvRouter.post("/", requireAuth, async (req, res) => {
  try {
    const { key, value } = req.body;
    const user = req.user;
    if (!key) return res.status(400).json({ error: "Missing key" });
    const { data, error } = await supabaseAdmin.from("kv_store").upsert(
      { key, value, user_id: user.id, updated_at: (/* @__PURE__ */ new Date()).toISOString() },
      { onConflict: "user_id,key" }
    ).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
kvRouter.delete("/:key", requireAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const user = req.user;
    const { error } = await supabaseAdmin.from("kv_store").delete().eq("key", key).eq("user_id", user.id);
    if (error) throw error;
    res.json({ success: true, message: "Key deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// src/server/projects.ts
import { Router as Router10 } from "express";
var projectsRouter = Router10();
projectsRouter.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("projects").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Projects fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});
projectsRouter.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("projects").select("*").eq("id", req.params.id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Projects fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});
projectsRouter.post("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("projects").insert(req.body);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Projects fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});
projectsRouter.put("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("projects").update(req.body).eq("id", req.params.id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Projects fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});
projectsRouter.delete("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("projects").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Projects fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// src/server/journal.ts
import { Router as Router11 } from "express";
var journalRouter = Router11();
journalRouter.get("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { data, error } = await supabase.from("journal_entries").select("*").eq("author_id", user.id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Journal get error:", err);
    res.status(500).json({ error: err.message });
  }
});
journalRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const projectId = req.params.id;
    const { data, error } = await supabase.from("journal_entries").select("*").eq("author_id", user.id).eq("project_id", projectId).single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Journal get error:", err);
    res.status(500).json({ error: err.message });
  }
});
journalRouter.post("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { data, error } = await supabase.from("journal_entries").insert({
      author_id: user.id,
      ...req.body
    }).select("*").single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Journal post error:", err);
    res.status(500).json({ error: err.message });
  }
});
journalRouter.put("/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { data, error } = await supabase.from("journal_entries").update(req.body).eq("id", req.params.id).eq("author_id", user.id).select("*").single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Journal put error:", err);
    res.status(500).json({ error: err.message });
  }
});
journalRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { data, error } = await supabase.from("journal_entries").delete().eq("id", req.params.id).eq("author_id", user.id).select("*").single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Journal delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

// src/server/resources.ts
import { Router as Router12 } from "express";
var resourcesRouter = Router12();
resourcesRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const projectId = req.params.id;
    const { data, error } = await supabase.from("resources").select("*").eq("project_id", projectId).eq("user_id", user.id);
    if (error) {
      return res.status(500).json({ error: "Failed to fetch resources" });
    }
    res.json(data);
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});
resourcesRouter.post("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { data, error } = await supabase.from("resources").insert({
      user_id: user.id,
      ...req.body
    }).select("*").single();
    if (error) {
      return res.status(500).json({ error: "Failed to create resource" });
    }
    res.json(data);
  } catch (error) {
    console.error("Error creating resource:", error);
    res.status(500).json({ error: "Failed to create resource" });
  }
});
resourcesRouter.get("/url", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { data, error } = await supabase.from("resources").select("*").eq("user_id", user.id).eq("type", "url");
    if (error) {
      return res.status(500).json({ error: "Failed to fetch resources" });
    }
    res.json(data);
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});
resourcesRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { data, error } = await supabase.from("resources").delete().eq("id", id).eq("user_id", user.id).select("*").single();
    if (error) {
      return res.status(500).json({ error: "Failed to delete resource" });
    }
    res.json(data);
  } catch (error) {
    console.error("Error deleting resource:", error);
    res.status(500).json({ error: "Failed to delete resource" });
  }
});

// src/server/index.ts
dotenv7.config({ path: ".env" });
var PORT = 3e3;
var app = express2();
app.use(express2.json());
app.use("/api/auth", authRouter);
app.use("/api/zotero", zoteroRouter);
app.use("/api/sources", sourcesRouter);
app.use("/api/latex", latexRouter);
app.use("/api/ai", aiRouter);
app.use("/api/memory", supermemoryRouter);
app.use("/api/storage", storageRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/kv", kvRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/journal", journalRouter);
app.use("/api/resources", resourcesRouter);
app.use(errorHandler);
if (!process.env.VERCEL) {
  if (process.env.NODE_ENV !== "production") {
    import("vite").then(async ({ createServer: createViteServer }) => {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    });
  } else {
    app.use(express2.static("dist"));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}
var index_default = app;
export {
  index_default as default
};
