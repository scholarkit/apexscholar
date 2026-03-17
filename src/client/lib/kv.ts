import { e2eeService } from './e2ee';
import { apiFetch } from './apiFetch';

const provider = import.meta.env.VITE_PROVIDER || 'puter';

// Define the global Puter object type since it's loaded via script tag
declare global {
    interface Window {
        puter: any;
    }
}

const puter = window.puter;

export const kv = {
    async get(key: string) {
        if (provider === 'supabase') {
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
        }

        const rawValue = await puter.kv.get(key);
        if (rawValue === null) return null;

        let parsedValue: any;
        try {
            parsedValue = JSON.parse(rawValue);
        } catch {
            return rawValue; // Not JSON, return plain string
        }

        // Check if this is an encrypted payload
        if (parsedValue && typeof parsedValue === 'object' && parsedValue.version && parsedValue.iv && parsedValue.ciphertext) {
            if (!e2eeService.isEnabled()) {
                console.warn(`Encrypted data found for key "${key}" but E2EE is not enabled.`);
                return null;
            }
            try {
                return await e2eeService.decrypt(parsedValue);
            } catch (error) {
                console.error(`E2EE decryption failed for key ${key}:`, error);
                throw error;
            }
        }

        // Not encrypted, just plain JSON
        return parsedValue;
    },

    async set(key: string, value: any) {
        let storedValue: any = value;
        if (e2eeService.isEnabled()) {
            const encrypted = await e2eeService.encrypt(value);
            // Puter KV stores strings, our Supabase API can store JSON
            storedValue = provider === 'supabase' ? encrypted : e2eeService.serialize(encrypted);
        } else if (provider !== 'supabase') {
            storedValue = JSON.stringify(value);
        }

        if (provider === 'supabase') {
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
        }

        return await puter.kv.set(key, storedValue);
    },

    async delete(key: string) {
        if (provider === 'supabase') {
            const token = localStorage.getItem('supabase_token');
            const res = await apiFetch(`/api/kv/${key}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('Failed to delete KV');
            return;
        }
        return await puter.kv.del(key);
    }
};
