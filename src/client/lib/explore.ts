import { kv } from './kv';
import { apiFetch } from './apiFetch';

const provider = import.meta.env.VITE_PROVIDER || 'puter';

export interface Paper {
    id?: string;
    project_id?: string;
    paper_id?: string;
    title: string;
    authors: string[];
    year: string;
    abstract: string;
    doi?: string;
    url?: string;
    journal?: string;
    source: 'arxiv' | 'openalex' | 'semanticscholar' | 'googlescholar' | 'pubmed' | 'crossref' | 'manual';
    pdf_url?: string;
    saved?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface PaperInsight {
    id?: string;
    project_id?: string;
    author_id?: string;
    paper_id: string;
    problem: string;
    task: string;
    domain: string;
    method: string;
    key_ideas?: string[];
    assumptions?: string[];
    limitations?: string[];
    contributions?: string[];
    datasets?: string[];
    metrics?: string[];
    future_work?: string[];
    confidence?: number;
    user_edited?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface KGNode {
    id?: string;
    graph_id?: string;
    project_id?: string;
    node_id: string;
    node_type: 'problem' | 'method' | 'dataset' | 'metric' | 'domain' | 'idea';
    label: string;
    paper_ids?: string[];
    created_at?: string;
    updated_at?: string;
}

export interface KGEdge {
    id?: string;
    graph_id?: string;
    project_id?: string;
    edge_id: string;
    source_id: string;
    target_id: string;
    relation: 'uses' | 'improves' | 'evaluates' | 'applies_to';
    created_at?: string;
    updated_at?: string;
}

export interface KGGraph {
    id?: string;
    nodes: KGNode[];
    edges: KGEdge[];
}

const INSIGHTS_KEY = 'research_paper_insights';
const KG_KEY = 'research_knowledge_graph';
const PAPERS_KEY = 'research_knowledgebase';
const baseUrl = '/api/explore';

export const exploreService = {
    /**
     * Papers
     */
    async getPapers(projectId?: string): Promise<Paper[]> {
        if (provider === 'supabase') {
            if (!projectId) return [];
            const res = await apiFetch(`${baseUrl}/papers?projectId=${projectId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
            });
            if (!res.ok) return [];
            return (await res.json()) || [];
        }
        // Fallback to KV
        const papers = await kv.get(PAPERS_KEY);
        if (!projectId) return papers || [];
        return (papers || []).filter(p => p.project_id === projectId);
    },

    async addPaper(paper: Paper, projectId?: string): Promise<Paper> {
        if (provider === 'supabase') {
            if (!projectId) throw new Error('projectId is required');
            const res = await apiFetch(baseUrl + '/papers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
                body: JSON.stringify({ ...paper, project_id: projectId }),
            });
            if (!res.ok) throw new Error('Failed to add paper');
            return await res.json();
        }
        // Fallback to KV
        const newPaper: Paper = {
            ...paper,
            saved: true,
            project_id: projectId,
        };
        const papers = (await kv.get(PAPERS_KEY)) || [];
        await kv.set(PAPERS_KEY, [newPaper, ...papers]);
        return newPaper;
    },

    async removePaper(paperId: string): Promise<void> {
        if (provider === 'supabase') {
            const res = await apiFetch(`${baseUrl}/papers/${paperId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
            });
            if (!res.ok) throw new Error('Failed to remove paper');
            return;
        }
        // Fallback to KV
        const papers = (await kv.get(PAPERS_KEY)) || [];
        const updated = papers.filter(p => p.id !== paperId);
        await kv.set(PAPERS_KEY, updated);
    },
    async getInsights(projectId?: string): Promise<PaperInsight[]> {
        if (provider === 'supabase') {
            if (!projectId) return [];
            const res = await apiFetch(`${baseUrl}/insights?projectId=${projectId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
            });
            if (!res.ok) return [];
            return (await res.json()) || [];
        }
        // Fallback to KV
        const insights = await kv.get(INSIGHTS_KEY);
        if (!projectId) return Object.values(insights || {}).flat();
        return Object.values(insights || {})
            .flat()
            .filter((i: any) => i.project_id === projectId);
    },

    async getInsight(paperId: string, projectId?: string): Promise<PaperInsight | null> {
        if (provider === 'supabase') {
            if (!projectId) return null;
            const res = await apiFetch(`${baseUrl}/insights/${paperId}?projectId=${projectId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
            });
            if (!res.ok) return null;
            return await res.json();
        }
        // Fallback to KV
        const insights = await kv.get(INSIGHTS_KEY);
        return (insights?.[paperId] as PaperInsight) || null;
    },

    async createInsight(insight: Omit<PaperInsight, 'id' | 'created_at' | 'updated_at'>, projectId?: string): Promise<PaperInsight> {
        if (provider === 'supabase') {
            if (!projectId) throw new Error('projectId is required');
            const res = await apiFetch(baseUrl + '/insights', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
                body: JSON.stringify({ ...insight, project_id: projectId }),
            });
            if (!res.ok) throw new Error('Failed to create insight');
            return await res.json();
        }
        // Fallback to KV
        const newInsight: PaperInsight = {
            ...insight,
            id: Math.random().toString(36).substring(2, 11),
        };
        const insights = (await kv.get(INSIGHTS_KEY)) || {};
        await kv.set(INSIGHTS_KEY, { ...insights, [insight.paper_id]: newInsight });
        return newInsight;
    },

    async updateInsight(insightId: string, patch: Partial<PaperInsight>, projectId?: string): Promise<PaperInsight> {
        if (provider === 'supabase') {
            if (!projectId) throw new Error('projectId is required');
            const res = await apiFetch(`${baseUrl}/insights/${insightId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
                body: JSON.stringify(patch),
            });
            if (!res.ok) throw new Error('Failed to update insight');
            return await res.json();
        }
        // Fallback to KV
        const insights = (await kv.get(INSIGHTS_KEY)) || {};
        const paperId = Object.keys(insights).find(key => insights[key].id === insightId);
        if (paperId) {
            insights[paperId] = { ...insights[paperId], ...patch };
            await kv.set(INSIGHTS_KEY, insights);
            return insights[paperId];
        }
        throw new Error('Insight not found');
    },

    async deleteInsight(insightId: string, projectId?: string): Promise<void> {
        if (provider === 'supabase') {
            const res = await apiFetch(`${baseUrl}/insights/${insightId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
            });
            if (!res.ok) throw new Error('Failed to delete insight');
            return;
        }
        // Fallback to KV
        const insights = (await kv.get(INSIGHTS_KEY)) || {};
        const paperId = Object.keys(insights).find(key => insights[key].id === insightId);
        if (paperId) {
            delete insights[paperId];
            await kv.set(INSIGHTS_KEY, insights);
        }
    },

    /**
     * Knowledge Graph
     */
    async getGraph(projectId?: string): Promise<KGGraph> {
        if (provider === 'supabase') {
            if (!projectId) return { nodes: [], edges: [] };
            const res = await apiFetch(`${baseUrl}/graph?projectId=${projectId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
            });
            if (!res.ok) return { nodes: [], edges: [] };
            return await res.json();
        }
        // Fallback to KV
        const graph = await kv.get(KG_KEY);
        return graph || { nodes: [], edges: [] };
    },

    async upsertNode(node: Omit<KGNode, 'id' | 'created_at' | 'updated_at'>, projectId?: string): Promise<KGNode> {
        if (provider === 'supabase') {
            if (!projectId || !node.graph_id) throw new Error('projectId and graph_id are required');
            const res = await apiFetch(`${baseUrl}/graph/nodes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
                body: JSON.stringify({ ...node, project_id: projectId }),
            });
            if (!res.ok) throw new Error('Failed to create node');
            return await res.json();
        }
        // Fallback to in-memory
        return { ...node } as KGNode;
    },

    async updateNode(nodeId: string, patch: Partial<KGNode>): Promise<KGNode> {
        if (provider === 'supabase') {
            const res = await apiFetch(`${baseUrl}/graph/nodes/${nodeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
                body: JSON.stringify(patch),
            });
            if (!res.ok) throw new Error('Failed to update node');
            return await res.json();
        }
        return { ...patch } as KGNode;
    },

    async upsertEdge(edge: Omit<KGEdge, 'id' | 'created_at' | 'updated_at'>, projectId?: string): Promise<KGEdge> {
        if (provider === 'supabase') {
            if (!projectId || !edge.graph_id) throw new Error('projectId and graph_id are required');
            const res = await apiFetch(`${baseUrl}/graph/edges`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
                body: JSON.stringify({ ...edge, project_id: projectId }),
            });
            if (!res.ok) throw new Error('Failed to create edge');
            return await res.json();
        }
        return { ...edge } as KGEdge;
    },

    async deleteEdge(edgeId: string): Promise<void> {
        if (provider === 'supabase') {
            const res = await apiFetch(`${baseUrl}/graph/edges/${edgeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
            });
            if (!res.ok) throw new Error('Failed to delete edge');
            return;
        }
    },

    async clearGraph(graphId: string): Promise<void> {
        if (provider === 'supabase') {
            const res = await apiFetch(`${baseUrl}/graph/clear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
                body: JSON.stringify({ graph_id: graphId }),
            });
            if (!res.ok) throw new Error('Failed to clear graph');
            return;
        }
        // Fallback to KV
        await kv.set(KG_KEY, { nodes: [], edges: [] });
    },

    // Local in-memory operations for graph manipulation (used alongside API)
    async saveGraphLocally(graph: KGGraph): Promise<void> {
        if (provider !== 'supabase') {
            await kv.set(KG_KEY, graph);
        }
    },
};
