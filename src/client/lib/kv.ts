import { e2eeService } from './e2ee';
import { apiFetch } from './apiFetch';



export const kv = {
    async get(key: string) {
        const token = localStorage.getItem('supabase_token');
        const res = await apiFetch(`/api/kv/${key}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error('Failed to fetch KV');
        const data = await res.json();

        if (data.value === null) return null;

        // Decrypt if E2EE is enabled
        if (data.value && typeof data.value === 'object' && data.value.version && data.value.iv && data.value.ciphertext) {
            if (!e2eeService.isEnabled()) {
                console.warn(`Encrypted data found for key "${key}" but E2EE is not enabled.`);
                return null;
            }
            return await e2eeService.decrypt(data.value);
        }
        return data.value;
    },

    async set(key: string, value: any) {
        let storedValue: any = value;
        if (e2eeService.isEnabled()) {
            storedValue = await e2eeService.encrypt(value);
        }

        const token = localStorage.getItem('supabase_token');
        const userStr = localStorage.getItem('supabase_user');
        const user = userStr ? JSON.parse(userStr) : null;

        const res = await apiFetch('/api/kv', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ key, value: storedValue, user_id: user?.id })
        });
        if (!res.ok) throw new Error('Failed to save KV');
        return;
    },

    async delete(key: string) {
        const token = localStorage.getItem('supabase_token');
        const res = await apiFetch(`/api/kv/${key}`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error('Failed to delete KV');
        return;
    }
};
