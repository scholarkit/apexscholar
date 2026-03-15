import { apiFetch } from './apiFetch';

// ── Types ───────────────────────────────────────────────────────────

export interface SearchChunk {
    content: string;
    isRelevant: boolean;
    score: number;
}

export interface SearchResultItem {
    documentId: string;
    title: string;
    summary?: string;
    content?: string;
    score: number;
    chunks: SearchChunk[];
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    type?: string;
}

export interface SearchResult {
    results: SearchResultItem[];
    total: number;
    timing: number;
}

export interface UserProfile {
    profile: {
        static: string[];
        dynamic: string[];
    };
    searchResults?: {
        results: any[];
        total: number;
        timing: number;
    };
}

interface SearchOptions {
    limit?: number;
    chunkThreshold?: number;
    includeSummary?: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('supabase_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
}

// ── Service ─────────────────────────────────────────────────────────

export const supermemory = {
    /**
     * Add a memory to Supermemory. Fire-and-forget safe — errors are
     * logged but never thrown so callers don't need try/catch.
     */
    async addMemory(content: string, metadata?: Record<string, any>): Promise<any> {
        try {
            const res = await apiFetch('/api/memory/add', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ content, metadata }),
            });
            if (!res.ok) {
                console.warn('[supermemory] addMemory failed:', res.status);
                return null;
            }
            return await res.json();
        } catch (err) {
            console.warn('[supermemory] addMemory error:', err);
            return null;
        }
    },

    /**
     * Semantic search across user memories.
     */
    async searchMemory(query: string, options?: SearchOptions): Promise<SearchResult> {
        const res = await apiFetch('/api/memory/search', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                q: query,
                limit: options?.limit ?? 10,
                chunkThreshold: options?.chunkThreshold ?? 0.5,
                includeSummary: options?.includeSummary ?? true,
            }),
        });
        if (!res.ok) throw new Error('Memory search failed');
        return await res.json();
    },

    /**
     * Get the user's AI-generated profile (static + dynamic facts).
     * Optionally include search results for a query.
     */
    async getUserProfile(query?: string): Promise<UserProfile> {
        const res = await apiFetch('/api/memory/profile', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                ...(query ? { q: query } : {}),
            }),
        });
        if (!res.ok) throw new Error('Profile fetch failed');
        return await res.json();
    },
};
