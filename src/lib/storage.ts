const provider = import.meta.env.VITE_PROVIDER || 'puter';

export const storage = {
    async stat(path: string) {
        if (provider === 'supabase') {
            throw new Error('Supabase storage.stat not implemented yet');
        }
        return await window.puter.fs.stat(path);
    },

    async write(path: string, content: any, options?: any) {
        if (provider === 'supabase') {
            throw new Error('Supabase storage.write not implemented yet');
        }
        return await window.puter.fs.write(path, content, options);
    },

    async read(path: string) {
        if (provider === 'supabase') {
            throw new Error('Supabase storage.read not implemented yet');
        }
        return await window.puter.fs.read(path);
    },

    async list(path: string) {
        if (provider === 'supabase') {
            throw new Error('Supabase storage.list not implemented yet');
        }
        // Note: puter.fs.list does practically the same thing, 
        // but naming it readdir here for clarity or specific usage if needed.
        return await window.puter.fs.list(path);
    },

    async readdir(path: string) {
        if (provider === 'supabase') {
            throw new Error('Supabase storage.readdir not implemented yet');
        }
        return await window.puter.fs.readdir(path);
    },

    async delete(path: string) {
        if (provider === 'supabase') {
            throw new Error('Supabase storage.delete not implemented yet');
        }
        return await window.puter.fs.delete(path);
    }
};
