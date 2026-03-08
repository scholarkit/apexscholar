/**
 * Puter.js Service Layer with E2EE Support
 * This module abstracts interactions with Puter.js (Auth, KV, FS).
 * All KV operations are automatically encrypted when E2EE is enabled.
 */

import { e2eeService, EncryptedPayload } from './e2ee';

// Define the global Puter object type since it's loaded via script tag
declare global {
  interface Window {
    puter: any;
  }
}

const puter = window.puter;

export interface PuterUser {
  username: string;
  uuid: string;
}

export interface Entry {
  id: string;
  projectId?: string;
  date: string;
  content: string;
  entry_type: string;
  startDate?: string;
  endDate?: string;
}

export interface Resource {
  id: string;
  projectId?: string;
  name: string;
  type: string;
  path: string;
  date_added: string;
}

export interface Insight {
  id: string;
  projectId?: string;
  content: string;
  created_at: string;
}

/**
 * Initialize E2EE system (call on app startup)
 */
export async function initE2EE(): Promise<boolean> {
  return await e2eeService.initialize();
}

/**
 * Enable E2EE with user passphrase
 */
export async function enableE2EE(passphrase: string): Promise<boolean> {
  return await e2eeService.enable(passphrase);
}

/**
 * Unlock E2EE with passphrase (required after page reload when enabled)
 */
export async function unlockE2EE(passphrase: string): Promise<boolean> {
  return await e2eeService.promptForPassphrase(passphrase);
}

/**
 * Disable E2EE (use with caution - data remains encrypted unless re-encrypted)
 */
export function disableE2EE(): void {
  e2eeService.disable();
}

/**
 * Check if E2EE is active and ready
 */
export function isE2EEEnabled(): boolean {
  return e2eeService.isEnabled();
}

/**
 * Get E2EE configuration status
 */
export function getE2EEConfig() {
  return e2eeService.getConfig();
}

/**
 * Change E2EE passphrase (caller must re-encrypt all stored data after)
 */
export async function changeE2EEPassphrase(oldPassphrase: string, newPassphrase: string): Promise<boolean> {
  return await e2eeService.changePassphrase(oldPassphrase, newPassphrase);
}

/**
 * Re-encrypt all existing KV data with current E2EE key.
 * Call after enabling E2EE to secure previously unencrypted data.
 * Returns counts of success/failure.
 */
export async function migrateDataToE2EE(): Promise<{success: number; failed: number; skipped: number}> {
  if (!isE2EEEnabled()) {
    throw new Error('E2EE must be enabled before migrating data');
  }

  // List of all known KV keys used by the application
  const KNOWN_KEYS = [
    'research_projects',
    'research_entries',
    'research_resources',
    'research_insights',
    'research_knowledgebase',
    'research_kanban',
    // Add more keys as discovered
  ];

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const key of KNOWN_KEYS) {
    try {
      // Read raw value directly from Puter (bypassing decryption layer)
      const rawValue = await puter.kv.get(key);
      if (rawValue === null) {
        skipped++;
        continue;
      }

      // Check if already encrypted
      try {
        const parsed = JSON.parse(rawValue);
        if (e2eeService.isEncryptedFormat(parsed)) {
          // Already encrypted, skip
          skipped++;
          continue;
        }
        // Plain JSON - will be re-encrypted below
        const value = parsed;
        await puterService.kvSet(key, value);
        success++;
      } catch {
        // Non-JSON value (unlikely), skip
        skipped++;
      }
    } catch (err) {
      console.error(`Failed to migrate key ${key}:`, err);
      failed++;
    }
  }

  return { success, failed, skipped };
}

/**
 * List all KV keys in storage (for debugging/migration)
 */
export async function listAllKeys(): Promise<string[]> {
  // Puter.js doesn't expose key listing directly in the SDK we have
  // So we return known keys only for now
  return [
    'research_projects',
    'research_entries',
    'research_resources',
    'research_insights',
    'research_knowledgebase',
    'research_kanban',
  ];
}

export const puterService = {
  // ... (rest unchanged)
  /**
   * Authentication
   */
  async isSignedIn(): Promise<boolean> {
    return await puter.auth.isSignedIn();
  },

  async signIn(): Promise<PuterUser | null> {
    try {
      return await puter.auth.signIn();
    } catch (error) {
      console.error('Puter Sign-In Error:', error);
      return null;
    }
  },

  async signOut(): Promise<void> {
    await puter.auth.signOut();
  },

  async getUser(): Promise<PuterUser | null> {
    if (await this.isSignedIn()) {
      return await puter.auth.getUser();
    }
    return null;
  },

  async getMonthlyUsage(): Promise<any> {
    if (await this.isSignedIn() && puter.auth.getMonthlyUsage) {
      return await puter.auth.getMonthlyUsage();
    }
    return null;
  },

  async getDetailedAppUsage(appId: string): Promise<any> {
    if (await this.isSignedIn() && puter.auth.getDetailedAppUsage) {
      return await puter.auth.getDetailedAppUsage(appId);
    }
    return null;
  },

  /**
   * KV Storage
   * Automatically encrypts/decrypts when E2EE is enabled
   */
  async kvGet(key: string): Promise<any> {
    const rawValue = await puter.kv.get(key);
    if (rawValue === null) return null;

    // Try to parse as JSON (all our stored values are JSON strings)
    let parsedValue: any;
    try {
      parsedValue = JSON.parse(rawValue);
    } catch {
      // If not JSON, return as-is (legacy or plain strings)
      return rawValue;
    }

    // Check if this is an encrypted payload
    if (e2eeService.isEncryptedFormat(parsedValue)) {
      if (!e2eeService.isEnabled()) {
        // Data is encrypted but E2EE is not enabled/ unlocked
        // This could happen if user disabled E2EE but data remains encrypted
        console.warn(`Encrypted data found for key "${key}" but E2EE is not enabled.`);
        return null; // or throw?
      }
      try {
        const encrypted = e2eeService.parse(parsedValue);
        return await e2eeService.decrypt(encrypted);
      } catch (error) {
        console.error(`E2EE decryption failed for key ${key}:`, error);
        throw error;
      }
    }

    // Not encrypted (plain JSON)
    return parsedValue;
  },

  async kvSet(key: string, value: any): Promise<void> {
    let storedValue: string;

    if (e2eeService.isEnabled()) {
      // Encrypt the value before storing
      const encrypted = await e2eeService.encrypt(value);
      storedValue = e2eeService.serialize(encrypted);
    } else {
      // Store as plain JSON
      storedValue = JSON.stringify(value);
    }

    await puter.kv.set(key, storedValue);
  },

  async kvDelete(key: string): Promise<void> {
    await puter.kv.del(key);
  },

  /**
   * File System
   */
  async fsWrite(path: string, content: any): Promise<void> {
    await puter.fs.write(path, content, { createMissingParents: true });
  },

  async fsRead(path: string): Promise<any> {
    return await puter.fs.read(path);
  },

  async fsDelete(path: string): Promise<void> {
    await puter.fs.delete(path);
  },

  async fsList(path: string): Promise<any[]> {
    return await puter.fs.list(path);
  },

  async fsGetURL(path: string): Promise<string> {
    return await puter.fs.getReadURL(path);
  }
};
