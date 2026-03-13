const provider = import.meta.env.VITE_PROVIDER || 'puter';

export const ai = {
    async chat(messages: any[], options?: any) {
        if (provider === 'supabase') {
            throw new Error('Supabase ai.chat not implemented yet');
        }
        return await window.puter.ai.chat(messages, options);
    },

    async txt2speech(text: string, options?: any) {
        if (provider === 'supabase') {
            throw new Error('Supabase ai.txt2speech not implemented yet');
        }
        return await window.puter.ai.txt2speech(text, options);
    }
};
