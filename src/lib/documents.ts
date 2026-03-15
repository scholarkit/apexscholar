import { kv } from './kv';
import { apiFetch } from './apiFetch';

const provider = (import.meta as any).env?.VITE_PROVIDER || 'puter';


export interface DocumentData {
    id: string;
    project_id: string;
    user_id?: string;
    title: string;
    type: string;
    created_at: string;
    updated_at: string;
}

export const documentService = {
    async getDocuments(projectId: string): Promise<DocumentData[]> {
        if (provider === 'supabase') {
            const token = localStorage.getItem('supabase_token');
            const res = await apiFetch(`/api/documents?project_id=${projectId}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('Failed to fetch documents');
            const { data } = await res.json();
            return data || [];
        }

        const projectDocsKey = `docs_${projectId}`;
        const docs = await kv.get(projectDocsKey);
        return docs || [];
    },

    async createDocument(projectId: string, title: string, type: string = 'thesis'): Promise<DocumentData> {
        if (provider === 'supabase') {
            const token = localStorage.getItem('supabase_token');
            const res = await apiFetch('/api/documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ project_id: projectId, title, type })
            });
            if (!res.ok) throw new Error('Failed to create document');
            const { data } = await res.json();
            return data;
        }

        const projectDocsKey = `docs_${projectId}`;
        const docs = await kv.get(projectDocsKey) || [];
        const newDoc: DocumentData = {
            id: Math.random().toString(36).substring(7),
            project_id: projectId,
            title,
            type,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        await kv.set(projectDocsKey, [newDoc, ...docs]);
        return newDoc;
    },

    async updateDocument(id: string, projectId: string, patch: Partial<Pick<DocumentData, 'title' | 'type'>>): Promise<DocumentData> {
        if (provider === 'supabase') {
            const token = localStorage.getItem('supabase_token');
            const res = await apiFetch(`/api/documents/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(patch)
            });
            if (!res.ok) throw new Error('Failed to update document');
            const { data } = await res.json();
            return data;
        }

        const projectDocsKey = `docs_${projectId}`;
        const docs = (await kv.get(projectDocsKey)) || [];
        
        let updatedDoc: DocumentData | null = null;
        const updatedDocs = docs.map((d: DocumentData) => {
            if (d.id === id) {
                updatedDoc = { ...d, ...patch, updated_at: new Date().toISOString() };
                return updatedDoc;
            }
            return d;
        });

        if (!updatedDoc) throw new Error('Document not found locally');

        await kv.set(projectDocsKey, updatedDocs);
        return updatedDoc;
    },

    async deleteDocument(id: string, projectId: string): Promise<void> {
        if (provider === 'supabase') {
            const token = localStorage.getItem('supabase_token');
            const res = await apiFetch(`/api/documents/${id}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('Failed to delete document');
            return;
        }

        const projectDocsKey = `docs_${projectId}`;
        const docs = (await kv.get(projectDocsKey)) || [];
        const updatedDocs = docs.filter((d: DocumentData) => d.id !== id);
        await kv.set(projectDocsKey, updatedDocs);
    }
};
