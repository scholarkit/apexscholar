import { Router } from 'express';
import { supabaseAdmin } from './supabase';
import { requireAuth } from './middleware';
import express from 'express';

export const storageRouter = Router();

storageRouter.post("/write", requireAuth, express.raw({ type: '*/*', limit: '100mb' }), async (req, res) => {
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

storageRouter.get("/read", requireAuth, async (req, res) => {
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

storageRouter.delete("/delete", requireAuth, async (req, res) => {
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

storageRouter.get("/list", requireAuth, async (req, res) => {
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

storageRouter.get("/stat", requireAuth, async (req, res) => {
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