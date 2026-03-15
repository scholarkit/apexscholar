import { apiFetch } from './apiFetch';

const provider = import.meta.env.VITE_PROVIDER || 'puter';

const getToken = () => localStorage.getItem('supabase_token') || '';

export const storage = {
    async stat(path: string) {
        if (provider === 'supabase') {
            const res = await apiFetch(`/api/storage/stat?path=${encodeURIComponent(path)}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('File not found or access denied');
            const { data } = await res.json();
            return data;
        }
        return await window.puter.fs.stat(path);
    },

    async write(path: string, content: any, options?: any) {
        if (provider === 'supabase') {
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
        }
        return await window.puter.fs.write(path, content, options);
    },

    async read(path: string) {
        if (provider === 'supabase') {
            const res = await apiFetch(`/api/storage/read?path=${encodeURIComponent(path)}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('Failed to get read URL');
            const { url } = await res.json();
            
            // Fetch the actual content from the signed URL
            const contentRes = await fetch(url);
            if (!contentRes.ok) throw new Error('Failed to fetch file content');
            
            const contentType = contentRes.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return await contentRes.json();
            } else if (contentType.includes('text/')) {
                const text = await contentRes.text();
                // Puter read returns a text wrapper if it's text
                return provider === 'supabase' ? text : text; 
            }
            return await contentRes.blob();
        }
        return await window.puter.fs.read(path);
    },

    async list(path: string) {
        if (provider === 'supabase') {
            const res = await apiFetch(`/api/storage/list?path=${encodeURIComponent(path)}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('Failed to list directory');
            const { data } = await res.json();
            return data;
        }
        return await window.puter.fs.list(path);
    },

    async readdir(path: string) {
        if (provider === 'supabase') {
            const res = await apiFetch(`/api/storage/list?path=${encodeURIComponent(path)}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('Failed to read directory');
            const { data } = await res.json();
            return data;
        }
        return await window.puter.fs.readdir(path);
    },

    async delete(path: string) {
        if (provider === 'supabase') {
            const res = await apiFetch(`/api/storage/delete?path=${encodeURIComponent(path)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('Failed to delete file');
            return true;
        }
        return await window.puter.fs.delete(path);
    }
};
