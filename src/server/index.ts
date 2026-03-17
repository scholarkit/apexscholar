import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import express from 'express';
import path from 'path';
import { zoteroRouter } from './zotero';
import { sourcesRouter } from './sources';
import { latexRouter } from './latex';
import { authRouter } from './auth';
import { aiRouter } from './ai';
import { supermemoryRouter } from './supermemory';
import { errorHandler } from './middleware';
import { storageRouter } from './storage';
import { documentsRouter } from './documents';
import { kvRouter } from './kv';
import { projectsRouter } from './projects';
import { journalRouter } from './journal';
import { resourcesRouter } from './resources';

const PORT = 3000;

// Global middlewares
const app = express();
app.use(express.json());

// Auth route
app.use('/api/auth', authRouter);

// Feature routers
app.use('/api/zotero', zoteroRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/latex', latexRouter);
app.use('/api/ai', aiRouter);
app.use('/api/memory', supermemoryRouter);
app.use('/api/storage', storageRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/kv', kvRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/journal', journalRouter);
app.use('/api/resources', resourcesRouter);

// Global error handler
app.use(errorHandler);

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