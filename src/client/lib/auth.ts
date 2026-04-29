export interface User {
  username: string;
  uuid: string;
  email?: string;
}

// Keys used for localStorage
const TOKEN_KEY = 'supabase_token';
const REFRESH_KEY = 'supabase_refresh_token';
const USER_KEY = 'supabase_user';

export const auth = {
  /** Persist full session (access + refresh tokens) to localStorage */
  _saveSession(session: { access_token: string; refresh_token: string }, user?: unknown) {
    localStorage.setItem(TOKEN_KEY, session.access_token);
    localStorage.setItem(REFRESH_KEY, session.refresh_token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  /** Wipe all stored auth data */
  _clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Silently exchange the stored refresh_token for a new access_token +
   * refresh_token pair. Returns true on success, false if the refresh fails
   * (meaning the user must log in again).
   */
  async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        this._clearSession();
        return false;
      }

      const data = await res.json();
      if (data.session?.access_token && data.session?.refresh_token) {
        this._saveSession(data.session);
        return true;
      }

      this._clearSession();
      return false;
    } catch (err) {
      console.error('Token refresh failed:', err);
      return false;
    }
  },

  /**
   * fetch() wrapper that automatically retries once with a refreshed token
   * when the server responds with 401. Use this for all authenticated API
   * calls instead of raw fetch().
   */
  async authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      // Try to refresh and retry once
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const newToken = localStorage.getItem(TOKEN_KEY);
        if (newToken) headers.set('Authorization', `Bearer ${newToken}`);
        return fetch(url, { ...options, headers });
      }
    }

    return res;
  },

  async signUp(email?: string, password?: string, username?: string): Promise<User> {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: username }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    if (data.session) {
      this._saveSession(data.session, data.user);
    }
    return data.user;
  },

  async signInWithPassword(email?: string, password?: string): Promise<User> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) throw new Error(data.error || 'Login failed');

    if (data.session) {
      this._saveSession(data.session, data.user);
    }

    return data.user;
  },

  /**
   * Checks whether the user is currently signed in.
   * First validates the stored access token; if that returns 401, attempts a
   * silent refresh before giving up.
   */
  async isSignedIn(): Promise<boolean> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;

    try {
      const res = await fetch('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          return true;
        }
        return false;
      }

      if (res.status === 401) {
        // Access token expired – try to refresh silently
        const refreshed = await this.refreshToken();
        if (!refreshed) return false;

        // Validate the new token
        const newToken = localStorage.getItem(TOKEN_KEY);
        const retryRes = await fetch('/api/auth/user', {
          headers: { Authorization: `Bearer ${newToken}` },
        });
        if (!retryRes.ok) {
          this._clearSession();
          return false;
        }
        const retryData = await retryRes.json();
        if (retryData.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(retryData.user));
          return true;
        }
      }

      this._clearSession();
      return false;
    } catch (err) {
      console.error('Error verifying supabase session:', err);
      return false;
    }
  },

  async signOut(): Promise<void> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    this._clearSession();
  },

  async getUser(): Promise<User | null> {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    const parsed = JSON.parse(userStr);
    return {
      username: parsed.user_metadata?.display_name || parsed.email?.split('@')[0] || 'User',
      uuid: parsed.id,
      email: parsed.email || undefined,
    };
  },
};
