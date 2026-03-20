import { kv } from './kv';
import { apiFetch } from './apiFetch';
import { supermemory } from '../lib/supermemory';

export interface JournalEntry {
    id?: string;
    project_id?: string;
    author_id?: string;
    date: string;
    content: string;
    type: string;
    start_date?: string;
    end_date?: string;
    created_at?: string;
    updated_at?: string;
}

export interface JournalInsight {
    id: string;
    projectId?: string;
    content: string;
    created_at: string;
}

const ENTRIES_KEY = 'research_entries';
const INSIGHTS_KEY = 'research_insights';
const baseUrl = '/api/journal';

export const journalService = {
    /**
     * Journal Entries
     */
    async getEntries(projectId?: string): Promise<JournalEntry[]> {
        const res = await apiFetch(`${baseUrl}/${projectId || ''}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
            },
        });
        if (!res.ok) return [];
        return res.json() || [];
    },

    async createEntry(entry: Omit<JournalEntry, 'id'>): Promise<JournalEntry> {
        const res = await apiFetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
            },
            body: JSON.stringify(entry),
        });
        if (!res.ok) throw new Error('Failed to create journal entry');
        
        // Track journal entry creation in memory
        supermemory.addMemory(`[journal] create_entry: type=${entry.type}, projectId=${entry.project_id || 'none'}, contentPreview=${entry.content.substring(0, 100)}${entry.content.length > 100 ? '...' : ''}`, { 
            module: 'journal', 
            action: 'create_entry',
            entryType: entry.type,
            projectId: entry.project_id,
            contentPreview: entry.content.substring(0, 100) + (entry.content.length > 100 ? '...' : '')
        });
        
        return res.json() || entry;
    },

    async updateEntry(id: string, patch: Partial<JournalEntry>): Promise<JournalEntry> {
        const res = await apiFetch(`${baseUrl}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
            },
            body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error('Failed to update journal entry');
        
        // Track journal entry update in memory
        supermemory.addMemory(`[journal] update_entry: entryId=${id}, updatedFields=${Object.keys(patch).join(', ')}`, { 
            module: 'journal', 
            action: 'update_entry',
            entryId: id,
            updatedFields: Object.keys(patch)
        });
        
        return res.json() || patch;
    },

    async deleteEntry(id: string): Promise<void> {
        const res = await apiFetch(`${baseUrl}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
            },
        });
        if (!res.ok) throw new Error('Failed to delete journal entry');
        
        // Track journal entry deletion in memory
        supermemory.addMemory(`[journal] delete_entry: entryId=${id}`, { 
            module: 'journal', 
            action: 'delete_entry',
            entryId: id
        });
        
        return;
    },

    /**
     * Journal Insights
     */
    async getInsights(): Promise<JournalInsight[]> {
        // Insights are currently stored in KV even for Supabase provider in existing code
        // but we can support both patterns if needed. For now, following Insights.tsx pattern.
        const insights = await kv.get(INSIGHTS_KEY);
        return insights || [];
    },

    async createInsight(insight: Omit<JournalInsight, 'id'>): Promise<JournalInsight> {
        const newInsight: JournalInsight = {
            ...insight,
            id: Math.random().toString(36).substring(2, 11),
        };

        const insights = await this.getInsights();
        await kv.set(INSIGHTS_KEY, [newInsight, ...insights]);
        
        // Track insight creation in memory
        supermemory.addMemory(`[journal] create_insight: projectId=${insight.projectId || 'none'}, contentPreview=${insight.content.substring(0, 100)}${insight.content.length > 100 ? '...' : ''}`, { 
            module: 'journal', 
            action: 'create_insight',
            projectId: insight.projectId,
            contentPreview: insight.content.substring(0, 100) + (insight.content.length > 100 ? '...' : '')
        });
        
        return newInsight;
    },

    async deleteInsight(id: string): Promise<void> {
        const insights = await this.getInsights();
        const updated = insights.filter(i => i.id !== id);
        await kv.set(INSIGHTS_KEY, updated);
        
        // Track insight deletion in memory
        supermemory.addMemory(`[journal] delete_insight: insightId=${id}`, { 
            module: 'journal', 
            action: 'delete_insight',
            insightId: id
        });
    }
};
