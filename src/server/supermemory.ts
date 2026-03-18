import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { Router } from 'express';
import { requireAuth } from './middleware.ts';

export const supermemoryRouter = Router();

const SUPERMEMORY_BASE = 'https://api.supermemory.ai';

supermemoryRouter.post("/add", requireAuth, async (req, res) => {
  try {
    const smKey = process.env.SUPERMEMORY_API_KEY;
    if (!smKey) return res.status(500).json({ error: "SUPERMEMORY_API_KEY missing in .env" });

    const user = (req as any).user;
    const { content, metadata } = req.body;
    if (!content) return res.status(400).json({ error: "Missing content" });

    const response = await fetch(`${SUPERMEMORY_BASE}/v3/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${smKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        containerTags: [user.id],
        metadata: metadata || {},
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Supermemory add error:', errText);
      return res.status(response.status).json({ error: "Supermemory add failed" });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error("Memory add error:", err);
    res.status(500).json({ error: err.message });
  }
});

supermemoryRouter.post("/search", requireAuth, async (req, res) => {
  try {
    const smKey = process.env.SUPERMEMORY_API_KEY;
    if (!smKey) return res.status(500).json({ error: "SUPERMEMORY_API_KEY missing in .env" });

    const user = (req as any).user;
    const { q, limit, chunkThreshold, includeSummary } = req.body;
    if (!q) return res.status(400).json({ error: "Missing query (q)" });

    const response = await fetch(`${SUPERMEMORY_BASE}/v3/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${smKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q,
        containerTags: [user.id],
        limit: limit || 10,
        chunkThreshold: chunkThreshold ?? 0.5,
        includeSummary: includeSummary ?? true,
        includeFullDocs: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Supermemory search error:', errText);
      return res.status(response.status).json({ error: "Supermemory search failed" });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error("Memory search error:", err);
    res.status(500).json({ error: err.message });
  }
});

supermemoryRouter.post("/profile", requireAuth, async (req, res) => {
  try {
    const smKey = process.env.SUPERMEMORY_API_KEY;
    if (!smKey) return res.status(500).json({ error: "SUPERMEMORY_API_KEY missing in .env" });

    const user = (req as any).user;
    const { q, threshold } = req.body;

    const response = await fetch(`${SUPERMEMORY_BASE}/v4/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${smKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        containerTag: user.id,
        ...(q ? { q } : {}),
        ...(threshold !== undefined ? { threshold } : {}),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Supermemory profile error:', errText);
      return res.status(response.status).json({ error: "Supermemory profile failed" });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error("Memory profile error:", err);
    res.status(500).json({ error: err.message });
  }
});