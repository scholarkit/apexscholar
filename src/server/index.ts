import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import express from 'express';
import path from 'path';
import { zoteroRouter } from './zotero.ts';
import { sourcesRouter } from './sources.ts';
import { latexRouter } from './latex.ts';
import { authRouter } from './auth.ts';
import { aiRouter } from './ai.ts';
import { supermemoryRouter } from './supermemory.ts';
import { errorHandler } from './middleware.ts';
import { storageRouter } from './storage.ts';
import { documentsRouter } from './documents.ts';
import { kvRouter } from './kv.ts';
import { projectsRouter } from './projects.ts';
import { journalRouter } from './journal.ts';
import { resourcesRouter } from './resources.ts';
import { grantRouter } from './grants.ts';
import { exploreRouter } from './explore.ts';
import { brainRouter } from './brain.ts';

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
app.use('/api/funding', grantRouter);
app.use('/api/explore', exploreRouter);
app.use('/api/brain', brainRouter);

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
