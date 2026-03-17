import { useCallback } from 'react';
import { supermemory } from '../lib/supermemory';

/**
 * React hook that exposes `trackEvent` — normalises any user decision
 * into a structured memory string and sends it to Supermemory.
 *
 * Usage:
 *   const { trackEvent } = useMemory();
 *   trackEvent('explore', 'search', { query: 'quantum computing' });
 */
export function useMemory() {
    const trackEvent = useCallback(
        (module: string, action: string, payload: Record<string, any> = {}) => {
            // Build a human-readable memory string
            const pairs = Object.entries(payload)
                .filter(([, v]) => v !== undefined && v !== null && v !== '')
                .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
                .join(', ');

            const memory = pairs
                ? `[${module}] ${action}: ${pairs}`
                : `[${module}] ${action}`;

            // Fire-and-forget — supermemory.addMemory already swallows errors
            supermemory.addMemory(memory, { module, action });
        },
        [],
    );

    return { trackEvent };
}
