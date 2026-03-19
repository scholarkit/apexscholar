import { apiFetch } from './apiFetch';

const getToken = () => localStorage.getItem('supabase_token') || '';

export const storage = {
    async stat(path: string) {
        const res = await apiFetch(`/api/storage/stat?path=${encodeURIComponent(path)}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('File not found or access denied');
        const { data } = await res.json();
        return data;
    },

    async write(path: string, content: any, options?: any) {
        let body: any = content;
        let contentType = 'application/octet-stream';
        
        if (content instanceof File || content instanceof Blob) {
            body = await content.arrayBuffer();
            contentType = content.type || contentType;
        } else if (typeof content === 'string') {
            contentType = 'text/plain;charset=UTF-8';
        } else {
            body = JSON.stringify(content);
            contentType = 'application/json';
        }

        const res = await apiFetch(`/api/storage/write?path=${encodeURIComponent(path)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': contentType
            },
            body: body
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Failed to upload file');
        }
        return await res.json();
    },

    async read(path: string) {
        const url = await this.getReadURL(path);
        
        // Fetch the actual content from the signed URL
        const contentRes = await fetch(url);
        if (!contentRes.ok) throw new Error('Failed to fetch file content');
        
        const contentType = contentRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return await contentRes.json();
        } else if (contentType.includes('text/')) {
            const text = await contentRes.text();
            return text; 
        }
        return await contentRes.blob();
    },

    async list(path: string) {
        const res = await apiFetch(`/api/storage/list?path=${encodeURIComponent(path)}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed to list directory');
        const { data } = await res.json();
        return data;
    },

    async readdir(path: string) {
        const res = await apiFetch(`/api/storage/list?path=${encodeURIComponent(path)}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed to read directory');
        const { data } = await res.json();
        return data;
    },

    async delete(path: string) {
        const res = await apiFetch(`/api/storage/delete?path=${encodeURIComponent(path)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed to delete file');
        return true;
    },

    async getReadURL(path: string) {
        const res = await apiFetch(`/api/storage/read?path=${encodeURIComponent(path)}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed to get read URL');
        const { url } = await res.json();
        return url;
    }
};
