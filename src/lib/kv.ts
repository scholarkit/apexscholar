import { e2eeService } from './e2ee';

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
            throw new Error('Supabase kv.get not implemented yet');
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
        if (provider === 'supabase') {
            throw new Error('Supabase kv.set not implemented yet');
        }

        let storedValue: string;
        if (e2eeService.isEnabled()) {
            const encrypted = await e2eeService.encrypt(value);
            storedValue = e2eeService.serialize(encrypted);
        } else {
            storedValue = JSON.stringify(value);
        }

        return await puter.kv.set(key, storedValue);
    },

    async delete(key: string) {
        if (provider === 'supabase') {
            throw new Error('Supabase kv.delete not implemented yet');
        }
        return await puter.kv.del(key);
    }
};
