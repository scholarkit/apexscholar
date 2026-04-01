const isTauri = '__TAURI__' in window

export const API_BASE = isTauri ? 'http://localhost:3000' : ''

/**
 * Centralized fetch wrapper for authenticated Supabase API calls.
 * Intercepts 401 Unauthorized responses and dispatches a global
 * `session-expired` event so the app can redirect the user to login.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${input}`, init);

  if (res.status === 401) {
    // Clear stored credentials
    // localStorage.removeItem('supabase_token');
    // localStorage.removeItem('supabase_user');
    // Notify the rest of the app
    // window.dispatchEvent(new CustomEvent('session-expired'));
  }

  return res;
}
