const isTauri = '__TAURI__' in window

export const API_BASE = isTauri ? 'http://localhost:3000' : ''

const TOKEN_KEY = 'supabase_token';
const REFRESH_KEY = 'supabase_refresh_token';

/**
 * Attempt to exchange the stored refresh_token for a new access_token.
 * Returns true on success, false if the refresh fails.
 */
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.session?.access_token && data.session?.refresh_token) {
      localStorage.setItem(TOKEN_KEY, data.session.access_token);
      localStorage.setItem(REFRESH_KEY, data.session.refresh_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Inject the current access token into the request headers.
 */
function injectAuth(init?: RequestInit): RequestInit {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return init || {};

  const headers = new Headers(init?.headers);
  // Only set Authorization if the caller hasn't already provided one,
  // or update it with the latest token.
  headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

/**
 * Centralized fetch wrapper for authenticated Supabase API calls.
 * Automatically injects the stored access token and retries once
 * with a refreshed token when the server responds with 401.
 * Dispatches a `session-expired` event if refresh also fails.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${input}`, injectAuth(init));

  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry the original request with the new token
      return fetch(`${API_BASE}${input}`, injectAuth(init));
    }

    // Refresh failed — session is truly expired
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem('supabase_user');
    window.dispatchEvent(new CustomEvent('session-expired'));
  }

  return res;
}
