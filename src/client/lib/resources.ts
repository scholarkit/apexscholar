import { apiFetch } from './apiFetch';
import { Resource } from './puter';

const getToken = () => localStorage.getItem('supabase_token') || '';

export const resourcesService = {
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
