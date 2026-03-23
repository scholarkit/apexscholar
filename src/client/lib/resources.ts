import { apiFetch } from './apiFetch';

export interface Resource {
    id?: string;
    project_id: string;
    user_id: string;
    name: string;
    source: string;
    source_id?: string;
    type: string;
    abstract: string;
    doi?: string;
    url?: string;
    year?: number;
    journal?: string;
    authors?: any[];
    path?: string;
    metadata?: any;
    zotero_version?: string;
    zotero_meta?: any;
    created_at?: string;
    updated_at?: string;
}

const getToken = () => localStorage.getItem('supabase_token') || '';

export const resourcesService = {
    async getCount(): Promise<number> {
        const res = await apiFetch(`/api/resources/count`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) return 0;
        const data = await res.json();
        return data.count || 0;
    },

    async listAll(): Promise<Resource[]> {
        const res = await apiFetch(`/api/resources`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed to fetch resources');
        return await res.json();
    },

    async listForProject(projectId: string): Promise<Resource[]> {
        const res = await apiFetch(`/api/resources/${projectId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed to fetch resources');
        return await res.json();
    },

    async create(resource: Partial<Resource>): Promise<Resource> {
        const res = await apiFetch('/api/resources', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resource)
        });
        if (!res.ok) throw new Error('Failed to create resource');
        return await res.json();
    },

    async delete(id: string): Promise<void> {
        const res = await apiFetch(`/api/resources/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed to delete resource');
    }
};
