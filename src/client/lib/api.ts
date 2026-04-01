const isTauri = '__TAURI__' in window

export const API_BASE = isTauri ? 'http://localhost:3000' : ''

export const apiFetch = (path: string, init?: RequestInit) =>
  fetch(`${API_BASE}${path}`, init)