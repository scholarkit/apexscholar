import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getEntries, getEntry, createEntry, updateEntry, deleteEntry, getResources, createResource, deleteResource, closeDatabase, reopenDatabase, getLatestInsight, createInsight, getInsights } from './src/db';
import archiver from 'archiver';
import AdmZip from 'adm-zip';

const PORT = 3000;
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  app.use(express.json());

  // Serve uploaded files
  app.use('/uploads', express.static(UPLOADS_DIR));

  // API Routes
  app.get('/api/entries', (req, res) => {
    res.json(getEntries());
  });

  app.get('/api/entries/:id', (req, res) => {
    const entry = getEntry(req.params.id);
    if (entry) res.json(entry);
    else res.status(404).json({ error: 'Not found' });
  });

  app.post('/api/entries', (req, res) => {
    const entry = req.body;
    createEntry(entry);
    res.status(201).json(entry);
  });

  app.put('/api/entries/:id', (req, res) => {
    const entry = req.body;
    updateEntry(entry);
    res.json(entry);
  });

  app.delete('/api/entries/:id', (req, res) => {
    deleteEntry(req.params.id);
    res.status(204).send();
  });

  app.get('/api/resources', (req, res) => {
    res.json(getResources());
  });

  app.post('/api/resources', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const resource = {
      id: req.body.id || Math.random().toString(36).substring(7),
      name: req.file.originalname,
      type: req.file.mimetype,
      path: `uploads/${req.file.filename}`,
      date_added: new Date().toISOString()
    };
    createResource(resource);
    res.status(201).json(resource);
  });

  app.delete('/api/resources/:id', (req, res) => {
    deleteResource(req.params.id);
    res.status(204).send();
  });

  app.get('/api/insights', (_req, res) => {
    try {
      console.log('GET /api/insights - Fetching latest insight');
      const latest = getLatestInsight();
      console.log('GET /api/insights - Found:', latest ? 'Yes' : 'No');
      res.json({ 
        summary: latest?.content || null, 
        created_at: latest?.created_at || null 
      });
    } catch (error) {
      console.error('GET /api/insights Error:', error);
      res.status(500).json({ error: 'Failed to fetch saved insights' });
    }
  });

  app.post('/api/insights', async (req, res) => {
    try {
      const { summary } = req.body;
      
      if (!summary) {
        return res.status(400).json({ error: 'Missing summary in request body' });
      }
      
      console.log('POST /api/insights - Saving insight to DB');
      createInsight(summary);
      
      res.json({ summary });
    } catch (error: any) {
      console.error('Save Insight Error:', error);
      res.status(500).json({ 
        error: 'Failed to save insights',
        details: error.message || 'Unknown error'
      });
    }
  });

  app.get('/api/backup', (req, res) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment('research-backup.zip');
    archive.pipe(res);
    
    // Add database
    const dbPath = path.resolve(process.cwd(), 'research.db');
    if (fs.existsSync(dbPath)) {
      archive.file(dbPath, { name: 'research.db' });
    }
    
    // Add uploads
    if (fs.existsSync(UPLOADS_DIR)) {
      archive.directory(UPLOADS_DIR, 'uploads');
    }

    // Add insights as JSON for visibility
    try {
      const insights = getInsights();
      archive.append(JSON.stringify(insights, null, 2), { name: 'insights.json' });
    } catch (err) {
      console.error('Backup Insights Error:', err);
    }
    
    archive.finalize();
  });
  
  app.post('/api/restore', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const zipPath = req.file.path;
      const zip = new AdmZip(zipPath);
      
      // Close DB before overwriting
      closeDatabase();

      // Extract contents over existing files
      zip.extractAllTo(process.cwd(), true);

      // Reopen DB
      reopenDatabase();

      // Delete the temporary uploaded zip
      fs.unlinkSync(zipPath);

      res.json({ message: 'Backup restored successfully' });
    } catch (error) {
      console.error('Restore Error:', error);
      // Try to reopen DB if it was closed
      try { reopenDatabase(); } catch(e) {}
      res.status(500).json({ error: 'Failed to restore backup' });
    }
  });

  // API 404 Handler - Returns JSON instead of falling through to Vite/SPA
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
