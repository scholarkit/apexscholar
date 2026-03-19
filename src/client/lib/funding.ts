import { kv } from './kv';
import { apiFetch } from './apiFetch';



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
        const res = await apiFetch(baseUrl, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`,
            },
        });
        if (!res.ok) return [];
        return res.json() || [];
    },

    async createGrant(entry: Omit<Grant, 'id'>): Promise<Grant> {
        const res = await apiFetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
             },
            body: JSON.stringify(entry),
        });
        if (!res.ok) throw new Error('Failed to create journal entry');
        return res.json() || entry;
    },

    async updateGrant(id: string, patch: Partial<Grant>): Promise<Grant> {
        const res = await apiFetch(`${baseUrl}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
             },
            body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error('Failed to update journal entry');
        return res.json() || patch;
    },

    async deleteEntry(id: string): Promise<void> {
        const res = await apiFetch(`${baseUrl}/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
            },
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete journal entry');
        return;
    }
};
