import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';

export const exploreRouter = Router();

// ─── Papers CRUD ────────────────────────────────────────────────────────────────

exploreRouter.get('/papers', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const projectId = req.query.projectId as string;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }

        const { data, error } = await supabaseAdmin
            .from('papers')
            .select('*')
            .eq('project_id', projectId)
            .eq('added_by', user.id);

        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        console.error('Get papers error:', err);
        res.status(500).json({ error: err.message });
    }
});

exploreRouter.post('/papers', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { project_id, paper_id, source, title, authors, year, abstract, doi, url, journal, pdf_url } = req.body;

        if (!project_id) {
            return res.status(400).json({ error: 'project_id is required' });
        }

        const { data, error } = await supabaseAdmin
            .from('papers')
            .insert({
                project_id,
                paper_id,
                source: source || 'manual',
                title,
                authors,
                year,
                abstract,
                doi,
                url,
                journal,
                added_by: user.id,
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error('Create paper error:', err);
        res.status(500).json({ error: err.message });
    }
});

exploreRouter.delete('/papers/:paperId', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const paperId = req.params.paperId;

        const { data, error } = await supabaseAdmin
            .from('papers')
            .delete()
            .eq('id', paperId)
            .eq('added_by', user.id)
            .select('*')
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error('Delete paper error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Paper Insights CRUD ────────────────────────────────────────────────────────

exploreRouter.get('/insights', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const projectId = req.query.projectId as string;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }

        const { data, error } = await supabaseAdmin
            .from('paper_insights')
            .select('*')
            .eq('project_id', projectId)
            .eq('author_id', user.id);

        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        console.error('Get insights error:', err);
        res.status(500).json({ error: err.message });
    }
});

exploreRouter.get('/insights/:paperId', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const projectId = req.query.projectId as string;
        const paperId = req.params.paperId;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }

        const { data, error } = await supabaseAdmin
            .from('paper_insights')
            .select('*')
            .eq('project_id', projectId)
            .eq('paper_id', paperId)
            .eq('author_id', user.id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error('Get insight error:', err);
        res.status(500).json({ error: err.message });
    }
});

exploreRouter.post('/insights', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { project_id, paper_id, ...insightData } = req.body;

        if (!project_id) {
            return res.status(400).json({ error: 'project_id is required' });
        }

        const { data, error } = await supabaseAdmin
            .from('paper_insights')
            .insert({
                project_id,
                paper_id,
                author_id: user.id,
                ...insightData,
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error('Create insight error:', err);
        res.status(500).json({ error: err.message });
    }
});

exploreRouter.put('/insights/:insightId', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const insightId = req.params.insightId;

        const { data, error } = await supabaseAdmin
            .from('paper_insights')
            .update(req.body)
            .eq('id', insightId)
            .eq('author_id', user.id)
            .select('*')
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error('Update insight error:', err);
        res.status(500).json({ error: err.message });
    }
});

exploreRouter.delete('/insights/:insightId', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const insightId = req.params.insightId;

        const { data, error } = await supabaseAdmin
            .from('paper_insights')
            .delete()
            .eq('id', insightId)
            .eq('author_id', user.id)
            .select('*')
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error('Delete insight error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Knowledge Graph CRUD ───────────────────────────────────────────────────────

exploreRouter.get('/graph', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const projectId = req.query.projectId as string;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }

        // Get or create knowledge graph for project
        let { data: graph, error: graphError } = await supabaseAdmin
            .from('knowledge_graphs')
            .select('id')
            .eq('project_id', projectId)
            .single();

        if (graphError && graphError.code === 'PGRST116') {
            // Graph doesn't exist, create it
            const { data: newGraph, error: createError } = await supabaseAdmin
                .from('knowledge_graphs')
                .insert({
                    project_id: projectId,
                    author_id: user.id,
                })
                .select()
                .single();

            if (createError) throw createError;
            graph = newGraph;
        } else if (graphError) {
            throw graphError;
        }

        // Fetch nodes and edges
        const [{ data: nodes, error: nodesError }, { data: edges, error: edgesError }] = await Promise.all([
            supabaseAdmin
                .from('knowledge_graph_nodes')
                .select('*')
                .eq('graph_id', graph.id),
            supabaseAdmin
                .from('knowledge_graph_edges')
                .select('*')
                .eq('graph_id', graph.id),
        ]);

        if (nodesError) throw nodesError;
        if (edgesError) throw edgesError;

        res.json({
            id: graph.id,
            nodes: nodes || [],
            edges: edges || [],
        });
    } catch (err: any) {
        console.error('Get graph error:', err);
        res.status(500).json({ error: err.message });
    }
});

exploreRouter.post('/graph/nodes', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { graph_id, project_id, ...nodeData } = req.body;

        if (!graph_id || !project_id) {
            return res.status(400).json({ error: 'graph_id and project_id are required' });
        }

        const { data, error } = await supabaseAdmin
            .from('knowledge_graph_nodes')
            .insert({
                graph_id,
                project_id,
                ...nodeData,
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error('Create node error:', err);
        res.status(500).json({ error: err.message });
    }
});

exploreRouter.put('/graph/nodes/:nodeId', requireAuth, async (req, res) => {
    try {
        const nodeId = req.params.nodeId;

        const { data, error } = await supabaseAdmin
            .from('knowledge_graph_nodes')
            .update(req.body)
            .eq('id', nodeId)
            .select('*')
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error('Update node error:', err);
        res.status(500).json({ error: err.message });
    }
});

exploreRouter.post('/graph/edges', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { graph_id, project_id, ...edgeData } = req.body;

        if (!graph_id || !project_id) {
            return res.status(400).json({ error: 'graph_id and project_id are required' });
        }

        const { data, error } = await supabaseAdmin
            .from('knowledge_graph_edges')
            .insert({
                graph_id,
                project_id,
                ...edgeData,
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error('Create edge error:', err);
        res.status(500).json({ error: err.message });
    }
});

exploreRouter.delete('/graph/edges/:edgeId', requireAuth, async (req, res) => {
    try {
        const edgeId = req.params.edgeId;

        const { data, error } = await supabaseAdmin
            .from('knowledge_graph_edges')
            .delete()
            .eq('id', edgeId)
            .select('*')
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error('Delete edge error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Clear Graph (Reset all nodes and edges) ────────────────────────────────────

exploreRouter.post('/graph/clear', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { graph_id } = req.body;

        if (!graph_id) {
            return res.status(400).json({ error: 'graph_id is required' });
        }

        // Delete all edges first (foreign key constraint)
        await supabaseAdmin
            .from('knowledge_graph_edges')
            .delete()
            .eq('graph_id', graph_id);

        // Delete all nodes
        await supabaseAdmin
            .from('knowledge_graph_nodes')
            .delete()
            .eq('graph_id', graph_id);

        res.json({ success: true });
    } catch (err: any) {
        console.error('Clear graph error:', err);
        res.status(500).json({ error: err.message });
    }
});
