const provider = import.meta.env.VITE_PROVIDER || 'puter';

export const auth = {
    async signIn() {
        if (provider === 'supabase') {
            throw new Error('Supabase signIn not implemented yet');
        }
        return await window.puter.auth.signIn();
    },

    async isSignedIn() {
        if (provider === 'supabase') {
            throw new Error('Supabase isSignedIn not implemented yet');
        }
        return await window.puter.auth.isSignedIn();
    },

    async signOut() {
        if (provider === 'supabase') {
            throw new Error('Supabase signOut not implemented yet');
        }
        return await window.puter.auth.signOut();
    },

    async getUser() {
        if (provider === 'supabase') {
            throw new Error('Supabase getUser not implemented yet');
        }
        return await window.puter.auth.getUser();
    }
};
