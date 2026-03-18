import { kv } from './kv';
import { apiFetch } from './apiFetch';

const provider = import.meta.env.VITE_PROVIDER || 'puter';

export interface Requirement {
    id: string;
    description: string;
    completed: boolean;
}

export interface Budget {
    requested: number;
    awarded: number;
    spent: number;
    currency: string;
}

export interface Grant {
    id: string;
    title: string;
    funder: string;
    deadline: string; // ISO string
    status: 'planned' | 'drafting' | 'submitted' | 'awarded' | 'rejected';
    requirements: Requirement[];
    budget: Budget;
    document_url?: string; // Link to Putnam Drive / Google Docs
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

const KV_KEY = 'research_funding';
const baseUrl = '/api/funding';

export const fundingService = {
    /**
     * Journal Entries
     */
    async listAllGrants(): Promise<Grant[]> {
        if (provider === 'supabase') {
            const res = await apiFetch(baseUrl, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
                },
            });
            if (!res.ok) return [];
            return res.json() || [];
        }
        const entries = await kv.get(KV_KEY);
        return entries || [];
    },

    async createGrant(entry: Omit<Grant, 'id'>): Promise<Grant> {
        if (provider === 'supabase') {
            const res = await apiFetch(baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
                 },
                body: JSON.stringify(entry),
            });
            if (!res.ok) throw new Error('Failed to create journal entry');
            return res.json() || entry;
        }
        const newEntry: Grant = {
            ...entry,
            id: Math.random().toString(36).substring(7),
        };
        const entries = await this.listAll();
        await kv.set(KV_KEY, [newEntry, ...entries]);
        return newEntry;
    },

    async updateGrant(id: string, patch: Partial<Grant>): Promise<Grant> {
        if (provider === 'supabase') {
            const res = await apiFetch(`${baseUrl}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
                 },
                body: JSON.stringify(patch),
            });
            if (!res.ok) throw new Error('Failed to update journal entry');
            return res.json() || patch;
        }

        const entries = await this.getEntries();
        const updated = entries.map(e => e.id === id ? { ...e, ...patch } : e);
        await kv.set(KV_KEY, updated);
        return updated.find(e => e.id === id)!;
    },

    async deleteEntry(id: string): Promise<void> {
        if (provider === 'supabase') {
            const res = await apiFetch(`${baseUrl}/${id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
                },
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete journal entry');
            return;
        }

        const entries = await this.getEntries();
        const updated = entries.filter(e => e.id !== id);
        await kv.set(KV_KEY, updated);
    }
};
