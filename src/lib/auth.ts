const provider = import.meta.env.VITE_PROVIDER || 'puter';

export const auth = {
    async signUp(email?: string, password?: string, username?: string) {
        if (provider === 'supabase') {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, display_name: username })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Signup failed');
            if (data.session) {
                localStorage.setItem('supabase_token', data.session.access_token);
                localStorage.setItem('supabase_user', JSON.stringify(data.user));
            }
            return data.user;
        }
        throw new Error('signUp only exists for Supabase provider');
    },

    async signInWithPassword(email?: string, password?: string) {
  if (provider === 'supabase') {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) throw new Error(data.error || 'Login failed');

    if (data.session) {
      localStorage.setItem('supabase_token', data.session.access_token);
      localStorage.setItem('supabase_user', JSON.stringify(data.user));
    }

    return data.user;
  }

  throw new Error('signInWithPassword only exists for Supabase provider');
},

    async signIn() {
        if (provider === 'supabase') {
            // Unused directly; Login.tsx uses signInWithPassword now.
            throw new Error('Use signInWithPassword for Supabase');
        }
        return await window.puter.auth.signIn();
    },

    async isSignedIn() {
        if (provider === 'supabase') {
            const token = localStorage.getItem('supabase_token');
            if (!token) return false;
            
            try {
                // Verify the token is actually still valid with the backend
                const res = await fetch('/api/auth/user', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) {
                    // Token is invalid or expired, clean up
                    localStorage.removeItem('supabase_token');
                    localStorage.removeItem('supabase_user');
                    return false;
                }
                const data = await res.json();
                if (data.user) {
                    localStorage.setItem('supabase_user', JSON.stringify(data.user));
                    return true;
                }
                return false;
            } catch (err) {
                console.error("Error verifying supabase session:", err);
                return false;
            }
        }
        return await window.puter.auth.isSignedIn();
    },

    async signOut() {
        if (provider === 'supabase') {
            const token = localStorage.getItem('supabase_token');
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            localStorage.removeItem('supabase_token');
            localStorage.removeItem('supabase_user');
            return;
        }
        return await window.puter.auth.signOut();
    },

    async getUser() {
        if (provider === 'supabase') {
            const userStr = localStorage.getItem('supabase_user');
            if (!userStr) return null;
            const parsed = JSON.parse(userStr);
            return {
                username: parsed.user_metadata?.display_name || parsed.email?.split('@')[0] || 'User',
                uuid: parsed.id
            };
        }
        return await window.puter.auth.getUser();
    }
};
